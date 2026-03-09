import React, { useCallback, useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Pressable,
  Alert,
  Modal,
  Animated,
} from 'react-native';
import { useRouter, RelativePathString } from 'expo-router';
import { CheckCircle, Circle, Users, Shuffle, Edit3, Ban, Plus, X, AlertTriangle, UserX, Link2 } from 'lucide-react-native';
import { useTNF } from '@/context/TNFContext';
import PlayerCard from '@/components/PlayerCard';
import { Player, Restriction } from '@/types';
import Colors from '@/constants/colors';

export default function MatchDayScreen() {
  const router = useRouter();
  const { 
    players, 
    selectedPlayerIds, 
    togglePlayerSelection,
    selectAllPlayers,
    clearSelection,
    generateTeams,
    getPlayerAppearances,
    clearManualTeams,
    selectedPlayers: _selectedPlayers,
    restrictions,
    addRestriction,
    removeRestriction,
    getPlayerById,
    maxTotalPlayers: _mt,
  } = useTNF();

  const [restrictionsModalVisible, setRestrictionsModalVisible] = useState(false);
  const [addRestrictionModalVisible, setAddRestrictionModalVisible] = useState(false);
  const [selectedPlayer1, setSelectedPlayer1] = useState<string | null>(null);
  const [restrictionStep, setRestrictionStep] = useState<1 | 2>(1);
  const [restrictionType, setRestrictionType] = useState<'apart' | 'together'>('apart');
  const [restrictionBannerShown, setRestrictionBannerShown] = useState(false);
  const [bannerAnim] = useState(() => new Animated.Value(0));

  const maxPlayers = _mt;
  const halfCount = Math.ceil(selectedPlayerIds.length / 2);

  useEffect(() => {
    if (selectedPlayerIds.length === maxPlayers && !restrictionBannerShown && restrictions.length > 0) {
      setRestrictionBannerShown(true);
      Animated.spring(bannerAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 8,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(bannerAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setRestrictionBannerShown(false));
      }, 5000);

      return () => clearTimeout(timer);
    }
    if (selectedPlayerIds.length < maxPlayers) {
      setRestrictionBannerShown(false);
      bannerAnim.setValue(0);
    }
  }, [selectedPlayerIds.length, restrictions.length, maxPlayers, restrictionBannerShown, bannerAnim]);

  const handleGenerateTeams = useCallback(() => {
    if (selectedPlayerIds.length < 4) {
      Alert.alert('Not Enough Players', 'Select at least 4 players to generate teams');
      return;
    }
    
    const teams = generateTeams();
    if (teams.length > 0) {
      router.push('/teams' as RelativePathString);
    } else {
      Alert.alert('Error', 'Could not generate balanced teams. Try adjusting restrictions.');
    }
  }, [selectedPlayerIds, generateTeams, router]);

  const handleManualTeams = useCallback(() => {
    if (selectedPlayerIds.length < 4) {
      Alert.alert('Not Enough Players', 'Select at least 4 players to create teams');
      return;
    }
    clearManualTeams();
    router.push('/manual-teams' as RelativePathString);
  }, [selectedPlayerIds, clearManualTeams, router]);

  const sortedPlayers = [...players].sort((a, b) => {
    const aSelected = selectedPlayerIds.includes(a.id);
    const bSelected = selectedPlayerIds.includes(b.id);
    if (aSelected !== bSelected) return bSelected ? 1 : -1;
    return b.rating - a.rating;
  });

  const closeAddRestrictionModal = useCallback(() => {
    setAddRestrictionModalVisible(false);
    setSelectedPlayer1(null);
    setRestrictionStep(1);
    setRestrictionType('apart');
    setTimeout(() => setRestrictionsModalVisible(true), 300);
  }, []);

  const handleAddRestriction = useCallback((player2Id: string) => {
    if (selectedPlayer1) {
      addRestriction(selectedPlayer1, player2Id, restrictionType);
      closeAddRestrictionModal();
    }
  }, [selectedPlayer1, addRestriction, restrictionType, closeAddRestrictionModal]);

  const handleRemoveRestriction = useCallback((restriction: Restriction) => {
    const player1 = getPlayerById(restriction.player1Id);
    const player2 = getPlayerById(restriction.player2Id);
    const ruleLabel = restriction.type === 'together' ? 'same team rule' : 'split apart rule';
    Alert.alert(
      'Remove Rule',
      `Remove the ${ruleLabel} for ${player1?.name} and ${player2?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', onPress: () => removeRestriction(restriction.id) },
      ]
    );
  }, [getPlayerById, removeRestriction]);

  const openAddRestriction = useCallback(() => {
    setSelectedPlayer1(null);
    setRestrictionStep(1);
    setRestrictionType('apart');
    setRestrictionsModalVisible(false);
    setTimeout(() => setAddRestrictionModalVisible(true), 300);
  }, []);

  const selectRestrictionPlayer1 = useCallback((playerId: string) => {
    setSelectedPlayer1(playerId);
    setRestrictionStep(2);
  }, []);

  const getAvailablePlayersForRestriction = useCallback((excludeId: string) => {
    return players.filter(p => {
      if (p.id === excludeId) return false;
      return !restrictions.some(
        r => (r.player1Id === excludeId && r.player2Id === p.id) ||
             (r.player1Id === p.id && r.player2Id === excludeId)
      );
    });
  }, [players, restrictions]);

  const renderPlayer = useCallback(({ item }: { item: Player }) => {
    const isSelected = selectedPlayerIds.includes(item.id);
    const appearances = getPlayerAppearances(item.id);
    return (
      <Pressable 
        style={[styles.playerRow, isSelected && styles.playerRowSelected]}
        onPress={() => togglePlayerSelection(item.id)}
        testID={`player-row-${item.id}`}
      >
        <View style={styles.playerInfo}>
          <PlayerCard player={item} size="small" />
          <View style={styles.playerDetails}>
            <Text style={styles.playerName}>{item.name}</Text>
            <Text style={styles.playerPosition}>{item.position} • {item.rating} OVR</Text>
            {appearances > 0 && (
              <Text style={styles.playerApps}>{appearances} app{appearances !== 1 ? 's' : ''}</Text>
            )}
          </View>
        </View>
        <View style={styles.checkContainer}>
          {isSelected ? (
            <CheckCircle size={28} color={Colors.success} />
          ) : (
            <Circle size={28} color={Colors.textMuted} />
          )}
        </View>
      </Pressable>
    );
  }, [selectedPlayerIds, togglePlayerSelection, getPlayerAppearances]);

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Users size={64} color={Colors.textMuted} />
      <Text style={styles.emptyTitle}>No Players in Squad</Text>
      <Text style={styles.emptyText}>
        Add players to your squad first
      </Text>
    </View>
  );

  const renderRestrictionItem = useCallback(({ item }: { item: Restriction }) => {
    const player1 = getPlayerById(item.player1Id);
    const player2 = getPlayerById(item.player2Id);
    if (!player1 || !player2) return null;
    const isTogether = item.type === 'together';
    return (
      <Pressable 
        style={[styles.restrictionCard, isTogether && styles.restrictionCardTogether]}
        onPress={() => handleRemoveRestriction(item)}
      >
        <View style={styles.restrictionTypePill}>
          {isTogether ? (
            <Link2 size={12} color={Colors.success} />
          ) : (
            <Ban size={12} color={Colors.danger} />
          )}
          <Text style={[styles.restrictionTypeLabel, isTogether && styles.restrictionTypeLabelTogether]}>
            {isTogether ? 'Same Team' : 'Split Apart'}
          </Text>
        </View>
        <View style={styles.restrictionPlayers}>
          <View style={styles.restrictionPlayer}>
            <PlayerCard player={player1} size="small" />
            <Text style={styles.restrictionName} numberOfLines={1}>{player1.name}</Text>
          </View>
          <View style={[styles.restrictionIcon, isTogether && styles.restrictionIconTogether]}>
            {isTogether ? (
              <Link2 size={20} color={Colors.success} />
            ) : (
              <Ban size={20} color={Colors.danger} />
            )}
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

  const renderPlayerSelection = useCallback(({ item }: { item: Player }) => (
    <Pressable 
      style={styles.playerSelectRow}
      onPress={() => restrictionStep === 1 ? selectRestrictionPlayer1(item.id) : handleAddRestriction(item.id)}
    >
      <PlayerCard player={item} size="small" />
      <View style={styles.playerSelectInfo}>
        <Text style={styles.playerSelectName}>{item.name}</Text>
        <Text style={styles.playerSelectPosition}>{item.position} • {item.rating} OVR</Text>
      </View>
    </Pressable>
  ), [restrictionStep, selectRestrictionPlayer1, handleAddRestriction]);

  const bannerTranslateY = bannerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-80, 0],
  });

  const step1Players = players;
  const step2Players = selectedPlayer1 ? getAvailablePlayersForRestriction(selectedPlayer1) : [];
  const listData = restrictionStep === 1 ? step1Players : step2Players;

  const addModalTitle = restrictionStep === 1
    ? 'Select First Player'
    : restrictionType === 'together'
      ? `Who must ${getPlayerById(selectedPlayer1 ?? '')?.name ?? ''} play WITH?`
      : `Who can't ${getPlayerById(selectedPlayer1 ?? '')?.name ?? ''} play WITH?`;

  return (
    <View style={styles.container}>
      <FlatList
        data={sortedPlayers}
        renderItem={renderPlayer}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, players.length > 0 && { paddingTop: 80 }]}
        ListEmptyComponent={renderEmpty}
      />

      {players.length > 0 && (
        <View style={styles.floatingCounter}>
          <View style={styles.counterLeft}>
            <View style={[styles.counterBadge, selectedPlayerIds.length === maxPlayers && styles.counterBadgeFull]}>
              <Text style={styles.counterNumber}>{selectedPlayerIds.length}</Text>
            </View>
            <View style={styles.counterInfo}>
              <Text style={styles.counterLabel}>{selectedPlayerIds.length}/{maxPlayers} Selected</Text>
              <Text style={styles.counterSub}>
                {selectedPlayerIds.length < maxPlayers 
                  ? `${maxPlayers - selectedPlayerIds.length} more needed` 
                  : `${halfCount}v${selectedPlayerIds.length - halfCount}`}
              </Text>
            </View>
          </View>
          <View style={styles.quickActions}>
            <Pressable style={styles.restrictionsQuickBtn} onPress={() => setRestrictionsModalVisible(true)}>
              <Ban size={16} color={restrictions.length > 0 ? Colors.danger : Colors.textMuted} />
              {restrictions.length > 0 && (
                <View style={styles.restrictionBadge}>
                  <Text style={styles.restrictionBadgeText}>{restrictions.length}</Text>
                </View>
              )}
            </Pressable>
            <Pressable style={styles.quickButton} onPress={selectAllPlayers}>
              <Text style={styles.quickButtonText}>All</Text>
            </Pressable>
            <Pressable style={styles.quickButton} onPress={clearSelection}>
              <Text style={styles.quickButtonText}>Clear</Text>
            </Pressable>
          </View>
        </View>
      )}

      {restrictionBannerShown && (
        <Animated.View style={[
          styles.restrictionBanner,
          { transform: [{ translateY: bannerTranslateY }], opacity: bannerAnim },
        ]}>
          <Pressable style={styles.restrictionBannerContent} onPress={() => setRestrictionsModalVisible(true)}>
            <AlertTriangle size={18} color={Colors.warning} />
            <Text style={styles.restrictionBannerText}>
              {restrictions.length} rule{restrictions.length !== 1 ? 's' : ''} active — review before generating teams
            </Text>
          </Pressable>
        </Animated.View>
      )}

      {selectedPlayerIds.length >= 4 && (
        <View style={styles.bottomActions}>
          <Pressable style={styles.manualButton} onPress={handleManualTeams}>
            <Edit3 size={20} color={Colors.gold} />
            <Text style={styles.manualButtonText}>Manual</Text>
          </Pressable>
          <Pressable style={styles.generateButton} onPress={handleGenerateTeams}>
            <Shuffle size={22} color={Colors.background} />
            <Text style={styles.generateButtonText}>Generate Teams</Text>
          </Pressable>
        </View>
      )}

      <Modal
        visible={restrictionsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setRestrictionsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Team Rules</Text>
              <View style={styles.modalHeaderRight}>
                {players.length >= 2 && (
                  <Pressable style={styles.addRestrictionBtn} onPress={openAddRestriction}>
                    <Plus size={18} color={Colors.gold} />
                    <Text style={styles.addRestrictionText}>Add</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => setRestrictionsModalVisible(false)} style={styles.closeButton}>
                  <X size={24} color={Colors.text} />
                </Pressable>
              </View>
            </View>

            <View style={styles.ruleTypeLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
                  <Ban size={12} color={Colors.danger} />
                </View>
                <Text style={styles.legendText}>Split Apart — must be on opposite teams</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: 'rgba(34,197,94,0.15)' }]}>
                  <Link2 size={12} color={Colors.success} />
                </View>
                <Text style={styles.legendText}>Same Team — must play together</Text>
              </View>
            </View>

            {restrictions.length === 0 ? (
              <View style={styles.emptyRestrictions}>
                <UserX size={48} color={Colors.textMuted} />
                <Text style={styles.emptyRestrictionsTitle}>No Rules Set</Text>
                <Text style={styles.emptyRestrictionsText}>
                  Tap "Add" to create a rule
                </Text>
              </View>
            ) : (
              <FlatList
                data={restrictions}
                renderItem={renderRestrictionItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.restrictionsList}
              />
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={addRestrictionModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeAddRestrictionModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>{addModalTitle}</Text>
              <Pressable onPress={closeAddRestrictionModal} style={styles.closeButton}>
                <X size={24} color={Colors.text} />
              </Pressable>
            </View>

            {restrictionStep === 1 && (
              <View style={styles.typeSelector}>
                <Text style={styles.typeSelectorLabel}>Rule type:</Text>
                <View style={styles.typeToggleRow}>
                  <Pressable
                    style={[styles.typeToggleBtn, restrictionType === 'apart' && styles.typeToggleBtnActiveApart]}
                    onPress={() => setRestrictionType('apart')}
                  >
                    <Ban size={16} color={restrictionType === 'apart' ? Colors.danger : Colors.textMuted} />
                    <Text style={[styles.typeToggleText, restrictionType === 'apart' && styles.typeToggleTextActiveApart]}>
                      Split Apart
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.typeToggleBtn, restrictionType === 'together' && styles.typeToggleBtnActiveTogether]}
                    onPress={() => setRestrictionType('together')}
                  >
                    <Link2 size={16} color={restrictionType === 'together' ? Colors.success : Colors.textMuted} />
                    <Text style={[styles.typeToggleText, restrictionType === 'together' && styles.typeToggleTextActiveTogether]}>
                      Same Team
                    </Text>
                  </Pressable>
                </View>
                <Text style={styles.typeHint}>
                  {restrictionType === 'apart'
                    ? 'These two players will never be on the same team.'
                    : 'These two players will always be on the same team.'}
                </Text>
              </View>
            )}

            {restrictionStep === 2 && selectedPlayer1 && (
              <View style={styles.selectedInfo}>
                <View style={[styles.selectedPill, restrictionType === 'together' && styles.selectedPillTogether]}>
                  {restrictionType === 'together' ? (
                    <Link2 size={14} color={Colors.success} />
                  ) : (
                    <Ban size={14} color={Colors.danger} />
                  )}
                  <Text style={[styles.selectedText, restrictionType === 'together' && styles.selectedTextTogether]}>
                    {getPlayerById(selectedPlayer1)?.name}
                  </Text>
                </View>
                <Text style={styles.selectedSubText}>
                  {restrictionType === 'together' ? 'must always play with:' : "can't play with:"}
                </Text>
              </View>
            )}

            <FlatList
              data={listData}
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
  floatingCounter: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 100,
  },
  counterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  counterBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBadgeFull: {
    backgroundColor: Colors.success,
  },
  counterNumber: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: Colors.background,
  },
  counterInfo: {
    gap: 2,
  },
  counterLabel: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  counterSub: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  restrictionsQuickBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    position: 'relative',
  },
  restrictionBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restrictionBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700' as const,
  },
  quickButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  quickButtonText: {
    color: Colors.gold,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  listContent: {
    padding: 16,
    paddingBottom: 120,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  playerRowSelected: {
    borderColor: Colors.success,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  playerDetails: {
    marginLeft: 12,
    flex: 1,
  },
  playerName: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  playerPosition: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  playerApps: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  checkContainer: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
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
  },
  restrictionBanner: {
    position: 'absolute',
    top: 76,
    left: 12,
    right: 12,
    zIndex: 99,
  },
  restrictionBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  restrictionBannerText: {
    flex: 1,
    color: Colors.text,
    fontSize: 13,
    fontWeight: '500' as const,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 10,
  },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cardBackground,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  manualButtonText: {
    color: Colors.gold,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  generateButton: {
    flex: 1,
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
  generateButtonText: {
    color: Colors.background,
    fontSize: 17,
    fontWeight: '700' as const,
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
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  modalHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  closeButton: {
    padding: 4,
  },
  addRestrictionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  addRestrictionText: {
    color: Colors.gold,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  ruleTypeLegend: {
    marginHorizontal: 16,
    marginTop: 12,
    gap: 8,
    paddingBottom: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendText: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  emptyRestrictions: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyRestrictionsTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 12,
  },
  emptyRestrictionsText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  restrictionsList: {
    padding: 16,
    paddingBottom: 40,
  },
  restrictionCard: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  restrictionCardTogether: {
    borderColor: 'rgba(34, 197, 94, 0.3)',
    backgroundColor: 'rgba(34, 197, 94, 0.04)',
  },
  restrictionTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(239,68,68,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    marginBottom: 10,
  },
  restrictionTypeLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.danger,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  restrictionTypeLabelTogether: {
    color: Colors.success,
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
    fontSize: 11,
    fontWeight: '600' as const,
    marginTop: 6,
    textAlign: 'center',
  },
  restrictionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restrictionIconTogether: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  restrictionHint: {
    color: Colors.textMuted,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 8,
  },
  typeSelector: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  typeSelectorLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500' as const,
    marginBottom: 10,
  },
  typeToggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.background,
  },
  typeToggleBtnActiveApart: {
    borderColor: Colors.danger,
    backgroundColor: 'rgba(239,68,68,0.08)',
  },
  typeToggleBtnActiveTogether: {
    borderColor: Colors.success,
    backgroundColor: 'rgba(34,197,94,0.08)',
  },
  typeToggleText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  typeToggleTextActiveApart: {
    color: Colors.danger,
  },
  typeToggleTextActiveTogether: {
    color: Colors.success,
  },
  typeHint: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 10,
    fontStyle: 'italic' as const,
  },
  selectedInfo: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  selectedPillTogether: {
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderColor: 'rgba(34,197,94,0.3)',
  },
  selectedText: {
    color: Colors.danger,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  selectedTextTogether: {
    color: Colors.success,
  },
  selectedSubText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  modalList: {
    padding: 16,
    paddingBottom: 40,
  },
  playerSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
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
