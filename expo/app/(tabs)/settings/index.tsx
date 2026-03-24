import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Pressable,
  Modal,
  Alert,
} from 'react-native';
import { Ban, Plus, X, AlertTriangle, UserX } from 'lucide-react-native';
import { useTNF } from '@/context/TNFContext';
import PlayerCard from '@/components/PlayerCard';
import { Restriction, Player } from '@/types';
import Colors from '@/constants/colors';

export default function RestrictionsScreen() {
  const { players, restrictions, addRestriction, removeRestriction, getPlayerById } = useTNF();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPlayer1, setSelectedPlayer1] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  const handleAddRestriction = useCallback((player2Id: string) => {
    if (selectedPlayer1) {
      addRestriction(selectedPlayer1, player2Id);
      setModalVisible(false);
      setSelectedPlayer1(null);
      setStep(1);
    }
  }, [selectedPlayer1, addRestriction]);

  const handleRemoveRestriction = useCallback((restriction: Restriction) => {
    const player1 = getPlayerById(restriction.player1Id);
    const player2 = getPlayerById(restriction.player2Id);
    Alert.alert(
      'Remove Restriction',
      `Allow ${player1?.name} and ${player2?.name} to play together?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          onPress: () => removeRestriction(restriction.id),
        },
      ]
    );
  }, [getPlayerById, removeRestriction]);

  const openModal = useCallback(() => {
    setSelectedPlayer1(null);
    setStep(1);
    setModalVisible(true);
  }, []);

  const selectPlayer1 = useCallback((playerId: string) => {
    setSelectedPlayer1(playerId);
    setStep(2);
  }, []);

  const getAvailablePlayers = useCallback((excludeId: string) => {
    return players.filter(p => {
      if (p.id === excludeId) return false;
      const hasExisting = restrictions.some(
        r => (r.player1Id === excludeId && r.player2Id === p.id) ||
             (r.player1Id === p.id && r.player2Id === excludeId)
      );
      return !hasExisting;
    });
  }, [players, restrictions]);

  const renderRestriction = useCallback(({ item }: { item: Restriction }) => {
    const player1 = getPlayerById(item.player1Id);
    const player2 = getPlayerById(item.player2Id);
    
    if (!player1 || !player2) return null;
    
    return (
      <Pressable 
        style={styles.restrictionCard}
        onPress={() => handleRemoveRestriction(item)}
      >
        <View style={styles.restrictionPlayers}>
          <View style={styles.restrictionPlayer}>
            <PlayerCard player={player1} size="small" />
            <Text style={styles.restrictionName} numberOfLines={1}>{player1.name}</Text>
          </View>
          <View style={styles.restrictionIcon}>
            <Ban size={24} color={Colors.danger} />
          </View>
          <View style={styles.restrictionPlayer}>
            <PlayerCard player={player2} size="small" />
            <Text style={styles.restrictionName} numberOfLines={1}>{player2.name}</Text>
          </View>
        </View>
        <Text style={styles.restrictionHint}>Tap to remove</Text>
      </Pressable>
    );
  }, [getPlayerById, handleRemoveRestriction]);

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <UserX size={64} color={Colors.textMuted} />
      <Text style={styles.emptyTitle}>No Restrictions</Text>
      <Text style={styles.emptyText}>
        Add restrictions to prevent certain players from being on the same team together
      </Text>
      {players.length >= 2 && (
        <Pressable style={styles.emptyButton} onPress={openModal}>
          <Plus size={20} color={Colors.background} />
          <Text style={styles.emptyButtonText}>Add Restriction</Text>
        </Pressable>
      )}
    </View>
  );

  const renderPlayerSelection = ({ item }: { item: Player }) => (
    <Pressable 
      style={styles.playerSelectRow}
      onPress={() => step === 1 ? selectPlayer1(item.id) : handleAddRestriction(item.id)}
    >
      <PlayerCard player={item} size="small" />
      <View style={styles.playerSelectInfo}>
        <Text style={styles.playerSelectName}>{item.name}</Text>
        <Text style={styles.playerSelectPosition}>{item.position} • {item.rating} OVR</Text>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.infoCard}>
        <AlertTriangle size={20} color={Colors.warning} />
        <Text style={styles.infoText}>
          Restrictions prevent two players from being assigned to the same team when generating balanced teams.
        </Text>
      </View>

      <FlatList
        data={restrictions}
        renderItem={renderRestriction}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
      />

      {players.length >= 2 && restrictions.length > 0 && (
        <Pressable style={styles.fab} onPress={openModal}>
          <Plus size={28} color={Colors.background} />
        </Pressable>
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {step === 1 ? 'Select First Player' : 'Select Second Player'}
              </Text>
              <Pressable onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <X size={24} color={Colors.text} />
              </Pressable>
            </View>
            
            {step === 2 && selectedPlayer1 && (
              <View style={styles.selectedInfo}>
                <Text style={styles.selectedText}>
                  {getPlayerById(selectedPlayer1)?.name} can't play with:
                </Text>
              </View>
            )}

            <FlatList
              data={step === 1 ? players : getAvailablePlayers(selectedPlayer1 || '')}
              renderItem={renderPlayerSelection}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.modalList}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  infoText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  restrictionCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  restrictionPlayers: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  restrictionPlayer: {
    alignItems: 'center',
    flex: 1,
  },
  restrictionName: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '600' as const,
    marginTop: 8,
    textAlign: 'center',
  },
  restrictionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restrictionHint: {
    color: Colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gold,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  emptyButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  selectedInfo: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.background,
  },
  selectedText: {
    color: Colors.gold,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  modalList: {
    padding: 16,
  },
  playerSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 8,
    marginBottom: 8,
  },
  playerSelectInfo: {
    marginLeft: 12,
    flex: 1,
  },
  playerSelectName: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  playerSelectPosition: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
});
