import { Player, Restriction, MatchResult, SubsPayment, SubsSettings } from '@/types';

export async function syncPlayersToSupabase(_players: Player[]): Promise<void> {}
export async function syncRestrictionsToSupabase(_restrictions: Restriction[]): Promise<void> {}
export async function syncMatchResultsToSupabase(_results: MatchResult[]): Promise<void> {}
export async function syncSubsPaymentsToSupabase(_payments: SubsPayment[]): Promise<void> {}
export async function syncSubsSettingsToSupabase(_settings: SubsSettings): Promise<void> {}
export async function fetchPlayersFromSupabase(): Promise<Player[] | null> { return null; }
export async function fetchRestrictionsFromSupabase(): Promise<Restriction[] | null> { return null; }
export async function fetchMatchResultsFromSupabase(): Promise<MatchResult[] | null> { return null; }
export async function fetchSubsPaymentsFromSupabase(): Promise<SubsPayment[] | null> { return null; }
export async function fetchSubsSettingsFromSupabase(): Promise<SubsSettings | null> { return null; }
