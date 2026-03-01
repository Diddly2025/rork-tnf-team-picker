import { supabase, isSupabaseConfigured } from '@/utils/supabase';
import { Player, Restriction, MatchResult, SubsPayment, SubsSettings } from '@/types';

export async function syncPlayersToSupabase(players: Player[]): Promise<void> {
  if (!isSupabaseConfigured()) {
    console.log('[Sync] Supabase not configured, skipping player sync');
    return;
  }
  try {
    console.log('[Sync] Syncing players to Supabase...');
    const { error: deleteError } = await supabase.from('players').delete().neq('id', '');
    if (deleteError) {
      console.log('[Sync] Delete error (may be ok if table empty):', deleteError.message);
    }
    if (players.length > 0) {
      const rows = players.map(p => ({
        id: p.id,
        name: p.name,
        position: p.position,
        rating: p.rating,
        photo: p.photo ?? null,
        created_at: p.createdAt,
      }));
      const { error } = await supabase.from('players').upsert(rows, { onConflict: 'id' });
      if (error) throw error;
    }
    console.log('[Sync] Players synced successfully:', players.length);
  } catch (err) {
    console.error('[Sync] Failed to sync players:', err);
    throw err;
  }
}

export async function syncRestrictionsToSupabase(restrictions: Restriction[]): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    console.log('[Sync] Syncing restrictions to Supabase...');
    const { error: deleteError } = await supabase.from('restrictions').delete().neq('id', '');
    if (deleteError) console.log('[Sync] Delete restrictions error:', deleteError.message);
    if (restrictions.length > 0) {
      const rows = restrictions.map(r => ({
        id: r.id,
        player1_id: r.player1Id,
        player2_id: r.player2Id,
        type: r.type,
      }));
      const { error } = await supabase.from('restrictions').upsert(rows, { onConflict: 'id' });
      if (error) throw error;
    }
    console.log('[Sync] Restrictions synced:', restrictions.length);
  } catch (err) {
    console.error('[Sync] Failed to sync restrictions:', err);
    throw err;
  }
}

export async function syncMatchResultsToSupabase(results: MatchResult[]): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    console.log('[Sync] Syncing match results to Supabase...');
    const { error: deleteError } = await supabase.from('match_results').delete().neq('id', '');
    if (deleteError) console.log('[Sync] Delete match_results error:', deleteError.message);
    if (results.length > 0) {
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
      const { error } = await supabase.from('match_results').upsert(rows, { onConflict: 'id' });
      if (error) throw error;
    }
    console.log('[Sync] Match results synced:', results.length);
  } catch (err) {
    console.error('[Sync] Failed to sync match results:', err);
    throw err;
  }
}

export async function syncSubsPaymentsToSupabase(payments: SubsPayment[]): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    console.log('[Sync] Syncing subs payments to Supabase...');
    const { error: deleteError } = await supabase.from('subs_payments').delete().neq('id', '');
    if (deleteError) console.log('[Sync] Delete subs_payments error:', deleteError.message);
    if (payments.length > 0) {
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
      const { error } = await supabase.from('subs_payments').upsert(rows, { onConflict: 'id' });
      if (error) throw error;
    }
    console.log('[Sync] Subs payments synced:', payments.length);
  } catch (err) {
    console.error('[Sync] Failed to sync subs payments:', err);
    throw err;
  }
}

export async function syncSubsSettingsToSupabase(settings: SubsSettings): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    console.log('[Sync] Syncing subs settings to Supabase...');
    const row = {
      id: 'default',
      cost_per_game: settings.costPerGame,
      late_fee: settings.lateFee,
      game_cost: settings.gameCost,
    };
    const { error } = await supabase.from('subs_settings').upsert(row, { onConflict: 'id' });
    if (error) throw error;
    console.log('[Sync] Subs settings synced');
  } catch (err) {
    console.error('[Sync] Failed to sync subs settings:', err);
    throw err;
  }
}

export async function fetchPlayersFromSupabase(): Promise<Player[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    console.log('[Restore] Fetching players from Supabase...');
    const { data, error } = await supabase.from('players').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    if (!data || data.length === 0) {
      console.log('[Restore] No players found in Supabase');
      return null;
    }
    const players: Player[] = data.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      name: row.name as string,
      position: row.position as Player['position'],
      rating: row.rating as number,
      photo: (row.photo as string) ?? undefined,
      createdAt: row.created_at as number,
    }));
    console.log('[Restore] Fetched players:', players.length);
    return players;
  } catch (err) {
    console.error('[Restore] Failed to fetch players:', err);
    throw err;
  }
}

export async function fetchRestrictionsFromSupabase(): Promise<Restriction[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    console.log('[Restore] Fetching restrictions from Supabase...');
    const { data, error } = await supabase.from('restrictions').select('*');
    if (error) throw error;
    if (!data || data.length === 0) return null;
    const restrictions: Restriction[] = data.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      player1Id: row.player1_id as string,
      player2Id: row.player2_id as string,
      type: row.type as 'apart' | 'together',
    }));
    console.log('[Restore] Fetched restrictions:', restrictions.length);
    return restrictions;
  } catch (err) {
    console.error('[Restore] Failed to fetch restrictions:', err);
    throw err;
  }
}

export async function fetchMatchResultsFromSupabase(): Promise<MatchResult[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    console.log('[Restore] Fetching match results from Supabase...');
    const { data, error } = await supabase.from('match_results').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    if (!data || data.length === 0) return null;
    const results: MatchResult[] = data.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      date: row.date as string,
      teamA: row.team_a as MatchResult['teamA'],
      teamB: row.team_b as MatchResult['teamB'],
      scoreA: row.score_a as number,
      scoreB: row.score_b as number,
      playerIds: row.player_ids as string[],
      isManualTeams: row.is_manual_teams as boolean,
      manOfMatchId: (row.man_of_match_id as string) ?? undefined,
      createdAt: row.created_at as number,
    }));
    console.log('[Restore] Fetched match results:', results.length);
    return results;
  } catch (err) {
    console.error('[Restore] Failed to fetch match results:', err);
    throw err;
  }
}

export async function fetchSubsPaymentsFromSupabase(): Promise<SubsPayment[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    console.log('[Restore] Fetching subs payments from Supabase...');
    const { data, error } = await supabase.from('subs_payments').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    if (!data || data.length === 0) return null;
    const payments: SubsPayment[] = data.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      playerId: row.player_id as string,
      amount: row.amount as number,
      type: row.type as 'credit' | 'debit',
      description: row.description as string,
      date: row.date as string,
      createdAt: row.created_at as number,
      guestName: (row.guest_name as string) ?? undefined,
      voidedMatchId: (row.voided_match_id as string) ?? undefined,
    }));
    console.log('[Restore] Fetched subs payments:', payments.length);
    return payments;
  } catch (err) {
    console.error('[Restore] Failed to fetch subs payments:', err);
    throw err;
  }
}

export async function fetchSubsSettingsFromSupabase(): Promise<SubsSettings | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    console.log('[Restore] Fetching subs settings from Supabase...');
    const { data, error } = await supabase.from('subs_settings').select('*').eq('id', 'default').single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    if (!data) return null;
    const row = data as Record<string, unknown>;
    const settings: SubsSettings = {
      costPerGame: row.cost_per_game as number,
      lateFee: row.late_fee as number,
      gameCost: row.game_cost as number,
    };
    console.log('[Restore] Fetched subs settings');
    return settings;
  } catch (err) {
    console.error('[Restore] Failed to fetch subs settings:', err);
    throw err;
  }
}
