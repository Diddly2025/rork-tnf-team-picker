import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Player, Restriction, TeamOption, MatchResult, SubsPayment, SubsSettings, Expense, SubsPriceHistory } from '@/types';
import { generateTeamOptions } from '@/utils/teamGenerator';
import { useGroup } from '@/context/GroupContext';
import { getSportConfig, SportConfig } from '@/constants/sports';
import {
  syncPlayersToSupabase,
  syncRestrictionsToSupabase,
  syncMatchResultsToSupabase,
  syncSubsPaymentsToSupabase,
  syncSubsSettingsToSupabase,
  syncExpensesToSupabase,
  upsertExpenseToSupabase,
  deleteExpenseFromSupabase,
  syncSubsPriceHistoryToSupabase,
  fetchPlayersFromSupabase,
  fetchRestrictionsFromSupabase,
  fetchMatchResultsFromSupabase,
  fetchSubsPaymentsFromSupabase,
  fetchSubsSettingsFromSupabase,
  fetchExpensesFromSupabase,
  fetchSubsPriceHistoryFromSupabase,
  getCloudSyncEnabled,
  setCloudSyncEnabled as saveCloudSyncPref,
} from '@/utils/supabaseSync';
import { isSupabaseConfigured } from '@/utils/supabase';
import { setLastSyncedAt } from '@/utils/lastSync';

function sk(groupId: string | null, suffix: string): string {
  return `pd_${groupId ?? 'none'}_${suffix}`;
}

