import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { Group } from '@/types';

const GROUPS_KEY = 'pd_groups';
const ACTIVE_GROUP_KEY = 'pd_active_group';
const LEGACY_PLAYERS_KEY = 'tnf_players';

async function migrateLegacyData(): Promise<{ groups: Group[]; activeId: string } | null> {
  const existingGroups = await AsyncStorage.getItem(GROUPS_KEY);
  if (existingGroups) return null;

  const oldPlayers = await AsyncStorage.getItem(LEGACY_PLAYERS_KEY);
  if (!oldPlayers) return null;

  console.log('[Migration] Found legacy TNF data, migrating...');

  const groupId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const defaultGroup: Group = {
    id: groupId,
    name: 'Tuesday Night Football',
    sport: 'football',
    playersPerTeam: 7,
    playDay: 'Tuesday',
    playTime: '19:00',
    createdAt: Date.now(),
  };

  const keyMap: Record<string, string> = {
    'tnf_players': `pd_${groupId}_players`,
    'tnf_restrictions': `pd_${groupId}_restrictions`,
    'tnf_match_history': `pd_${groupId}_match_history`,
    'tnf_subs_payments': `pd_${groupId}_subs_payments`,
    'tnf_subs_settings': `pd_${groupId}_subs_settings`,
    'tnf_expenses': `pd_${groupId}_expenses`,
  };

  for (const [oldKey, newKey] of Object.entries(keyMap)) {
    try {
      const data = await AsyncStorage.getItem(oldKey);
      if (data) {
        await AsyncStorage.setItem(newKey, data);
        console.log(`[Migration] Copied ${oldKey} -> ${newKey}`);
      }
    } catch (e) {
      console.log(`[Migration] Failed to copy ${oldKey}:`, e);
    }
  }

  const groups = [defaultGroup];
  await AsyncStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
  await AsyncStorage.setItem(ACTIVE_GROUP_KEY, groupId);

  console.log('[Migration] Legacy data migrated successfully');
  return { groups, activeId: groupId };
}

export const [GroupProvider, useGroup] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [migrationDone, setMigrationDone] = useState(false);

  useEffect(() => {
    void migrateLegacyData().then(result => {
      if (result) {
        queryClient.setQueryData(['groups'], result.groups);
        queryClient.setQueryData(['activeGroupId'], result.activeId);
      }
      setMigrationDone(true);
    }).catch(() => setMigrationDone(true));
  }, [queryClient]);

  const groupsQuery = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(GROUPS_KEY);
      return stored ? JSON.parse(stored) as Group[] : [];
    },
    enabled: migrationDone,
  });

  const activeGroupIdQuery = useQuery({
    queryKey: ['activeGroupId'],
    queryFn: async () => {
      return await AsyncStorage.getItem(ACTIVE_GROUP_KEY);
    },
    enabled: migrationDone,
  });

  const { mutate: saveGroups } = useMutation({
    mutationFn: async (groups: Group[]) => {
      await AsyncStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
      return groups;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['groups'], data);
    },
  });

  const { mutate: saveActiveGroupId } = useMutation({
    mutationFn: async (id: string | null) => {
      if (id) {
        await AsyncStorage.setItem(ACTIVE_GROUP_KEY, id);
      } else {
        await AsyncStorage.removeItem(ACTIVE_GROUP_KEY);
      }
      return id;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['activeGroupId'], data);
      void queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return !['groups', 'activeGroupId'].includes(key);
        },
      });
    },
  });

  const groups = useMemo(() => groupsQuery.data ?? [], [groupsQuery.data]);
  const activeGroupId = activeGroupIdQuery.data ?? null;
  const activeGroup = useMemo(
    () => groups.find(g => g.id === activeGroupId) ?? null,
    [groups, activeGroupId]
  );

  const addGroup = useCallback((group: Omit<Group, 'id' | 'createdAt'>) => {
    const newGroup: Group = {
      ...group,
      id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
    };
    const updated = [...groups, newGroup];
    saveGroups(updated);
    saveActiveGroupId(newGroup.id);
    return newGroup;
  }, [groups, saveGroups, saveActiveGroupId]);

  const updateGroup = useCallback((id: string, updates: Partial<Group>) => {
    const updated = groups.map(g => g.id === id ? { ...g, ...updates } : g);
    saveGroups(updated);
  }, [groups, saveGroups]);

  const deleteGroup = useCallback((id: string) => {
    const updated = groups.filter(g => g.id !== id);
    saveGroups(updated);

    const dataKeys = ['players', 'restrictions', 'match_history', 'subs_payments', 'subs_settings', 'expenses'];
    dataKeys.forEach(key => {
      void AsyncStorage.removeItem(`pd_${id}_${key}`).catch(e => {
        console.log(`[Groups] Failed to clean up pd_${id}_${key}:`, e);
      });
    });

    if (activeGroupId === id) {
      const nextGroup = updated[0];
      saveActiveGroupId(nextGroup?.id ?? null);
    }
  }, [groups, activeGroupId, saveGroups, saveActiveGroupId]);

  const setActiveGroup = useCallback((id: string) => {
    console.log('[Groups] Switching to group:', id);
    saveActiveGroupId(id);
  }, [saveActiveGroupId]);

  return useMemo(() => ({
    groups,
    activeGroup,
    activeGroupId,
    addGroup,
    updateGroup,
    deleteGroup,
    setActiveGroup,
    isLoading: !migrationDone || groupsQuery.isLoading || activeGroupIdQuery.isLoading,
  }), [groups, activeGroup, activeGroupId, addGroup, updateGroup, deleteGroup, setActiveGroup, migrationDone, groupsQuery.isLoading, activeGroupIdQuery.isLoading]);
});
