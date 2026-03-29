import { supabase, isSupabaseConfigured } from './supabase';
import { Player, Restriction, MatchResult, SubsPayment, SubsSettings, Expense } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CLOUD_SYNC_KEY = 'tnf_cloud_sync_enabled';

export async function getCloudSyncEnabled(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(CLOUD_SYNC_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

export async function setCloudSyncEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(CLOUD_SYNC_KEY, enabled ? 'true' : 'false');
  } catch (e) {
    console.log('[CloudSync] Failed to save preference:', e);
  }
}

function safeSyncCall(fn: () => Promise<void>): void {
  fn().catch(e => {
    console.log('[Supabase Sync] Background sync error (non-fatal):', e);
  });
}

export function fireAndForgetSync(fn: () => Promise<void>): void {
  safeSyncCall(fn);
}

export async function syncPlayersToSupabase(players: Player[]): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const { error: deleteError } = await supabase.from('players').delete().neq('id', '');
    if (deleteError) {
      console.log('[Supabase Sync] Error clearing players:', deleteError.message);
      return;
    }
    if (players.length === 0) return;
    const rows = players.map(p => ({
      id: p.id,
      name: p.name,
      position: p.position,
      rating: p.rating,
      photo_url: p.photo ?? null,
      created_at: p.createdAt,
    }));
    const { error } = await supabase.from('players').upsert(rows);
    if (error) console.log('[Supabase Sync] Error syncing players:', error.message);
    else console.log('[Supabase Sync] Players synced:', players.length);
  } catch (e) {
    console.log('[Supabase Sync] Players sync failed:', e);
  }
}

export async function syncRestrictionsToSupabase(restrictions: Restriction[]): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    await supabase.from('restrictions').delete().neq('id', '');
    if (restrictions.length === 0) return;
    const rows = restrictions.map(r => ({
      id: r.id,
      player1_id: r.player1Id,
      player2_id: r.player2Id,
      type: r.type,
    }));
    const { error } = await supabase.from('restrictions').upsert(rows);
    if (error) console.log('[Supabase Sync] Error syncing restrictions:', error.message);
    else console.log('[Supabase Sync] Restrictions synced:', restrictions.length);
  } catch (e) {
    console.log('[Supabase Sync] Restrictions sync failed:', e);
  }
}

export async function syncMatchResultsToSupabase(results: MatchResult[]): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    await supabase.from('match_results').delete().neq('id', '');
    if (results.length === 0) return;
    const rows = results.map(m => ({
      id: m.id,
      date: m.date,
      team_a: m.teamA,
      team_b: m.teamB,
      score_a: m.scoreA,
      score_b: m.scoreB,
      player_ids: m.playerIds,
      is_manual_teams: m.isManualTeams,
      man_of_match_id: m.manOfMatchId ?? null,
      created_at: m.createdAt,
    }));
    const { error } = await supabase.from('match_results').upsert(rows);
    if (error) console.log('[Supabase Sync] Error syncing match results:', error.message);
    else console.log('[Supabase Sync] Match results synced:', results.length);
  } catch (e) {
    console.log('[Supabase Sync] Match results sync failed:', e);
  }
}

export async function syncSubsPaymentsToSupabase(payments: SubsPayment[]): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    await supabase.from('subs_payments').delete().neq('id', '');
    if (payments.length === 0) return;
    const rows = payments.map(p => ({
      id: p.id,
      player_id: p.playerId,
      amount: p.amount,
      type: p.type,
      description: p.description,
      date: p.date,
      created_at: p.createdAt,
      guest_name: p.guestName ?? null,
      voided_match_id: p.voidedMatchId ?? null,
    }));
    const { error } = await supabase.from('subs_payments').upsert(rows);
    if (error) console.log('[Supabase Sync] Error syncing subs payments:', error.message);
    else console.log('[Supabase Sync] Subs payments synced:', payments.length);
  } catch (e) {
    console.log('[Supabase Sync] Subs payments sync failed:', e);
  }
}

export async function syncSubsSettingsToSupabase(settings: SubsSettings): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const { error } = await supabase.from('subs_settings').upsert({
      id: 'default',
      cost_per_game: settings.costPerGame,
      late_fee: settings.lateFee,
      game_cost: settings.gameCost,
    });
    if (error) console.log('[Supabase Sync] Error syncing subs settings:', error.message);
    else console.log('[Supabase Sync] Subs settings synced');
  } catch (e) {
    console.log('[Supabase Sync] Subs settings sync failed:', e);
  }
}

export async function fetchPlayersFromSupabase(): Promise<Player[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.from('players').select('*').order('created_at', { ascending: true });
    if (error) {
      console.log('[Supabase Fetch] Error fetching players:', error.message);
      return null;
    }
    if (!data || data.length === 0) return null;
    return data.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      name: row.name as string,
      position: row.position as Player['position'],
      rating: Number(row.rating),
      photo: (row.photo_url as string) ?? (row.photo as string) ?? undefined,
      createdAt: Number(row.created_at),
    }));
  } catch (e) {
    console.log('[Supabase Fetch] Players fetch failed:', e);
    return null;
  }
}

