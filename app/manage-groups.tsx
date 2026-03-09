import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { ArrowLeft, Check, Plus, Trash2 } from 'lucide-react-native';
import { useGroup } from '@/context/GroupContext';
import { getSportLabel, SPORT_CONFIGS } from '@/constants/sports';
import { Group } from '@/types';
import Colors from '@/constants/colors';

export default function ManageGroupsScreen() {
  const router = useRouter();
  const { groups, activeGroupId, setActiveGroup, deleteGroup } = useGroup();

  const handleSwitch = useCallback((id: string) => {
    setActiveGroup(id);
    router.back();
  }, [setActiveGroup, router]);

  const handleDelete = useCallback((group: Group) => {
    if (groups.length <= 1) {
      Alert.alert('Cannot Delete', 'You need at least one group.');
      return;
    }
    Alert.alert(
      'Delete Group',
      `Delete "${group.name}" and all its data? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteGroup(group.id),
        },
      ]
    );
  }, [groups.length, deleteGroup]);

  const renderGroup = useCallback(({ item }: { item: Group }) => {
    const isActive = item.id === activeGroupId;
    const config = SPORT_CONFIGS[item.sport];
    return (
      <Pressable
        style={[styles.groupCard, isActive && styles.groupCardActive]}
        onPress={() => handleSwitch(item.id)}
      >
        <View style={styles.groupLeft}>
          <Text style={styles.sportEmoji}>{config.emoji}</Text>
          <View style={styles.groupInfo}>
            <Text style={styles.groupName}>{item.name}</Text>
            <Text style={styles.groupMeta}>
              {getSportLabel(item.sport, item.customSport)} · {item.playersPerTeam}v{item.playersPerTeam} · {item.playDay}s
            </Text>
          </View>
        </View>
        <View style={styles.groupRight}>
          {isActive && (
            <View style={styles.activeBadge}>
              <Check size={14} color={Colors.background} />
            </View>
          )}
          <Pressable
            style={styles.deleteBtn}
            onPress={() => handleDelete(item)}
            hitSlop={8}
          >
            <Trash2 size={16} color={Colors.textMuted} />
          </Pressable>
        </View>
      </Pressable>
    );
  }, [activeGroupId, handleSwitch, handleDelete]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{
        title: 'Your Groups',
        headerLeft: () => (
          <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
            <ArrowLeft size={24} color={Colors.text} />
          </Pressable>
        ),
      }} />

      <FlatList
        data={groups}
        renderItem={renderGroup}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <Text style={styles.headerText}>
            Tap a group to switch. You can manage multiple sports groups independently.
          </Text>
        }
      />

      <Pressable
        style={styles.addButton}
        onPress={() => router.push('/group-setup')}
      >
        <Plus size={22} color={Colors.background} />
        <Text style={styles.addButtonText}>New Group</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  headerText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
  },
  groupCardActive: {
    borderColor: Colors.gold,
    backgroundColor: 'rgba(200, 160, 42, 0.06)',
  },
  groupLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  sportEmoji: {
    fontSize: 28,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  groupMeta: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  groupRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activeBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: Colors.background,
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gold,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  addButtonText: {
    color: Colors.background,
    fontSize: 17,
    fontWeight: '700' as const,
  },
});
