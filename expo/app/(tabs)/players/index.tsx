import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Pressable, 
  Alert,
  RefreshControl,
} from 'react-native';
import { Plus, Users, Upload, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTNF } from '@/context/TNFContext';
import { useGroup } from '@/context/GroupContext';
import PlayerCard from '@/components/PlayerCard';
import AddPlayerModal from '@/components/AddPlayerModal';
import ImportPlayersModal from '@/components/ImportPlayersModal';
import { getSportConfig, getSportLabel } from '@/constants/sports';
import { Player } from '@/types';
import Colors from '@/constants/colors';

export default function PlayersScreen() {
  console.log('[Players] Screen rendered');
  const router = useRouter();
  const { activeGroup } = useGroup();
  const { 
    players, addPlayer, bulkAddPlayers, updatePlayer, deletePlayer,
    getPlayerAppearances, getPlayerWins, getPlayerDraws, getPlayerLosses,
    getPlayerMotmCount, getPlayerWinPercentage,
  } = useTNF();
  const [modalVisible, setModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | undefined>();
  const [refreshing, setRefreshing] = useState(false);

  const handleAddPlayer = useCallback((playerData: Omit<Player, 'id' | 'createdAt'>) => {
    if (editingPlayer) {
      updatePlayer(editingPlayer.id, playerData);
    } else {
      addPlayer(playerData);
    }
    setEditingPlayer(undefined);
  }, [editingPlayer, addPlayer, updatePlayer]);

  const handleEditPlayer = useCallback((player: Player) => {
    setEditingPlayer(player);
    setModalVisible(true);
  }, []);

  const handleDeletePlayer = useCallback((player: Player) => {
    Alert.alert(
      'Delete Player',
      `Are you sure you want to remove ${player.name} from the squad?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deletePlayer(player.id),
        },
      ]
    );
  }, [deletePlayer]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  const sortedPlayers = [...players].sort((a, b) => b.rating - a.rating);

  const renderPlayer = useCallback(({ item }: { item: Player }) => {
    const appearances = getPlayerAppearances(item.id);
    const wins = getPlayerWins(item.id);
    const draws = getPlayerDraws(item.id);
    const losses = getPlayerLosses(item.id);
    const winPct = getPlayerWinPercentage(item.id);
    const motm = getPlayerMotmCount(item.id);

    return (
      <View style={styles.cardWrapper}>
        <PlayerCard
          player={item}
          size="large"
          onPress={() => handleEditPlayer(item)}
          onLongPress={() => handleDeletePlayer(item)}
        />
        {appearances > 0 && (
          <View style={styles.statsRow}>
            <Text style={styles.statsText}>{appearances}A</Text>
            <Text style={[styles.statsText, { color: Colors.success }]}>{wins}W</Text>
            <Text style={[styles.statsText, { color: Colors.textMuted }]}>{draws}D</Text>
            <Text style={[styles.statsText, { color: Colors.danger }]}>{losses}L</Text>
            <Text style={[styles.statsText, { color: Colors.accent }]}>{winPct}%</Text>
            {motm > 0 && (
              <Text style={[styles.statsText, { color: Colors.gold }]}>★{motm}</Text>
            )}
          </View>
        )}
      </View>
    );
  }, [handleEditPlayer, handleDeletePlayer, getPlayerAppearances, getPlayerWins, getPlayerDraws, getPlayerLosses, getPlayerWinPercentage, getPlayerMotmCount]);

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Users size={64} color={Colors.textMuted} />
      <Text style={styles.emptyTitle}>No Players Yet</Text>
      <Text style={styles.emptyText}>
        Add players to your squad to get started
      </Text>
      <Pressable 
        style={styles.emptyButton}
        onPress={() => setModalVisible(true)}
      >
        <Plus size={20} color={Colors.background} />
        <Text style={styles.emptyButtonText}>Add First Player</Text>
      </Pressable>
    </View>
  );

  const sportConfig = activeGroup ? getSportConfig(activeGroup.sport) : null;

  return (
    <View style={styles.container} testID="players-screen">
      {activeGroup && (
        <Pressable style={styles.groupBanner} onPress={() => router.push('/manage-groups' as any)}>
          <View style={styles.groupBannerLeft}>
            <Text style={styles.groupEmoji}>{sportConfig?.emoji}</Text>
            <View>
              <Text style={styles.groupBannerName}>{activeGroup.name}</Text>
              <Text style={styles.groupBannerMeta}>
                {getSportLabel(activeGroup.sport, activeGroup.customSport)} · {activeGroup.playersPerTeam}v{activeGroup.playersPerTeam}
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color={Colors.textMuted} />
        </Pressable>
      )}

      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{players.length}</Text>
          <Text style={styles.statLabel}>Players</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {players.length > 0 
              ? Math.round(players.reduce((sum, p) => sum + p.rating, 0) / players.length)
              : 0}
          </Text>
          <Text style={styles.statLabel}>Avg Rating</Text>
        </View>
        <View style={styles.statDivider} />
        <Pressable style={styles.importButton} onPress={() => setImportModalVisible(true)}>
          <Upload size={18} color={Colors.gold} />
          <Text style={styles.importButtonText}>Import</Text>
        </Pressable>
      </View>

      <FlatList
        data={sortedPlayers}
        renderItem={renderPlayer}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.row}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.gold}
          />
        }
      />

      {players.length > 0 && (
        <Pressable 
          style={styles.fab}
          onPress={() => {
            setEditingPlayer(undefined);
            setModalVisible(true);
          }}
        >
          <Plus size={28} color={Colors.background} />
        </Pressable>
      )}

      <AddPlayerModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setEditingPlayer(undefined);
        }}
        onSave={handleAddPlayer}
        editPlayer={editingPlayer}
      />

      <ImportPlayersModal
        visible={importModalVisible}
        onClose={() => setImportModalVisible(false)}
        onImport={bulkAddPlayers}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.cardBorder,
    marginHorizontal: 16,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.gold,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  importButtonText: {
    color: Colors.gold,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  listContent: {
    padding: 12,
    paddingBottom: 100,
  },
  row: {
    justifyContent: 'center',
  },
  cardWrapper: {
    margin: 8,
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  statsText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
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
  groupBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  groupBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  groupEmoji: {
    fontSize: 24,
  },
  groupBannerName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  groupBannerMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
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
});