function normaliseDateForCompare(dateStr: string): string {
  const months: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };
  const parts = dateStr.trim().split(/[\s,/-]+/);
  if (parts.length >= 3) {
    const day = parts[0].padStart(2, '0');
    const monthKey = parts[1].toLowerCase().substring(0, 3);
    const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
    const month = months[monthKey] ?? '01';
    return `${year}-${month}-${day}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.substring(0, 10);
  return dateStr;
}

export const [TNFProvider, useTNF] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { activeGroup, activeGroupId } = useGroup();

  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [generatedTeams, setGeneratedTeams] = useState<TeamOption[]>([]);
  const [manualTeamA, setManualTeamA] = useState<Player[]>([]);
  const [manualTeamB, setManualTeamB] = useState<Player[]>([]);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAtState] = useState<number | null>(null);
  const initialSyncDone = useRef(false);
  const cloudSyncRef = useRef(false);

  const sportConfig: SportConfig = useMemo(() => {
    return getSportConfig(activeGroup?.sport ?? 'football');
  }, [activeGroup?.sport]);

  const maxPlayersPerSide = activeGroup?.playersPerTeam ?? 7;
  const maxTotalPlayers = maxPlayersPerSide * 2;

  useEffect(() => {
    setSelectedPlayerIds([]);
    setGeneratedTeams([]);
    setManualTeamA([]);
    setManualTeamB([]);
    initialSyncDone.current = false;
  }, [activeGroupId]);

  useEffect(() => {
    getCloudSyncEnabled().then(enabled => {
      console.log('[CloudSync] Preference loaded:', enabled);
      setCloudSyncEnabled(enabled);
      cloudSyncRef.current = enabled;
    }).catch(() => {});
  }, []);

  const toggleCloudSync = useCallback(async (enabled: boolean) => {
    setCloudSyncEnabled(enabled);
    cloudSyncRef.current = enabled;
    await saveCloudSyncPref(enabled);
    console.log('[CloudSync] Toggled to:', enabled);
  }, []);

  const shouldSync = useCallback(() => {
    return cloudSyncRef.current && isSupabaseConfigured();
  }, []);

  const markSynced = useCallback(async () => {
    const now = Date.now();
    setLastSyncedAtState(now);
    await setLastSyncedAt(activeGroupId, now);
    queryClient.setQueryData(['lastSync', activeGroupId ?? 'none'], now);
  }, [activeGroupId, queryClient]);

  const gid = activeGroupId;
  const hasGroup = !!gid;

  const playersQuery = useQuery({
    queryKey: ['players', gid],
    queryFn: async () => {
      if (!gid) return [];
      const stored = await AsyncStorage.getItem(sk(gid, 'players'));
      const localData = stored ? (JSON.parse(stored) as Player[]) : [];

      if (!initialSyncDone.current && localData.length === 0 && cloudSyncRef.current && isSupabaseConfigured()) {
        try {
          console.log('[Hybrid] Local players empty, trying Supabase...');
          const remote = await fetchPlayersFromSupabase();
          if (remote && remote.length > 0) {
            console.log('[Hybrid] Restored players from Supabase:', remote.length);
            await AsyncStorage.setItem(sk(gid, 'players'), JSON.stringify(remote));
            return remote;
          }
        } catch (e) {
          console.log('[Hybrid] Supabase fetch failed, using local:', e);
        }
      }
      return localData;
    },
    enabled: hasGroup,
  });

  const restrictionsQuery = useQuery({
    queryKey: ['restrictions', gid],
    queryFn: async () => {
      if (!gid) return [];
      const stored = await AsyncStorage.getItem(sk(gid, 'restrictions'));
      const localData = stored ? (JSON.parse(stored) as Restriction[]) : [];

      if (!initialSyncDone.current && localData.length === 0 && cloudSyncRef.current && isSupabaseConfigured()) {
        try {
          const remote = await fetchRestrictionsFromSupabase();
          if (remote && remote.length > 0) {
            await AsyncStorage.setItem(sk(gid, 'restrictions'), JSON.stringify(remote));
            return remote;
          }
        } catch (e) {
          console.log('[Hybrid] Supabase fetch failed, using local:', e);
        }
      }
      return localData;
    },
    enabled: hasGroup,
  });

  const matchHistoryQuery = useQuery({
    queryKey: ['matchHistory', gid],
    queryFn: async () => {
      if (!gid) return [];
      const stored = await AsyncStorage.getItem(sk(gid, 'match_history'));
      const localData = stored ? (JSON.parse(stored) as MatchResult[]) : [];

      if (!initialSyncDone.current && localData.length === 0 && cloudSyncRef.current && isSupabaseConfigured()) {
        try {
          const remote = await fetchMatchResultsFromSupabase();
          if (remote && remote.length > 0) {
            await AsyncStorage.setItem(sk(gid, 'match_history'), JSON.stringify(remote));
            return remote;
          }
        } catch (e) {
          console.log('[Hybrid] Supabase fetch failed, using local:', e);
        }
      }
      return localData;
    },
    enabled: hasGroup,
  });

  const subsPaymentsQuery = useQuery({
    queryKey: ['subsPayments', gid],
    queryFn: async () => {
      if (!gid) return [];
      const stored = await AsyncStorage.getItem(sk(gid, 'subs_payments'));
      const localData = stored ? (JSON.parse(stored) as SubsPayment[]) : [];

      if (!initialSyncDone.current && localData.length === 0 && cloudSyncRef.current && isSupabaseConfigured()) {
        try {
          const remote = await fetchSubsPaymentsFromSupabase();
          if (remote && remote.length > 0) {
            await AsyncStorage.setItem(sk(gid, 'subs_payments'), JSON.stringify(remote));
            return remote;
          }
        } catch (e) {
          console.log('[Hybrid] Supabase fetch failed, using local:', e);
        }
      }
      return localData;
    },
    enabled: hasGroup,
  });

  const expensesQuery = useQuery({
    queryKey: ['expenses', gid],
    queryFn: async () => {
      if (!gid) return [];
      const stored = await AsyncStorage.getItem(sk(gid, 'expenses'));
      const localData = stored ? (JSON.parse(stored) as Expense[]) : [];

      if (!initialSyncDone.current && localData.length === 0 && cloudSyncRef.current && isSupabaseConfigured()) {
        try {
          console.log('[Hybrid] Local expenses empty, trying Supabase...');
          const remote = await fetchExpensesFromSupabase();
          if (remote && remote.length > 0) {
            console.log('[Hybrid] Restored expenses from Supabase:', remote.length);
            await AsyncStorage.setItem(sk(gid, 'expenses'), JSON.stringify(remote));
            return remote;
          }
        } catch (e) {
          console.log('[Hybrid] Supabase fetch failed, using local:', e);
        }
      }
      return localData;
    },
    enabled: hasGroup,
  });

  const subsSettingsQuery = useQuery({
    queryKey: ['subsSettings', gid],
    queryFn: async () => {
      if (!gid) return { costPerGame: 5, lateFee: 1, gameCost: 58 };
      const stored = await AsyncStorage.getItem(sk(gid, 'subs_settings'));
      const localData = stored ? (JSON.parse(stored) as SubsSettings) : null;

      if (!initialSyncDone.current && !localData && cloudSyncRef.current && isSupabaseConfigured()) {
        try {
          const remote = await fetchSubsSettingsFromSupabase();
          if (remote) {
            await AsyncStorage.setItem(sk(gid, 'subs_settings'), JSON.stringify(remote));
            return remote;
          }
        } catch (e) {
          console.log('[Hybrid] Supabase fetch failed, using local:', e);
        }
      }
      return localData ?? { costPerGame: 5, lateFee: 1, gameCost: 58 };
    },
    enabled: hasGroup,
  });

  const priceHistoryQuery = useQuery({
    queryKey: ['priceHistory', gid],
    queryFn: async () => {
      if (!gid) return [];
      const stored = await AsyncStorage.getItem(sk(gid, 'price_history'));
      const localData = stored ? (JSON.parse(stored) as SubsPriceHistory[]) : [];

      if (!initialSyncDone.current && localData.length === 0 && cloudSyncRef.current && isSupabaseConfigured()) {
        try {
          console.log('[Hybrid] Local price history empty, trying Supabase...');
          const remote = await fetchSubsPriceHistoryFromSupabase();
          if (remote && remote.length > 0) {
            console.log('[Hybrid] Restored price history from Supabase:', remote.length);
            await AsyncStorage.setItem(sk(gid, 'price_history'), JSON.stringify(remote));
            return remote;
          }
        } catch (e) {
          console.log('[Hybrid] Supabase fetch failed, using local:', e);
        }
      }
      return localData;
    },
    enabled: hasGroup,
  });

  useEffect(() => {
    if (
      !playersQuery.isLoading &&
      !restrictionsQuery.isLoading &&
      !matchHistoryQuery.isLoading &&
      !subsPaymentsQuery.isLoading &&
      !subsSettingsQuery.isLoading &&
      !priceHistoryQuery.isLoading
    ) {
      initialSyncDone.current = true;
    }
  }, [
    playersQuery.isLoading,
    restrictionsQuery.isLoading,
    matchHistoryQuery.isLoading,
    subsPaymentsQuery.isLoading,
    subsSettingsQuery.isLoading,
    priceHistoryQuery.isLoading,
  ]);

  const { mutate: savePlayers } = useMutation({
    mutationFn: async (players: Player[]) => {
      if (!gid) return players;
      await AsyncStorage.setItem(sk(gid, 'players'), JSON.stringify(players));
      if (shouldSync()) {
        void syncPlayersToSupabase(players).then(() => markSynced()).catch(e => console.log('[Sync] Players bg sync error:', e));
      }
      return players;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['players', gid] });
    },
  });

  const { mutate: saveRestrictions } = useMutation({
    mutationFn: async (restrictions: Restriction[]) => {
      if (!gid) return restrictions;
      await AsyncStorage.setItem(sk(gid, 'restrictions'), JSON.stringify(restrictions));
      if (shouldSync()) {
        void syncRestrictionsToSupabase(restrictions).then(() => markSynced()).catch(e => console.log('[Sync] Restrictions bg sync error:', e));
      }
      return restrictions;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['restrictions', gid] });
    },
  });

  const { mutate: saveMatchHistory } = useMutation({
    mutationFn: async (history: MatchResult[]) => {
      if (!gid) return history;
      await AsyncStorage.setItem(sk(gid, 'match_history'), JSON.stringify(history));
      if (shouldSync()) {
        void syncMatchResultsToSupabase(history).then(() => markSynced()).catch(e => console.log('[Sync] Match history bg sync error:', e));
      }
      return history;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['matchHistory', gid] });
    },
  });

  const { mutate: saveSubsPayments } = useMutation({
    mutationFn: async (payments: SubsPayment[]) => {
      if (!gid) return payments;
      await AsyncStorage.setItem(sk(gid, 'subs_payments'), JSON.stringify(payments));
      if (shouldSync()) {
        void syncSubsPaymentsToSupabase(payments).then(() => markSynced()).catch(e => console.log('[Sync] Subs bg sync error:', e));
      }
      return payments;
    },
    onMutate: async (payments) => {
      await queryClient.cancelQueries({ queryKey: ['subsPayments', gid] });
      queryClient.setQueryData(['subsPayments', gid], payments);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['subsPayments', gid], data);
    },
  });

  const { mutate: saveExpenses } = useMutation({
    mutationFn: async (expenses: Expense[]) => {
      if (!gid) return expenses;
      await AsyncStorage.setItem(sk(gid, 'expenses'), JSON.stringify(expenses));
      if (shouldSync()) {
        void syncExpensesToSupabase(expenses).then(() => markSynced()).catch(e => console.log('[Sync] Expenses bg sync error:', e));
      }
      return expenses;
    },
    onMutate: async (expenses) => {
      await queryClient.cancelQueries({ queryKey: ['expenses', gid] });
      queryClient.setQueryData(['expenses', gid], expenses);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['expenses', gid], data);
    },
  });

  const { mutate: saveSubsSettings } = useMutation({
    mutationFn: async (settings: SubsSettings) => {
      if (!gid) return settings;
      await AsyncStorage.setItem(sk(gid, 'subs_settings'), JSON.stringify(settings));
      if (shouldSync()) {
        void syncSubsSettingsToSupabase(settings).then(() => markSynced()).catch(e => console.log('[Sync] Settings bg sync error:', e));
      }
      return settings;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subsSettings', gid] });
    },
  });

  const { mutate: savePriceHistory } = useMutation({
    mutationFn: async (entries: SubsPriceHistory[]) => {
      if (!gid) return entries;
      await AsyncStorage.setItem(sk(gid, 'price_history'), JSON.stringify(entries));
      if (shouldSync()) {
        void syncSubsPriceHistoryToSupabase(entries).then(() => markSynced()).catch(e => console.log('[Sync] Price history bg sync error:', e));
      }
      return entries;
    },
    onMutate: async (entries) => {
      await queryClient.cancelQueries({ queryKey: ['priceHistory', gid] });
      queryClient.setQueryData(['priceHistory', gid], entries);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['priceHistory', gid], data);
    },
  });

  const players = useMemo(() => playersQuery.data ?? [], [playersQuery.data]);
  const restrictions = useMemo(() => restrictionsQuery.data ?? [], [restrictionsQuery.data]);
  const matchHistory = useMemo(() => matchHistoryQuery.data ?? [], [matchHistoryQuery.data]);
  const subsPayments = useMemo(() => subsPaymentsQuery.data ?? [], [subsPaymentsQuery.data]);
  const expenses = useMemo(() => expensesQuery.data ?? [], [expensesQuery.data]);
  const priceHistory = useMemo(() => priceHistoryQuery.data ?? [], [priceHistoryQuery.data]);
  const subsSettings = useMemo(() => {
    const defaults = { costPerGame: 5, lateFee: 1, gameCost: 58 };
    return { ...defaults, ...(subsSettingsQuery.data ?? {}) };
  }, [subsSettingsQuery.data]);

  const forceCloudSync = useCallback(async () => {
    if (!isSupabaseConfigured() || !cloudSyncRef.current) return;
    setSyncStatus('syncing');
    try {
      await Promise.all([
        syncPlayersToSupabase(players),
        syncRestrictionsToSupabase(restrictions),
        syncMatchResultsToSupabase(matchHistory),
        syncSubsPaymentsToSupabase(subsPayments),
        syncSubsSettingsToSupabase(subsSettings),
        syncExpensesToSupabase(expenses),
        syncSubsPriceHistoryToSupabase(priceHistory),
      ]);
      setSyncStatus('synced');
      await markSynced();
      console.log('[Sync] Full sync completed');
    } catch (e) {
      setSyncStatus('error');
      console.log('[Sync] Full sync failed:', e);
    }
  }, [players, restrictions, matchHistory, subsPayments, subsSettings, expenses, priceHistory, markSynced]);

  const forceCloudRestore = useCallback(async () => {
    if (!isSupabaseConfigured() || !cloudSyncRef.current || !gid) return;
    setSyncStatus('syncing');
    try {
      const [remotePlayers, remoteRestrictions, remoteMatches, remotePayments, remoteSettings, remoteExpenses, remotePriceHistory] = await Promise.all([
        fetchPlayersFromSupabase(),
        fetchRestrictionsFromSupabase(),
        fetchMatchResultsFromSupabase(),
        fetchSubsPaymentsFromSupabase(),
        fetchSubsSettingsFromSupabase(),
        fetchExpensesFromSupabase(),
        fetchSubsPriceHistoryFromSupabase(),
      ]);
      if (remotePlayers) {
        await AsyncStorage.setItem(sk(gid, 'players'), JSON.stringify(remotePlayers));
        queryClient.setQueryData(['players', gid], remotePlayers);
      }
      if (remoteRestrictions) {
        await AsyncStorage.setItem(sk(gid, 'restrictions'), JSON.stringify(remoteRestrictions));
        queryClient.setQueryData(['restrictions', gid], remoteRestrictions);
      }
      if (remoteMatches) {
        await AsyncStorage.setItem(sk(gid, 'match_history'), JSON.stringify(remoteMatches));
        queryClient.setQueryData(['matchHistory', gid], remoteMatches);
      }
      if (remotePayments) {
        await AsyncStorage.setItem(sk(gid, 'subs_payments'), JSON.stringify(remotePayments));
        queryClient.setQueryData(['subsPayments', gid], remotePayments);
      }
      if (remoteSettings) {
        await AsyncStorage.setItem(sk(gid, 'subs_settings'), JSON.stringify(remoteSettings));
        queryClient.setQueryData(['subsSettings', gid], remoteSettings);
      }
      if (remoteExpenses) {
        await AsyncStorage.setItem(sk(gid, 'expenses'), JSON.stringify(remoteExpenses));
        queryClient.setQueryData(['expenses', gid], remoteExpenses);
      }
      if (remotePriceHistory) {
        await AsyncStorage.setItem(sk(gid, 'price_history'), JSON.stringify(remotePriceHistory));
        queryClient.setQueryData(['priceHistory', gid], remotePriceHistory);
      }
      setSyncStatus('synced');
      await markSynced();
      console.log('[Restore] Data restored from Supabase');
    } catch (e) {
      setSyncStatus('error');
      console.log('[Restore] Restore failed:', e);
    }
  }, [gid, queryClient, markSynced]);

  const getPlayerAppearances = useCallback((playerId: string) => {
    return matchHistory.filter(m => m.playerIds.includes(playerId)).length;
  }, [matchHistory]);

  const getPlayerWins = useCallback((playerId: string) => {
    return matchHistory.filter(m => {
      const inTeamA = m.teamA.players.some(p => p.id === playerId);
      const inTeamB = m.teamB.players.some(p => p.id === playerId);
      if (inTeamA && m.scoreA > m.scoreB) return true;
      if (inTeamB && m.scoreB > m.scoreA) return true;
      return false;
    }).length;
  }, [matchHistory]);

  const getPlayerDraws = useCallback((playerId: string) => {
    return matchHistory.filter(m => {
      const isInMatch = m.playerIds.includes(playerId);
      return isInMatch && m.scoreA === m.scoreB;
    }).length;
  }, [matchHistory]);

  const getPlayerLosses = useCallback((playerId: string) => {
    return matchHistory.filter(m => {
      const inTeamA = m.teamA.players.some(p => p.id === playerId);
      const inTeamB = m.teamB.players.some(p => p.id === playerId);
      if (inTeamA && m.scoreA < m.scoreB) return true;
      if (inTeamB && m.scoreB < m.scoreA) return true;
      return false;
    }).length;
  }, [matchHistory]);

  const getPlayerMotmCount = useCallback((playerId: string) => {
    return matchHistory.filter(m => m.manOfMatchId === playerId).length;
  }, [matchHistory]);

  const getPlayerWinPercentage = useCallback((playerId: string) => {
    const apps = matchHistory.filter(m => m.playerIds.includes(playerId)).length;
    if (apps === 0) return 0;
    const wins = matchHistory.filter(m => {
      const inTeamA = m.teamA.players.some(p => p.id === playerId);
      const inTeamB = m.teamB.players.some(p => p.id === playerId);
      if (inTeamA && m.scoreA > m.scoreB) return true;
      if (inTeamB && m.scoreB > m.scoreA) return true;
      return false;
    }).length;
    return Math.round((wins / apps) * 100);
  }, [matchHistory]);

  const getVoidedMatchIds = useCallback((playerId: string) => {
    return subsPayments
      .filter(p => p.playerId === playerId && p.type === 'credit' && p.voidedMatchId)
      .map(p => p.voidedMatchId as string);
  }, [subsPayments]);

  const getPriceForDate = useCallback((dateStr: string): number => {
    if (priceHistory.length === 0) return subsSettings.costPerGame;
    const sorted = [...priceHistory].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
    let price = subsSettings.costPerGame;
    const normalised = normaliseDateForCompare(dateStr);
    for (const entry of sorted) {
      if (entry.effectiveFrom <= normalised) {
        price = entry.amount;
      } else {
        break;
      }
    }
    return price;
  }, [priceHistory, subsSettings.costPerGame]);

  const getPlayerBalance = useCallback((playerId: string) => {
    const credits = subsPayments
      .filter(p => p.playerId === playerId && p.type === 'credit' && !p.voidedMatchId)
      .reduce((sum, p) => sum + p.amount, 0);
    const voidedMatchIds = getVoidedMatchIds(playerId);
    const playerMatches = matchHistory.filter(m => m.playerIds.includes(playerId) && !voidedMatchIds.includes(m.id));
    const gameCosts = priceHistory.length > 0
      ? playerMatches.reduce((sum, m) => sum + getPriceForDate(m.date), 0)
      : playerMatches.length * subsSettings.costPerGame;
    const manualDebits = subsPayments
      .filter(p => p.playerId === playerId && p.type === 'debit' && !p.description.startsWith('Match '))
      .reduce((sum, p) => sum + p.amount, 0);
    return credits - gameCosts - manualDebits;
  }, [subsPayments, matchHistory, subsSettings.costPerGame, getVoidedMatchIds, priceHistory, getPriceForDate]);

  const getPlayerPayments = useCallback((playerId: string) => {
    const voidedMatchIds = getVoidedMatchIds(playerId);
    const manualPayments = subsPayments
      .filter(p => p.playerId === playerId && !(p.type === 'debit' && p.description.startsWith('Match ')) && !p.voidedMatchId);
    const matchDebits: SubsPayment[] = matchHistory
      .filter(m => m.playerIds.includes(playerId) && !voidedMatchIds.includes(m.id))
      .map(m => ({
        id: `synthetic-${m.id}-${playerId}`,
        playerId,
        amount: priceHistory.length > 0 ? getPriceForDate(m.date) : subsSettings.costPerGame,
        type: 'debit' as const,
        description: `Match ${m.date}`,
        date: m.date,
        createdAt: m.createdAt,
      }));
    return [...manualPayments, ...matchDebits].sort((a, b) => b.createdAt - a.createdAt);
  }, [subsPayments, matchHistory, subsSettings.costPerGame, getVoidedMatchIds, priceHistory, getPriceForDate]);

  const getTotalCollected = useCallback(() => {
    return subsPayments
      .filter(p => p.type === 'credit')
      .reduce((sum, p) => sum + p.amount, 0);
  }, [subsPayments]);

  const getPlayerTotalPaid = useCallback((playerId: string) => {
    return subsPayments
      .filter(p => p.playerId === playerId && p.type === 'credit')
      .reduce((sum, p) => sum + p.amount, 0);
  }, [subsPayments]);

  const getTotalExpenses = useCallback(() => {
    return expenses.filter(e => !e.adjustmentType).reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const getKittyBalance = useCallback(() => {
    const totalCredits = subsPayments
      .filter(p => p.type === 'credit')
      .reduce((sum, p) => sum + p.amount, 0);
    const totalGameCosts = matchHistory.length * subsSettings.gameCost;
    const totalRegularExp = expenses.filter(e => !e.adjustmentType).reduce((sum, e) => sum + e.amount, 0);
    const totalAdditions = expenses
      .filter(e => e.adjustmentType === 'addition' || e.adjustmentType === 'opening_balance')
      .reduce((sum, e) => sum + e.amount, 0);
    const totalDeductions = expenses
      .filter(e => e.adjustmentType === 'deduction')
      .reduce((sum, e) => sum + e.amount, 0);
    return totalCredits - totalGameCosts - totalRegularExp + totalAdditions - totalDeductions;
  }, [subsPayments, matchHistory, subsSettings.gameCost, expenses]);

  const getTotalOutstanding = useCallback(() => {
    return players.reduce((sum, p) => {
      const balance = getPlayerBalance(p.id);
      if (balance < 0) return sum + Math.abs(balance);
      return sum;
    }, 0);
  }, [players, getPlayerBalance]);

  const addSubsCredit = useCallback((playerId: string, amount: number, description: string, date: string) => {
    const newPayment: SubsPayment = {
      id: `subs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      playerId, amount, type: 'credit', description, date, createdAt: Date.now(),
    };
    saveSubsPayments([newPayment, ...subsPayments]);
  }, [subsPayments, saveSubsPayments]);

  const addSubsDebit = useCallback((playerId: string, amount: number, description: string, date: string) => {
    const newPayment: SubsPayment = {
      id: `subs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      playerId, amount, type: 'debit', description, date, createdAt: Date.now(),
    };
    saveSubsPayments([newPayment, ...subsPayments]);
  }, [subsPayments, saveSubsPayments]);

  const addGuestDebit = useCallback((sponsorPlayerId: string, guestName: string, amount: number, date: string) => {
    const newPayment: SubsPayment = {
      id: `subs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      playerId: sponsorPlayerId, amount, type: 'debit',
      description: `Guest: ${guestName}`, date, createdAt: Date.now(), guestName,
    };
    saveSubsPayments([newPayment, ...subsPayments]);
  }, [subsPayments, saveSubsPayments]);

  const deleteSubsPayment = useCallback((id: string) => {
    saveSubsPayments(subsPayments.filter(p => p.id !== id));
  }, [subsPayments, saveSubsPayments]);

  const voidMatchDebit = useCallback((matchId: string, playerId: string, matchDate: string) => {
    const voidPayment: SubsPayment = {
      id: `void-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      playerId, amount: subsSettings.costPerGame, type: 'credit',
      description: `Voided: Match ${matchDate}`,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      createdAt: Date.now(), voidedMatchId: matchId,
    };
    saveSubsPayments([voidPayment, ...subsPayments]);
  }, [subsPayments, subsSettings.costPerGame, saveSubsPayments]);

  const addPriceChange = useCallback((amount: number, effectiveFrom: string, note?: string) => {
    if (!gid) return;
    const newEntry: SubsPriceHistory = {
      id: `price-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      groupId: gid,
      amount,
      effectiveFrom,
      note,
      createdAt: Date.now(),
    };
    console.log('[PriceHistory] Adding new price:', { amount, effectiveFrom, note });
    savePriceHistory([...priceHistory, newEntry]);
  }, [gid, priceHistory, savePriceHistory]);

  const deletePriceChange = useCallback((id: string) => {
    savePriceHistory(priceHistory.filter(e => e.id !== id));
  }, [priceHistory, savePriceHistory]);

  const addExpense = useCallback((expense: Omit<Expense, 'id' | 'createdAt'>) => {
    const newExpense: Expense = {
      ...expense,
      id: `expense-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
    };
    saveExpenses([newExpense, ...expenses]);
    if (shouldSync() && gid) {
      console.log('[Sync] Immediately upserting new expense to Supabase:', newExpense.id);
      void upsertExpenseToSupabase(newExpense).then(() => markSynced()).catch(e => console.log('[Sync] Immediate expense upsert error:', e));
    }
  }, [expenses, saveExpenses, shouldSync, gid]);

  const deleteExpense = useCallback((id: string) => {
    saveExpenses(expenses.filter(e => e.id !== id));
    if (shouldSync()) {
      console.log('[Sync] Immediately deleting expense from Supabase:', id);
      void deleteExpenseFromSupabase(id).then(() => markSynced()).catch(e => console.log('[Sync] Immediate expense delete error:', e));
    }
  }, [expenses, saveExpenses, shouldSync]);

  const updateSubsSettings = useCallback((settings: SubsSettings) => {
    saveSubsSettings(settings);
  }, [saveSubsSettings]);

  const addPlayer = useCallback((player: Omit<Player, 'id' | 'createdAt'>) => {
    const newPlayer: Player = {
      ...player,
      id: `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
    };
    savePlayers([...players, newPlayer]);
  }, [players, savePlayers]);

  const bulkAddPlayers = useCallback((newPlayers: Omit<Player, 'id' | 'createdAt'>[]) => {
    const playersToAdd: Player[] = newPlayers.map((player, index) => ({
      ...player,
      id: `player-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now() + index,
    }));
    savePlayers([...players, ...playersToAdd]);
  }, [players, savePlayers]);

  const updatePlayer = useCallback((id: string, updates: Partial<Player>) => {
    savePlayers(players.map(p => p.id === id ? { ...p, ...updates } : p));
  }, [players, savePlayers]);

  const deletePlayer = useCallback((id: string) => {
    savePlayers(players.filter(p => p.id !== id));
    setSelectedPlayerIds(prev => prev.filter(pid => pid !== id));
    saveRestrictions(restrictions.filter(r => r.player1Id !== id && r.player2Id !== id));
  }, [players, restrictions, savePlayers, saveRestrictions]);

  const addRestriction = useCallback((player1Id: string, player2Id: string, type: 'apart' | 'together' = 'apart') => {
    const exists = restrictions.some(
      r => (r.player1Id === player1Id && r.player2Id === player2Id) ||
           (r.player1Id === player2Id && r.player2Id === player1Id)
    );
    if (exists) return;
    const newRestriction: Restriction = {
      id: `restriction-${Date.now()}`, player1Id, player2Id, type,
    };
    saveRestrictions([...restrictions, newRestriction]);
  }, [restrictions, saveRestrictions]);

  const removeRestriction = useCallback((id: string) => {
    saveRestrictions(restrictions.filter(r => r.id !== id));
  }, [restrictions, saveRestrictions]);

  const togglePlayerSelection = useCallback((playerId: string) => {
    setSelectedPlayerIds(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      }
      if (prev.length >= maxTotalPlayers) return prev;
      return [...prev, playerId];
    });
  }, [maxTotalPlayers]);

  const selectAllPlayers = useCallback(() => {
    setSelectedPlayerIds(players.slice(0, maxTotalPlayers).map(p => p.id));
  }, [players, maxTotalPlayers]);

  const clearSelection = useCallback(() => {
    setSelectedPlayerIds([]);
  }, []);

  const generateTeams = useCallback(() => {
    const selectedPlayers = players.filter(p => selectedPlayerIds.includes(p.id));
    const teams = generateTeamOptions(selectedPlayers, restrictions, 4);
    setGeneratedTeams(teams);
    return teams;
  }, [players, selectedPlayerIds, restrictions]);

  const clearGeneratedTeams = useCallback(() => {
    setGeneratedTeams([]);
  }, []);

  const selectedPlayers = useMemo(() =>
    players.filter(p => selectedPlayerIds.includes(p.id)),
    [players, selectedPlayerIds]
  );

  const getPlayerById = useCallback((id: string) =>
    players.find(p => p.id === id),
    [players]
  );

  const saveMatchResult = useCallback((result: Omit<MatchResult, 'id' | 'createdAt'>) => {
    const newResult: MatchResult = {
      ...result,
      id: `match-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
    };
    console.log('[SaveMatchResult] New result:', {
      id: newResult.id,
      date: newResult.date,
      scoreA: newResult.scoreA,
      scoreB: newResult.scoreB,
      manOfMatchId: newResult.manOfMatchId ?? 'none',
      playerIdsCount: newResult.playerIds.length,
      teamACount: newResult.teamA.players.length,
      teamBCount: newResult.teamB.players.length,
    });
    saveMatchHistory([newResult, ...matchHistory]);
  }, [matchHistory, saveMatchHistory]);

  const deleteMatchResult = useCallback((id: string) => {
    saveMatchHistory(matchHistory.filter(m => m.id !== id));
  }, [matchHistory, saveMatchHistory]);

  const updateMatchResult = useCallback((id: string, updates: Partial<Omit<MatchResult, 'id' | 'createdAt'>>) => {
    saveMatchHistory(matchHistory.map(m => m.id === id ? { ...m, ...updates } : m));
  }, [matchHistory, saveMatchHistory]);

  const assignPlayerToManualTeam = useCallback((player: Player, team: 'A' | 'B') => {
    if (team === 'A') {
      setManualTeamA(prev => {
        if (prev.some(p => p.id === player.id)) return prev;
        return [...prev, player];
      });
      setManualTeamB(prev => prev.filter(p => p.id !== player.id));
    } else {
      setManualTeamB(prev => {
        if (prev.some(p => p.id === player.id)) return prev;
        return [...prev, player];
      });
      setManualTeamA(prev => prev.filter(p => p.id !== player.id));
    }
  }, []);

  const removePlayerFromManualTeam = useCallback((playerId: string) => {
    setManualTeamA(prev => prev.filter(p => p.id !== playerId));
    setManualTeamB(prev => prev.filter(p => p.id !== playerId));
  }, []);

  const clearManualTeams = useCallback(() => {
    setManualTeamA([]);
    setManualTeamB([]);
  }, []);

  const buildManualTeamOption = useCallback((): TeamOption | null => {
    if (manualTeamA.length === 0 || manualTeamB.length === 0) return null;
    const totalA = manualTeamA.reduce((sum, p) => sum + p.rating, 0);
    const avgA = Math.round((totalA / manualTeamA.length) * 10) / 10;
    const totalB = manualTeamB.reduce((sum, p) => sum + p.rating, 0);
    const avgB = Math.round((totalB / manualTeamB.length) * 10) / 10;
    return {
      id: `manual-${Date.now()}`,
      teamA: { id: 'manual-a', players: manualTeamA, totalRating: totalA, averageRating: avgA },
      teamB: { id: 'manual-b', players: manualTeamB, totalRating: totalB, averageRating: avgB },
      ratingDifference: Math.abs(avgA - avgB),
    };
  }, [manualTeamA, manualTeamB]);

  const groupName = activeGroup?.name ?? 'PlayDay';

  const getExportData = useCallback(() => {
    const lines: string[] = [];
    lines.push(`=== ${groupName.toUpperCase()} PLAYER DATABASE ===`);
    lines.push('Player Name\tPosition\tRating\tAppearances\tWins\tDraws\tLosses\tWin%\tPOTM\tSubs Balance');
    players.forEach(p => {
      const apps = getPlayerAppearances(p.id);
      const wins = getPlayerWins(p.id);
      const draws = getPlayerDraws(p.id);
      const losses = getPlayerLosses(p.id);
      const winPct = apps > 0 ? Math.round((wins / apps) * 100) : 0;
      const motm = getPlayerMotmCount(p.id);
      const balance = getPlayerBalance(p.id);
      lines.push(`${p.name}\t${p.position}\t${p.rating}\t${apps}\t${wins}\t${draws}\t${losses}\t${winPct}%\t${motm}\t£${balance.toFixed(2)}`);
    });
    lines.push('');
    lines.push('=== MATCH HISTORY ===');
    matchHistory.forEach(m => {
      lines.push(`Date: ${m.date}`);
      lines.push(`Score: Team A ${m.scoreA} - ${m.scoreB} Team B`);
      lines.push(`Team A: ${m.teamA.players.map(p => p.name).join(', ')}`);
      lines.push(`Team B: ${m.teamB.players.map(p => p.name).join(', ')}`);
      if (m.manOfMatchId) {
        const potmPlayer = players.find(p => p.id === m.manOfMatchId);
        lines.push(`Player of the Match: ${potmPlayer?.name ?? 'Unknown'}`);
      }
      lines.push(`Manual Teams: ${m.isManualTeams ? 'Yes' : 'No'}`);
      lines.push('---');
    });
    return lines.join('\n');
  }, [groupName, players, matchHistory, getPlayerAppearances, getPlayerWins, getPlayerDraws, getPlayerLosses, getPlayerMotmCount, getPlayerBalance]);

  return useMemo(() => ({
    players,
    restrictions,
    selectedPlayerIds,
    selectedPlayers,
    generatedTeams,
    matchHistory,
    manualTeamA,
    manualTeamB,
    subsPayments,
    subsSettings,
    syncStatus,
    cloudSyncEnabled,
    toggleCloudSync,
    isLoading: playersQuery.isLoading || restrictionsQuery.isLoading || matchHistoryQuery.isLoading,
    addPlayer,
    bulkAddPlayers,
    updatePlayer,
    deletePlayer,
    addRestriction,
    removeRestriction,
    togglePlayerSelection,
    selectAllPlayers,
    clearSelection,
    generateTeams,
    clearGeneratedTeams,
    getPlayerById,
    getPlayerAppearances,
    getPlayerWins,
    getPlayerDraws,
    getPlayerLosses,
    getPlayerMotmCount,
    getPlayerWinPercentage,
    getPlayerBalance,
    getPlayerPayments,
    getTotalCollected,
    getTotalOutstanding,
    getKittyBalance,
    getPlayerTotalPaid,
    addSubsCredit,
    addSubsDebit,
    addGuestDebit,
    deleteSubsPayment,
    voidMatchDebit,
    updateSubsSettings,
    saveMatchResult,
    deleteMatchResult,
    updateMatchResult,
    assignPlayerToManualTeam,
    removePlayerFromManualTeam,
    clearManualTeams,
    buildManualTeamOption,
    getExportData,
    expenses,
    addExpense,
    deleteExpense,
    getTotalExpenses,
    priceHistory,
    addPriceChange,
    deletePriceChange,
    getPriceForDate,
    forceCloudSync,
    forceCloudRestore,
    sportConfig,
    maxPlayersPerSide,
    maxTotalPlayers,
    activeGroup,
  }), [
    players, restrictions, selectedPlayerIds, selectedPlayers, generatedTeams,
    matchHistory, manualTeamA, manualTeamB, subsPayments, subsSettings,
    syncStatus, cloudSyncEnabled, toggleCloudSync,
    playersQuery.isLoading, restrictionsQuery.isLoading, matchHistoryQuery.isLoading,
    addPlayer, bulkAddPlayers, updatePlayer, deletePlayer,
    addRestriction, removeRestriction, togglePlayerSelection, selectAllPlayers, clearSelection,
    generateTeams, clearGeneratedTeams, getPlayerById,
    getPlayerAppearances, getPlayerWins, getPlayerDraws, getPlayerLosses,
    getPlayerMotmCount, getPlayerWinPercentage, getPlayerBalance, getPlayerPayments,
    getTotalCollected, getTotalOutstanding, getKittyBalance, getPlayerTotalPaid,
    addSubsCredit, addSubsDebit, addGuestDebit, deleteSubsPayment, voidMatchDebit,
    updateSubsSettings, saveMatchResult, deleteMatchResult, updateMatchResult,
    assignPlayerToManualTeam, removePlayerFromManualTeam, clearManualTeams, buildManualTeamOption,
    getExportData, expenses, addExpense, deleteExpense, getTotalExpenses,
    priceHistory, addPriceChange, deletePriceChange, getPriceForDate,
    forceCloudSync, forceCloudRestore, sportConfig, maxPlayersPerSide, maxTotalPlayers, activeGroup,
  ]);
});
