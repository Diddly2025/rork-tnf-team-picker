import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useMemo } from 'react';
import { Player, Restriction, TeamOption, MatchResult, SubsPayment, SubsSettings } from '@/types';
import { generateTeamOptions } from '@/utils/teamGenerator';
import { isSupabaseConfigured } from '@/utils/supabase';
import {
  syncPlayersToSupabase,
  syncRestrictionsToSupabase,
  syncMatchResultsToSupabase,
  syncSubsPaymentsToSupabase,
  syncSubsSettingsToSupabase,
  fetchPlayersFromSupabase,
  fetchRestrictionsFromSupabase,
  fetchMatchResultsFromSupabase,
  fetchSubsPaymentsFromSupabase,
  fetchSubsSettingsFromSupabase,
} from '@/utils/supabaseSync';


const PLAYERS_KEY = 'tnf_players';
const RESTRICTIONS_KEY = 'tnf_restrictions';
const MATCH_HISTORY_KEY = 'tnf_match_history';
const SUBS_PAYMENTS_KEY = 'tnf_subs_payments';
const SUBS_SETTINGS_KEY = 'tnf_subs_settings';


export const [TNFProvider, useTNF] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [generatedTeams, setGeneratedTeams] = useState<TeamOption[]>([]);
  const [manualTeamA, setManualTeamA] = useState<Player[]>([]);
  const [manualTeamB, setManualTeamB] = useState<Player[]>([]);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');

  const playersQuery = useQuery({
    queryKey: ['players'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(PLAYERS_KEY);
      return stored ? (JSON.parse(stored) as Player[]) : [];
    },
  });

  const restrictionsQuery = useQuery({
    queryKey: ['restrictions'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(RESTRICTIONS_KEY);
      return stored ? (JSON.parse(stored) as Restriction[]) : [];
    },
  });

  const matchHistoryQuery = useQuery({
    queryKey: ['matchHistory'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(MATCH_HISTORY_KEY);
      return stored ? (JSON.parse(stored) as MatchResult[]) : [];
    },
  });

  const subsPaymentsQuery = useQuery({
    queryKey: ['subsPayments'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(SUBS_PAYMENTS_KEY);
      return stored ? (JSON.parse(stored) as SubsPayment[]) : [];
    },
  });

  const subsSettingsQuery = useQuery({
    queryKey: ['subsSettings'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(SUBS_SETTINGS_KEY);
      const localData = stored ? (JSON.parse(stored) as SubsSettings) : null;
      return localData ?? { costPerGame: 5, lateFee: 1, gameCost: 58 };
    },
  });

  const { mutate: savePlayers } = useMutation({
    mutationFn: async (players: Player[]) => {
      await AsyncStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
      return players;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
    },
  });

  const { mutate: saveRestrictions } = useMutation({
    mutationFn: async (restrictions: Restriction[]) => {
      await AsyncStorage.setItem(RESTRICTIONS_KEY, JSON.stringify(restrictions));
      return restrictions;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restrictions'] });
    },
  });

  const { mutate: saveMatchHistory } = useMutation({
    mutationFn: async (history: MatchResult[]) => {
      await AsyncStorage.setItem(MATCH_HISTORY_KEY, JSON.stringify(history));
      return history;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matchHistory'] });
    },
  });

  const { mutate: saveSubsPayments } = useMutation({
    mutationFn: async (payments: SubsPayment[]) => {
      await AsyncStorage.setItem(SUBS_PAYMENTS_KEY, JSON.stringify(payments));
      return payments;
    },
    onMutate: async (payments) => {
      await queryClient.cancelQueries({ queryKey: ['subsPayments'] });
      queryClient.setQueryData(['subsPayments'], payments);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['subsPayments'], data);
    },
  });

  const { mutate: saveSubsSettings } = useMutation({
    mutationFn: async (settings: SubsSettings) => {
      await AsyncStorage.setItem(SUBS_SETTINGS_KEY, JSON.stringify(settings));
      return settings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subsSettings'] });
    },
  });

  const players = useMemo(() => playersQuery.data ?? [], [playersQuery.data]);
  const restrictions = useMemo(() => restrictionsQuery.data ?? [], [restrictionsQuery.data]);
  const matchHistory = useMemo(() => matchHistoryQuery.data ?? [], [matchHistoryQuery.data]);
  const subsPayments = useMemo(() => subsPaymentsQuery.data ?? [], [subsPaymentsQuery.data]);
  const subsSettings = useMemo(() => {
    const defaults = { costPerGame: 5, lateFee: 1, gameCost: 58 };
    return { ...defaults, ...(subsSettingsQuery.data ?? {}) };
  }, [subsSettingsQuery.data]);

  const forceCloudSync = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      console.log('[Sync] Supabase not configured');
      setSyncStatus('error');
      throw new Error('Supabase is not configured. Check your environment variables.');
    }
    try {
      setSyncStatus('syncing');
      console.log('[Sync] Starting cloud sync...');

      await Promise.all([
        syncPlayersToSupabase(players),
        syncRestrictionsToSupabase(restrictions),
        syncMatchResultsToSupabase(matchHistory),
        syncSubsPaymentsToSupabase(subsPayments),
        syncSubsSettingsToSupabase(subsSettings),
      ]);

      setSyncStatus('synced');
      console.log('[Sync] Cloud sync complete');
    } catch (err) {
      console.error('[Sync] Cloud sync failed:', err);
      setSyncStatus('error');
      throw err;
    }
  }, [players, restrictions, matchHistory, subsPayments, subsSettings, queryClient]);

  const forceCloudRestore = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      console.log('[Restore] Supabase not configured');
      setSyncStatus('error');
      throw new Error('Supabase is not configured. Check your environment variables.');
    }
    try {
      setSyncStatus('syncing');
      console.log('[Restore] Starting cloud restore...');

      const [cloudPlayers, cloudRestrictions, cloudMatches, cloudPayments, cloudSettings] = await Promise.all([
        fetchPlayersFromSupabase(),
        fetchRestrictionsFromSupabase(),
        fetchMatchResultsFromSupabase(),
        fetchSubsPaymentsFromSupabase(),
        fetchSubsSettingsFromSupabase(),
      ]);

      if (cloudPlayers) {
        await AsyncStorage.setItem(PLAYERS_KEY, JSON.stringify(cloudPlayers));
        queryClient.setQueryData(['players'], cloudPlayers);
        console.log('[Restore] Restored', cloudPlayers.length, 'players');
      }
      if (cloudRestrictions) {
        await AsyncStorage.setItem(RESTRICTIONS_KEY, JSON.stringify(cloudRestrictions));
        queryClient.setQueryData(['restrictions'], cloudRestrictions);
        console.log('[Restore] Restored', cloudRestrictions.length, 'restrictions');
      }
      if (cloudMatches) {
        await AsyncStorage.setItem(MATCH_HISTORY_KEY, JSON.stringify(cloudMatches));
        queryClient.setQueryData(['matchHistory'], cloudMatches);
        console.log('[Restore] Restored', cloudMatches.length, 'match results');
      }
      if (cloudPayments) {
        await AsyncStorage.setItem(SUBS_PAYMENTS_KEY, JSON.stringify(cloudPayments));
        queryClient.setQueryData(['subsPayments'], cloudPayments);
        console.log('[Restore] Restored', cloudPayments.length, 'subs payments');
      }
      if (cloudSettings) {
        await AsyncStorage.setItem(SUBS_SETTINGS_KEY, JSON.stringify(cloudSettings));
        queryClient.setQueryData(['subsSettings'], cloudSettings);
        console.log('[Restore] Restored subs settings');
      }

      setSyncStatus('synced');
      console.log('[Restore] Cloud restore complete');
    } catch (err) {
      console.error('[Restore] Cloud restore failed:', err);
      setSyncStatus('error');
      throw err;
    }
  }, [queryClient]);

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

  const getPlayerBalance = useCallback((playerId: string) => {
    const credits = subsPayments
      .filter(p => p.playerId === playerId && p.type === 'credit' && !p.voidedMatchId)
      .reduce((sum, p) => sum + p.amount, 0);
    const voidedMatchIds = getVoidedMatchIds(playerId);
    const appearances = matchHistory.filter(m => m.playerIds.includes(playerId) && !voidedMatchIds.includes(m.id)).length;
    const gameCosts = appearances * subsSettings.costPerGame;
    const manualDebits = subsPayments
      .filter(p => p.playerId === playerId && p.type === 'debit' && !p.description.startsWith('Match '))
      .reduce((sum, p) => sum + p.amount, 0);
    return credits - gameCosts - manualDebits;
  }, [subsPayments, matchHistory, subsSettings.costPerGame, getVoidedMatchIds]);

  const getPlayerPayments = useCallback((playerId: string) => {
    const voidedMatchIds = getVoidedMatchIds(playerId);
    const manualPayments = subsPayments
      .filter(p => p.playerId === playerId && !(p.type === 'debit' && p.description.startsWith('Match ')) && !p.voidedMatchId);
    const matchDebits: SubsPayment[] = matchHistory
      .filter(m => m.playerIds.includes(playerId) && !voidedMatchIds.includes(m.id))
      .map(m => ({
        id: `synthetic-${m.id}-${playerId}`,
        playerId,
        amount: subsSettings.costPerGame,
        type: 'debit' as const,
        description: `Match ${m.date}`,
        date: m.date,
        createdAt: m.createdAt,
      }));
    return [...manualPayments, ...matchDebits].sort((a, b) => b.createdAt - a.createdAt);
  }, [subsPayments, matchHistory, subsSettings.costPerGame, getVoidedMatchIds]);

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

  const getKittyBalance = useCallback(() => {
    const totalCredits = subsPayments
      .filter(p => p.type === 'credit')
      .reduce((sum, p) => sum + p.amount, 0);
    const totalGameCosts = matchHistory.length * subsSettings.gameCost;
    return totalCredits - totalGameCosts;
  }, [subsPayments, matchHistory, subsSettings.gameCost]);

  const getTotalOutstanding = useCallback(() => {
    const total = players.reduce((sum, p) => {
      const balance = getPlayerBalance(p.id);
      if (balance < 0) return sum + Math.abs(balance);
      return sum;
    }, 0);
    return total;
  }, [players, getPlayerBalance]);

  const addSubsCredit = useCallback((playerId: string, amount: number, description: string, date: string) => {
    const newPayment: SubsPayment = {
      id: `subs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      playerId,
      amount,
      type: 'credit',
      description,
      date,
      createdAt: Date.now(),
    };
    saveSubsPayments([newPayment, ...subsPayments]);
  }, [subsPayments, saveSubsPayments]);

  const addSubsDebit = useCallback((playerId: string, amount: number, description: string, date: string) => {
    const newPayment: SubsPayment = {
      id: `subs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      playerId,
      amount,
      type: 'debit',
      description,
      date,
      createdAt: Date.now(),
    };
    saveSubsPayments([newPayment, ...subsPayments]);
  }, [subsPayments, saveSubsPayments]);

  const addGuestDebit = useCallback((sponsorPlayerId: string, guestName: string, amount: number, date: string) => {
    const newPayment: SubsPayment = {
      id: `subs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      playerId: sponsorPlayerId,
      amount,
      type: 'debit',
      description: `Guest: ${guestName}`,
      date,
      createdAt: Date.now(),
      guestName,
    };
    saveSubsPayments([newPayment, ...subsPayments]);
  }, [subsPayments, saveSubsPayments]);

  const deleteSubsPayment = useCallback((id: string) => {
    const filtered = subsPayments.filter(p => p.id !== id);
    saveSubsPayments(filtered);
  }, [subsPayments, saveSubsPayments]);

  const voidMatchDebit = useCallback((matchId: string, playerId: string, matchDate: string) => {
    const voidPayment: SubsPayment = {
      id: `void-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      playerId,
      amount: subsSettings.costPerGame,
      type: 'credit',
      description: `Voided: Match ${matchDate}`,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      createdAt: Date.now(),
      voidedMatchId: matchId,
    };
    saveSubsPayments([voidPayment, ...subsPayments]);
  }, [subsPayments, subsSettings.costPerGame, saveSubsPayments]);

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
    const updated = players.map(p => p.id === id ? { ...p, ...updates } : p);
    savePlayers(updated);
  }, [players, savePlayers]);

  const deletePlayer = useCallback((id: string) => {
    const filtered = players.filter(p => p.id !== id);
    savePlayers(filtered);
    setSelectedPlayerIds(prev => prev.filter(pid => pid !== id));
    const filteredRestrictions = restrictions.filter(
      r => r.player1Id !== id && r.player2Id !== id
    );
    saveRestrictions(filteredRestrictions);
  }, [players, restrictions, savePlayers, saveRestrictions]);

  const addRestriction = useCallback((player1Id: string, player2Id: string, type: 'apart' | 'together' = 'apart') => {
    const exists = restrictions.some(
      r => (r.player1Id === player1Id && r.player2Id === player2Id) ||
           (r.player1Id === player2Id && r.player2Id === player1Id)
    );
    if (exists) return;
    
    const newRestriction: Restriction = {
      id: `restriction-${Date.now()}`,
      player1Id,
      player2Id,
      type,
    };
    saveRestrictions([...restrictions, newRestriction]);
  }, [restrictions, saveRestrictions]);

  const removeRestriction = useCallback((id: string) => {
    const filtered = restrictions.filter(r => r.id !== id);
    saveRestrictions(filtered);
  }, [restrictions, saveRestrictions]);

  const togglePlayerSelection = useCallback((playerId: string) => {
    setSelectedPlayerIds(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      }
      if (prev.length >= 14) return prev;
      return [...prev, playerId];
    });
  }, []);

  const selectAllPlayers = useCallback(() => {
    setSelectedPlayerIds(players.slice(0, 14).map(p => p.id));
  }, [players]);

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
    saveMatchHistory([newResult, ...matchHistory]);
  }, [matchHistory, saveMatchHistory]);

  const deleteMatchResult = useCallback((id: string) => {
    const filtered = matchHistory.filter(m => m.id !== id);
    saveMatchHistory(filtered);
  }, [matchHistory, saveMatchHistory]);

  const updateMatchResult = useCallback((id: string, updates: Partial<Omit<MatchResult, 'id' | 'createdAt'>>) => {
    const updated = matchHistory.map(m => m.id === id ? { ...m, ...updates } : m);
    saveMatchHistory(updated);
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

  const getExportData = useCallback(() => {
    const lines: string[] = [];
    lines.push('=== TNF PLAYER DATABASE ===');
    lines.push('Player Name\tPosition\tRating\tAppearances\tWins\tDraws\tLosses\tWin%\tMOTM\tSubs Balance');
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
        const motmPlayer = players.find(p => p.id === m.manOfMatchId);
        lines.push(`Man of the Match: ${motmPlayer?.name ?? 'Unknown'}`);
      }
      lines.push(`Manual Teams: ${m.isManualTeams ? 'Yes' : 'No'}`);
      lines.push('---');
    });
    return lines.join('\n');
  }, [players, matchHistory, getPlayerAppearances, getPlayerWins, getPlayerDraws, getPlayerLosses, getPlayerMotmCount, getPlayerBalance]);

  return {
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
    forceCloudSync,
    forceCloudRestore,
  };
});