export async function fetchRestrictionsFromSupabase(): Promise<Restriction[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.from('restrictions').select('*');
    if (error) {
      console.log('[Supabase Fetch] Error fetching restrictions:', error.message);
      return null;
    }
    if (!data || data.length === 0) return null;
    return data.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      player1Id: row.player1_id as string,
      player2Id: row.player2_id as string,
      type: row.type as Restriction['type'],
    }));
  } catch (e) {
    console.log('[Supabase Fetch] Restrictions fetch failed:', e);
    return null;
  }
}

export async function fetchMatchResultsFromSupabase(): Promise<MatchResult[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.from('match_results').select('*').order('created_at', { ascending: false });
    if (error) {
      console.log('[Supabase Fetch] Error fetching match results:', error.message);
      return null;
    }
    if (!data || data.length === 0) return null;
    return data.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      date: row.date as string,
      teamA: row.team_a as MatchResult['teamA'],
      teamB: row.team_b as MatchResult['teamB'],
      scoreA: Number(row.score_a),
      scoreB: Number(row.score_b),
      playerIds: row.player_ids as string[],
      isManualTeams: row.is_manual_teams as boolean,
      manOfMatchId: (row.man_of_match_id as string) ?? undefined,
      createdAt: Number(row.created_at),
    }));
  } catch (e) {
    console.log('[Supabase Fetch] Match results fetch failed:', e);
    return null;
  }
}

export async function fetchSubsPaymentsFromSupabase(): Promise<SubsPayment[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.from('subs_payments').select('*').order('created_at', { ascending: false });
    if (error) {
      console.log('[Supabase Fetch] Error fetching subs payments:', error.message);
      return null;
    }
    if (!data || data.length === 0) return null;
    return data.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      playerId: row.player_id as string,
      amount: Number(row.amount),
      type: row.type as SubsPayment['type'],
      description: row.description as string,
      date: row.date as string,
      createdAt: Number(row.created_at),
      guestName: (row.guest_name as string) ?? undefined,
      voidedMatchId: (row.voided_match_id as string) ?? undefined,
    }));
  } catch (e) {
    console.log('[Supabase Fetch] Subs payments fetch failed:', e);
    return null;
  }
}

function getDefaultUserId(): string {
  const projectId = process.env.EXPO_PUBLIC_PROJECT_ID ?? 'default';
  const chars: string[] = projectId.split('');
  const hex = chars
    .map((c: string) => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('')
    .padEnd(32, '0')
    .slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export async function syncExpensesToSupabase(expenses: Expense[], groupId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const userId = getDefaultUserId();
    const gid = groupId;
    await supabase.from('expenses').delete().eq('group_id', gid);
    if (expenses.length === 0) return;
    const rows = expenses.map(e => ({
      id: e.id,
      description: e.description,
      amount: e.amount,
      category: e.category,
      date: e.date,
      created_at: e.createdAt,
      adjustment_type: e.adjustmentType ?? null,
      user_id: userId,
      group_id: gid,
    }));
    const { error } = await supabase.from('expenses').upsert(rows);
    if (error) console.log('[Supabase Sync] Error syncing expenses:', error.message);
    else console.log('[Supabase Sync] Expenses synced:', expenses.length);
  } catch (e) {
    console.log('[Supabase Sync] Expenses sync failed:', e);
  }
}

export async function upsertExpenseToSupabase(expense: Expense, groupId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const userId = getDefaultUserId();
    const row = {
      id: expense.id,
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      date: expense.date,
      created_at: expense.createdAt,
      adjustment_type: expense.adjustmentType ?? null,
      user_id: userId,
      group_id: groupId,
    };
    console.log('[Supabase Sync] Upserting expense row:', JSON.stringify(row));
    const { error } = await supabase.from('expenses').upsert(row);
    if (error) console.log('[Supabase Sync] Error upserting expense:', error.message, error.details, error.hint);
    else console.log('[Supabase Sync] Expense upserted successfully:', expense.id);
  } catch (e) {
    console.log('[Supabase Sync] Expense upsert failed:', e);
  }
}

export async function deleteExpenseFromSupabase(expenseId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
    if (error) console.log('[Supabase Sync] Error deleting expense:', error.message);
    else console.log('[Supabase Sync] Expense deleted:', expenseId);
  } catch (e) {
    console.log('[Supabase Sync] Expense delete failed:', e);
  }
}

export async function fetchExpensesFromSupabase(groupId: string): Promise<Expense[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const query = supabase.from('expenses').select('*').eq('group_id', groupId).order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) {
      console.log('[Supabase Fetch] Error fetching expenses:', error.message);
      return null;
    }
    if (!data || data.length === 0) return null;
    return data.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      description: row.description as string,
      amount: Number(row.amount),
      category: row.category as Expense['category'],
      date: row.date as string,
      createdAt: Number(row.created_at),
      adjustmentType: (row.adjustment_type as Expense['adjustmentType']) ?? undefined,
    }));
  } catch (e) {
    console.log('[Supabase Fetch] Expenses fetch failed:', e);
    return null;
  }
}

export async function fetchSubsSettingsFromSupabase(): Promise<SubsSettings | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.from('subs_settings').select('*').eq('id', 'default').single();
    if (error) {
      console.log('[Supabase Fetch] Error fetching subs settings:', error.message);
      return null;
    }
    if (!data) return null;
    return {
      costPerGame: Number(data.cost_per_game),
      lateFee: Number(data.late_fee),
      gameCost: Number(data.game_cost),
    };
  } catch (e) {
    console.log('[Supabase Fetch] Subs settings fetch failed:', e);
    return null;
  }
}
