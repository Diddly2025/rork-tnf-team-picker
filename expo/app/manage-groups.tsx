import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { ArrowLeft, Check, Plus, Trash2, Pencil, X } from 'lucide-react-native';
import { useGroup } from '@/context/GroupContext';
import { getSportLabel, SPORT_CONFIGS } from '@/constants/sports';
import { Group } from '@/types';
import Colors from '@/constants/colors';

export default function ManageGroupsScreen() {
  const router = useRouter();
  const { groups, activeGroupId, setActiveGroup, deleteGroup, updateGroup } = useGroup();

  const [editGroup, setEditGroup] = useState<Group | null>(null);
  const [editName, setEditName] = useState('');
  const [editPlayersPerTeam, setEditPlayersPerTeam] = useState('');
  const [editCostPerSession, setEditCostPerSession] = useState('');
  const [editPlayTime, setEditPlayTime] = useState('');

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

  const handleOpenEdit = useCallback((group: Group) => {
    setEditGroup(group);
    setEditName(group.name);
    setEditPlayersPerTeam(String(group.playersPerTeam));
    setEditCostPerSession(String(group.costPerSession ?? 5));
    setEditPlayTime(group.playTime);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editGroup) return;
    if (!editName.trim()) {
      Alert.alert('Group Name Required', 'Please enter a name for your group.');
      return;
    }
    const ppt = parseInt(editPlayersPerTeam, 10);
    if (isNaN(ppt) || ppt < 1 || ppt > 20) {
      Alert.alert('Invalid Team Size', 'Players per team must be between 1 and 20.');
      return;
    }
    const cps = parseFloat(editCostPerSession);

    updateGroup(editGroup.id, {
      name: editName.trim(),
      playersPerTeam: ppt,
      costPerSession: isNaN(cps) || cps < 0 ? 5 : cps,
      playTime: editPlayTime,
    });
    setEditGroup(null);
    console.log('[ManageGroups] Group updated:', editName.trim());
  }, [editGroup, editName, editPlayersPerTeam, editCostPerSession, editPlayTime, updateGroup]);

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
              {getSportLabel(item.sport, item.customSport)} · {item.playersPerTeam}v{item.playersPerTeam} · {item.playDay}s · £{(item.costPerSession ?? 5).toFixed(2)}/session
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
            style={styles.editBtn}
            onPress={() => handleOpenEdit(item)}
            hitSlop={8}
          >
            <Pencil size={16} color={Colors.gold} />
          </Pressable>
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
  }, [activeGroupId, handleSwitch, handleDelete, handleOpenEdit]);

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

      <Modal
        visible={!!editGroup}
        transparent
        animationType="slide"
        onRequestClose={() => setEditGroup(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalKav}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setEditGroup(null)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Group</Text>
              <Pressable onPress={() => setEditGroup(null)} hitSlop={12}>
                <X size={22} color={Colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={styles.fieldLabel}>Group Name</Text>
            <TextInput
              style={styles.textInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Group name"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="words"
            />

            <Text style={styles.fieldLabel}>Players Per Team</Text>
            <TextInput
              style={styles.textInput}
              value={editPlayersPerTeam}
              onChangeText={setEditPlayersPerTeam}
              placeholder="7"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
              maxLength={2}
            />

            <Text style={styles.fieldLabel}>Cost Per Session (£)</Text>
            <Text style={styles.fieldHint}>How much each player pays per session</Text>
            <TextInput
              style={styles.textInput}
              value={editCostPerSession}
              onChangeText={setEditCostPerSession}
              placeholder="5.00"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
            />

            <Text style={styles.fieldLabel}>Play Time</Text>
            <TextInput
              style={styles.textInput}
              value={editPlayTime}
              onChangeText={setEditPlayTime}
              placeholder="19:00"
              placeholderTextColor={Colors.textMuted}
            />

            <Pressable style={styles.saveButton} onPress={handleSaveEdit}>
              <Check size={20} color={Colors.background} />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    gap: 10,
  },
  activeBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(200, 160, 42, 0.1)',
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
  modalKav: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 6,
    marginTop: 12,
  },
  fieldHint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 6,
    marginTop: -4,
  },
  textInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 24,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.background,
  },
});
