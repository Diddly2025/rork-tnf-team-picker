import React, { useCallback, useMemo, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter, Stack, RelativePathString } from 'expo-router';
import { ArrowLeft, Check, Minus, LayoutGrid, List } from 'lucide-react-native';
import { useTNF } from '@/context/TNFContext';
import PlayerCard from '@/components/PlayerCard';
import PitchView from '@/components/PitchView';
import { Player, Team } from '@/types';
import Colors from '@/constants/colors';

export default function ManualTeamsScreen() {
  const router = useRouter();
  const { 
    selectedPlayers,
    manualTeamA,
    manualTeamB,
    assignPlayerToManualTeam,
    removePlayerFromManualTeam,
    clearManualTeams,
    buildManualTeamOption,
  } = useTNF();

  const unassignedPlayers = useMemo(() => {
    const assignedIds = new Set([
      ...manualTeamA.map(p => p.id),
      ...manualTeamB.map(p => p.id),
    ]);
    return selectedPlayers.filter(p => !assignedIds.has(p.id));
  }, [selectedPlayers, manualTeamA, manualTeamB]);

  const teamOption = buildManualTeamOption();
  const [viewMode, setViewMode] = useState<'list' | 'pitch'>('list');

  const pitchTeamA: Team = useMemo(() => ({
    id: 'manual-a',
    players: manualTeamA,
    totalRating: manualTeamA.reduce((s, p) => s + p.rating, 0),
    averageRating: manualTeamA.length > 0 ? Math.round((manualTeamA.reduce((s, p) => s + p.rating, 0) / manualTeamA.length) * 10) / 10 : 0,
  }), [manualTeamA]);

  const pitchTeamB: Team = useMemo(() => ({
    id: 'manual-b',
    players: manualTeamB,
    totalRating: manualTeamB.reduce((s, p) => s + p.rating, 0),
    averageRating: manualTeamB.length > 0 ? Math.round((manualTeamB.reduce((s, p) => s + p.rating, 0) / manualTeamB.length) * 10) / 10 : 0,
  }), [manualTeamB]);

  const bothTeamsHavePlayers = manualTeamA.length > 0 && manualTeamB.length > 0;

  const handleConfirm = useCallback(() => {
    if (manualTeamA.length === 0 || manualTeamB.length === 0) {
      Alert.alert('Incomplete Teams', 'Both teams need at least one player');
      return;
    }
    if (unassignedPlayers.length > 0) {
      Alert.alert('Unassigned Players', `${unassignedPlayers.length} player(s) still not assigned to a team`);
      return;
    }
    router.replace({ pathname: '/match-result' as RelativePathString, params: { isManual: 'true' } });
  }, [manualTeamA, manualTeamB, unassignedPlayers, router]);

  const totalA = manualTeamA.reduce((s, p) => s + p.rating, 0);
  const totalB = manualTeamB.reduce((s, p) => s + p.rating, 0);
  const avgA = manualTeamA.length > 0 ? Math.round((totalA / manualTeamA.length) * 10) / 10 : 0;
  const avgB = manualTeamB.length > 0 ? Math.round((totalB / manualTeamB.length) * 10) / 10 : 0;

  const renderUnassigned = ({ item }: { item: Player }) => (
    <View style={styles.unassignedRow}>
      <PlayerCard player={item} size="small" />
      <View style={styles.unassignedInfo}>
        <Text style={styles.unassignedName}>{item.name}</Text>
        <Text style={styles.unassignedPos}>{item.position} • {item.rating}</Text>
      </View>
      <View style={styles.assignButtons}>
        <Pressable
          style={[styles.assignBtn, { backgroundColor: 'rgba(59,130,246,0.15)' }]}
          onPress={() => assignPlayerToManualTeam(item, 'A')}
        >
          <Text style={[styles.assignBtnText, { color: Colors.teamA }]}>A</Text>
        </Pressable>
        <Pressable
          style={[styles.assignBtn, { backgroundColor: 'rgba(239,68,68,0.15)' }]}
          onPress={() => assignPlayerToManualTeam(item, 'B')}
        >
          <Text style={[styles.assignBtnText, { color: Colors.teamB }]}>B</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderTeamPlayer = (player: Player) => (
    <View key={player.id} style={styles.teamPlayerRow}>
      <PlayerCard player={player} size="small" />
      <Text style={styles.teamPlayerName} numberOfLines={1}>{player.name}</Text>
      <Pressable
        style={styles.removeBtn}
        onPress={() => removePlayerFromManualTeam(player.id)}
      >
        <Minus size={16} color={Colors.danger} />
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container} testID="manual-teams-screen">
      <Stack.Screen options={{ 
        title: 'Build Teams',
        headerLeft: () => (
          <Pressable onPress={() => { clearManualTeams(); router.back(); }} style={{ padding: 4 }}>
            <ArrowLeft size={24} color={Colors.text} />
          </Pressable>
        ),
        headerRight: () => bothTeamsHavePlayers ? (
          <Pressable
            onPress={() => setViewMode(v => v === 'list' ? 'pitch' : 'list')}
            style={styles.viewToggle}
          >
            {viewMode === 'list' ? (
              <LayoutGrid size={20} color={Colors.gold} />
            ) : (
              <List size={20} color={Colors.gold} />
            )}
          </Pressable>
        ) : null,
      }} />

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {viewMode === 'pitch' && bothTeamsHavePlayers ? (
          <View style={styles.pitchContainer}>
            <PitchView teamA={pitchTeamA} teamB={pitchTeamB} />
            {teamOption && (
              <View style={styles.pitchBadge}>
                <Text style={styles.pitchBadgeText}>±{teamOption.ratingDifference.toFixed(1)}</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.teamsRow}>
            <View style={styles.teamBox}>
              <View style={[styles.teamHeader, { borderBottomColor: Colors.teamA }]}>
                <Text style={[styles.teamTitle, { color: Colors.teamA }]}>TEAM A</Text>
                <Text style={styles.teamCount}>{manualTeamA.length}</Text>
              </View>
              {avgA > 0 && <Text style={styles.teamAvg}>AVG: {avgA}</Text>}
              {manualTeamA.map(renderTeamPlayer)}
              {manualTeamA.length === 0 && (
                <Text style={styles.emptyTeamText}>Assign players below</Text>
              )}
            </View>

            <View style={styles.teamDivider}>
              <Text style={styles.vsText}>VS</Text>
              {teamOption && (
                <Text style={styles.diffText}>±{teamOption.ratingDifference.toFixed(1)}</Text>
              )}
            </View>

            <View style={styles.teamBox}>
              <View style={[styles.teamHeader, { borderBottomColor: Colors.teamB }]}>
                <Text style={[styles.teamTitle, { color: Colors.teamB }]}>TEAM B</Text>
                <Text style={styles.teamCount}>{manualTeamB.length}</Text>
              </View>
              {avgB > 0 && <Text style={styles.teamAvg}>AVG: {avgB}</Text>}
              {manualTeamB.map(renderTeamPlayer)}
              {manualTeamB.length === 0 && (
                <Text style={styles.emptyTeamText}>Assign players below</Text>
              )}
            </View>
          </View>
        )}

        {unassignedPlayers.length > 0 && (
          <View style={styles.unassignedSection}>
            <Text style={styles.sectionTitle}>
              Unassigned ({unassignedPlayers.length})
            </Text>
            {unassignedPlayers.map(player => (
              <View key={player.id}>
                {renderUnassigned({ item: player })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {unassignedPlayers.length === 0 && manualTeamA.length > 0 && manualTeamB.length > 0 && (
        <Pressable style={styles.confirmButton} onPress={handleConfirm}>
          <Check size={22} color={Colors.background} />
          <Text style={styles.confirmText}>Confirm & Record Result</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  teamsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  teamBox: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    marginBottom: 8,
    borderBottomWidth: 2,
  },
  teamTitle: {
    fontSize: 14,
    fontWeight: '800' as const,
  },
  teamCount: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
  },
  teamAvg: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  teamPlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 6,
  },
  teamPlayerName: {
    flex: 1,
    color: Colors.text,
    fontSize: 12,
    fontWeight: '500' as const,
  },
  removeBtn: {
    padding: 4,
  },
  emptyTeamText: {
    color: Colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 16,
  },
  teamDivider: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
  },
  vsText: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: Colors.gold,
  },
  diffText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  unassignedSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  unassignedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  unassignedInfo: {
    flex: 1,
    marginLeft: 10,
  },
  unassignedName: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  unassignedPos: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  assignButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  assignBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignBtnText: {
    fontSize: 16,
    fontWeight: '800' as const,
  },
  confirmButton: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
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
  confirmText: {
    color: Colors.background,
    fontSize: 17,
    fontWeight: '700' as const,
  },
  viewToggle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  pitchContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  pitchBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pitchBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700' as const,
  },
});
