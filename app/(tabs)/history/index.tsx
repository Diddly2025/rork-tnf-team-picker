import React, { useCallback, useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Pressable,
  Alert,
  Share,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Clock, Trash2, Download, Trophy, Plus, Star, Pencil, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTNF } from '@/context/TNFContext';
import { useGroup } from '@/context/GroupContext';
import { SPORT_CONFIGS, getSportLabel } from '@/constants/sports';
import { MatchResult } from '@/types';
import Colors from '@/constants/colors';

export default function HistoryScreen() {
  const router = useRouter();
  const { matchHistory, deleteMatchResult, getExportData, players } = useTNF();
  const { groups, activeGroupId, setActiveGroup } = useGroup();
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const handleSwitchGroup = useCallback((groupId: string) => {
    setActiveGroup(groupId);
    console.log('[History] Switched to group:', groupId);
  }, [setActiveGroup]);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  const handleDelete = useCallback((match: MatchResult) => {
    Alert.alert(
      'Delete Match',
      `Remove the match from ${match.date}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteMatchResult(match.id) },
      ]
    );
  }, [deleteMatchResult]);

  const handleEdit = useCallback((match: MatchResult) => {
    router.push({ pathname: '/edit-result', params: { id: match.id } } as any);
  }, [router]);

  const handleExport = useCallback(async () => {
    const data = getExportData();
    if (Platform.OS === 'web') {
      try {
        const blob = new Blob([data], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tnf-data.txt';
        a.click();
        URL.revokeObjectURL(url);
      } catch {
        Alert.alert('Export', data);
      }
    } else {
      try {
        await Share.share({ message: data, title: 'TNF Data Export' });
      } catch {
        console.log('Export cancelled');
      }
    }
  }, [getExportData]);

  const getResultColor = (match: MatchResult) => {
    if (match.scoreA > match.scoreB) return Colors.teamA;
    if (match.scoreB > match.scoreA) return Colors.teamB;
    return Colors.warning;
  };

  const getResultLabel = (match: MatchResult) => {
    if (match.scoreA > match.scoreB) return 'Team A Won';
    if (match.scoreB > match.scoreA) return 'Team B Won';
    return 'Draw';
  };

  const getMotmName = useCallback((manOfMatchId?: string) => {
    if (!manOfMatchId) return null;
    const player = players.find(p => p.id === manOfMatchId);
    return player?.name ?? null;
  }, [players]);

  const activeGroup = useMemo(() => groups.find(g => g.id === activeGroupId) ?? null, [groups, activeGroupId]);

  const renderMatch = useCallback(({ item }: { item: MatchResult }) => {
    const motmName = getMotmName(item.manOfMatchId);
    const isExpanded = expandedIds.includes(item.id);
    const teamAAll = item.teamA.players;
    const teamBAll = item.teamB.players;
    const hasMore = teamAAll.length > 4 || teamBAll.length > 4;

    return (
      <View style={styles.matchCard}>
        <View style={styles.matchHeader}>
          <View style={styles.dateRow}>
            <Clock size={14} color={Colors.textMuted} />
            <Text style={styles.dateText}>{item.date}</Text>
            {item.isManualTeams && (
              <View style={styles.manualBadge}>
                <Text style={styles.manualBadgeText}>Manual</Text>
              </View>
            )}
          </View>
          <View style={styles.headerActions}>
            <Pressable onPress={() => handleEdit(item)} hitSlop={8} style={styles.actionBtn}>
              <Pencil size={15} color={Colors.textSecondary} />
            </Pressable>
            <Pressable onPress={() => handleDelete(item)} hitSlop={8} style={styles.actionBtn}>
              <Trash2 size={15} color={Colors.textMuted} />
            </Pressable>
          </View>
        </View>

        <View style={styles.scoreRow}>
          <View style={styles.teamSide}>
            <Text style={[styles.teamName, { color: Colors.teamA }]}>TEAM A</Text>
            <View style={styles.teamPlayers}>
              {(isExpanded ? teamAAll : teamAAll.slice(0, 4)).map(p => (
                <Text key={p.id} style={styles.playerName} numberOfLines={1}>{p.name}</Text>
              ))}
              {!isExpanded && teamAAll.length > 4 && (
                <Text style={styles.moreText}>+{teamAAll.length - 4} more</Text>
              )}
            </View>
          </View>

          <View style={styles.scoreMid}>
            <View style={styles.scoreBox}>
              <Text style={styles.scoreText}>{item.scoreA}</Text>
              <Text style={styles.scoreDash}>-</Text>
              <Text style={styles.scoreText}>{item.scoreB}</Text>
            </View>
            <View style={[styles.resultBadge, { backgroundColor: getResultColor(item) + '20' }]}>
              <Text style={[styles.resultText, { color: getResultColor(item) }]}>
                {getResultLabel(item)}
              </Text>
            </View>
          </View>

          <View style={[styles.teamSide, styles.teamSideRight]}>
            <Text style={[styles.teamName, { color: Colors.teamB }]}>TEAM B</Text>
            <View style={styles.teamPlayers}>
              {(isExpanded ? teamBAll : teamBAll.slice(0, 4)).map(p => (
                <Text key={p.id} style={[styles.playerName, styles.playerNameRight]} numberOfLines={1}>{p.name}</Text>
              ))}
              {!isExpanded && teamBAll.length > 4 && (
                <Text style={[styles.moreText, styles.playerNameRight]}>+{teamBAll.length - 4} more</Text>
              )}
            </View>
          </View>
        </View>

        {hasMore && (
          <Pressable style={styles.expandBtn} onPress={() => toggleExpanded(item.id)}>
            {isExpanded
              ? <ChevronUp size={14} color={Colors.textMuted} />
              : <ChevronDown size={14} color={Colors.textMuted} />
            }
            <Text style={styles.expandText}>
              {isExpanded ? 'Show less' : `Show all players`}
            </Text>
          </Pressable>
        )}

        {motmName && (
          <View style={styles.motmRow}>
            <Star size={12} color={Colors.gold} fill={Colors.gold} />
            <Text style={styles.motmText}>{motmName}</Text>
            <Text style={styles.motmLabel}>POTM</Text>
          </View>
        )}
      </View>
    );
  }, [handleDelete, handleEdit, getMotmName, expandedIds, toggleExpanded]);

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Trophy size={64} color={Colors.textMuted} />
      <Text style={styles.emptyTitle}>No Matches Played</Text>
      <Text style={styles.emptyText}>
        {activeGroup ? `No results recorded for ${activeGroup.name}` : 'Generate or create teams, then record the match result'}
      </Text>
      <Pressable
        style={styles.emptyAddButton}
        onPress={() => router.push('/add-historical-result' as any)}
      >
        <Plus size={18} color={Colors.gold} />
        <Text style={styles.emptyAddButtonText}>Add Past Result</Text>
      </Pressable>
    </View>
  );

  const totalMatches = matchHistory.length;
  const draws = matchHistory.filter(m => m.scoreA === m.scoreB).length;
  const teamAWins = matchHistory.filter(m => m.scoreA > m.scoreB).length;
  const teamBWins = matchHistory.filter(m => m.scoreB > m.scoreA).length;

  return (
    <View style={styles.container}>
      {groups.length > 1 && (
        <View style={styles.filterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {groups.map((g) => {
              const config = SPORT_CONFIGS[g.sport];
              const isActive = g.id === activeGroupId;
              return (
                <Pressable
                  key={g.id}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => handleSwitchGroup(g.id)}
                  testID={`history-filter-${g.id}`}
                >
                  <Text style={styles.filterChipEmoji}>{config.emoji}</Text>
                  <Text
                    style={[styles.filterChipText, isActive && styles.filterChipTextActive]}
                    numberOfLines={1}
                  >
                    {g.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {groups.length <= 1 && activeGroup && (
        <View style={styles.singleGroupBanner}>
          {SPORT_CONFIGS[activeGroup.sport] && (
            <Text style={styles.singleGroupEmoji}>{SPORT_CONFIGS[activeGroup.sport].emoji}</Text>
          )}
          <View>
            <Text style={styles.singleGroupName}>{activeGroup.name}</Text>
            <Text style={styles.singleGroupSport}>
              {getSportLabel(activeGroup.sport, activeGroup.customSport)}
            </Text>
          </View>
        </View>
      )}

      {matchHistory.length > 0 && (
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{totalMatches}</Text>
            <Text style={styles.summaryLabel}>Played</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: Colors.teamA }]}>{teamAWins}</Text>
            <Text style={styles.summaryLabel}>A Wins</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: Colors.warning }]}>{draws}</Text>
            <Text style={styles.summaryLabel}>Draws</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: Colors.teamB }]}>{teamBWins}</Text>
            <Text style={styles.summaryLabel}>B Wins</Text>
          </View>
        </View>
      )}

      <FlatList
        data={matchHistory}
        renderItem={renderMatch}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
      />

      {matchHistory.length > 0 && (
        <View style={styles.fabRow}>
          <Pressable style={styles.addHistoryFab} onPress={() => router.push('/add-historical-result' as any)}>
            <Plus size={20} color={Colors.background} />
            <Text style={styles.addHistoryFabText}>Add Past Result</Text>
          </Pressable>
          <Pressable style={styles.exportFab} onPress={handleExport}>
            <Download size={22} color={Colors.background} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  filterSection: {
    paddingTop: 12,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
    backgroundColor: Colors.cardBackground,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
  },
  filterChipActive: {
    backgroundColor: 'rgba(200, 160, 42, 0.12)',
    borderColor: Colors.gold,
  },
  filterChipEmoji: {
    fontSize: 16,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    maxWidth: 120,
  },
  filterChipTextActive: {
    color: Colors.gold,
  },
  singleGroupBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  singleGroupEmoji: {
    fontSize: 20,
  },
  singleGroupName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  singleGroupSport: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: Colors.cardBorder,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.gold,
  },
  summaryLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  matchCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  dateText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  manualBadge: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  manualBadgeText: {
    color: Colors.gold,
    fontSize: 10,
    fontWeight: '600' as const,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: Colors.background,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  teamSide: {
    flex: 1,
  },
  teamSideRight: {
    alignItems: 'flex-end',
  },
  teamName: {
    fontSize: 12,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  teamPlayers: {
    gap: 1,
  },
  playerName: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  playerNameRight: {
    textAlign: 'right',
  },
  moreText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic' as const,
  },
  scoreMid: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  scoreBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scoreText: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  scoreDash: {
    fontSize: 20,
    color: Colors.textMuted,
    fontWeight: '300' as const,
  },
  resultBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
  },
  resultText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 10,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  expandText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500' as const,
  },
  motmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  motmText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.gold,
    flex: 1,
  },
  motmLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 0.5,
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
    paddingHorizontal: 40,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.gold,
  },
  emptyAddButtonText: {
    color: Colors.gold,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  fabRow: {
    position: 'absolute',
    bottom: 20,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addHistoryFab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 28,
    backgroundColor: Colors.text,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  addHistoryFabText: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  exportFab: {
    width: 52,
    height: 52,
    borderRadius: 26,
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
