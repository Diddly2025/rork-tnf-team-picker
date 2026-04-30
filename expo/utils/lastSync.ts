import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

const KEY_PREFIX = 'pd_last_synced_';

function storageKey(groupId: string | null | undefined): string {
  return `${KEY_PREFIX}${groupId ?? 'none'}`;
}

export async function getLastSyncedAt(groupId: string | null | undefined): Promise<number | null> {
  try {
    const v = await AsyncStorage.getItem(storageKey(groupId));
    if (!v) return null;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  } catch (e) {
    console.log('[LastSync] Failed to read:', e);
    return null;
  }
}

export async function setLastSyncedAt(groupId: string | null | undefined, ts: number): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(groupId), String(ts));
  } catch (e) {
    console.log('[LastSync] Failed to write:', e);
  }
}

export function formatLastSynced(ts: number | null): string {
  if (!ts) return 'Never synced';
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  if (sameDay) return `Last synced: Today at ${time}`;
  if (isYesterday) return `Last synced: Yesterday at ${time}`;
  const datePart = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  return `Last synced: ${datePart} at ${time}`;
}

export function useLastSync(groupId: string | null | undefined): { lastSyncedAt: number | null; label: string } {
  const query = useQuery({
    queryKey: ['lastSync', groupId ?? 'none'],
    queryFn: () => getLastSyncedAt(groupId),
    enabled: true,
  });
  const ts = query.data ?? null;
  return { lastSyncedAt: ts, label: formatLastSynced(ts) };
}

export function useMarkSynced(): (groupId: string | null | undefined) => Promise<void> {
  const queryClient = useQueryClient();
  return useCallback(async (groupId: string | null | undefined) => {
    const now = Date.now();
    await setLastSyncedAt(groupId, now);
    queryClient.setQueryData(['lastSync', groupId ?? 'none'], now);
  }, [queryClient]);
}
