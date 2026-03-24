import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { Trophy, Star, TrendingUp, Users, Award, Activity } from 'lucide-react-native';
import { useTNF } from '@/context/TNFContext';
import PlayerAvatar from '@/components/PlayerAvatar';
import Colors from '@/constants/colors';

type Tab = 'appearances' | 'wins' | 'motm';

export default function StatsScreen() {
  const {
    players,
    matchHistory,
    getPlayerAppearances,
    getPlayerWins,
    getPlayerDraws,
    getPlayerLosses,
    getPlayerMotmCount,
    getPlayerWinPercentage,
  } = useTNF();

  const [activeTab, setActiveTab] = useState<Tab>('appearances');

  const totalMatches = matchHistory.length;
  const totalGoals = useMemo(
    () => matchHistory.reduce((s, m) => s + m.scoreA + m.scoreB, 0),
    [matchHistory]
  );
  const teamAWins = matchHistory.filter(m => m.scoreA > m.scoreB).length;
  const teamBWins = matchHistory.filter(m => m.scoreB > m.scoreA).length;
  const draws = matchHistory.filter(m => m.scoreA === m.scoreB).length;
  const avgGoalsPerGame = totalMatches > 0 ? (totalGoals / totalMatches).toFixed(1) : '0.0';

  const playerStats = useMemo(() => {
    const seenIds = new Set<string>();
    const allMatchPlayers: { id: string; name: string; position: string }[] = [];

    matchHistory.forEach(m => {
      [...m.teamA.players, ...m.teamB.players].forEach(p => {
        if (!seenIds.has(p.id)) {
          seenIds.add(p.id);
          allMatchPlayers.push({ id: p.id, name: p.name, position: p.position });
        }
      });
    });

    return allMatchPlayers.map(mp => {
      const registered = players.find(p => p.id === mp.id);
      const playerRef = registered ?? { id: mp.id, name: mp.name, position: mp.position, rating: 0, createdAt: 0 };
    return {
        player: playerRef,
        photo: registered?.photo,
        appearances: getPlayerAppearances(mp.id),
        wins: getPlayerWins(mp.id),
        draws: getPlayerDraws(mp.id),
        losses: getPlayerLosses(mp.id),
        winPct: getPlayerWinPercentage(mp.id),
        motm: getPlayerMotmCount(mp.id),
      };
    });
  }, [players, matchHistory]);

  const appearanceLeaders = useMemo(
    () => [...playerStats].sort((a, b) => b.appearances - a.appearances),
    [playerStats]
  );

  const winLeaders = useMemo(
    () => [...playerStats]
      .filter(s => s.appearances >= 1)
      .sort((a, b) => b.winPct - a.winPct || b.wins - a.wins),
    [playerStats]
  );

  const motmLeaders = useMemo(
    () => [...playerStats]
      .filter(s => s.appearances >= 1)
      .sort((a, b) => b.motm - a.motm || b.appearances - a.appearances),
    [playerStats]
  );

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'appearances', label: 'Appearances', icon: <Activity size={14} color={activeTab === 'appearances' ? Colors.background : Colors.textMuted} /> },
    { key: 'wins', label: 'Win Rate', icon: <TrendingUp size={14} color={activeTab === 'wins' ? Colors.background : Colors.textMuted} /> },
    { key: 'motm', label: 'POTM', icon: <Star size={14} color={activeTab === 'motm' ? Colors.background : Colors.textMuted} /> },
  ];

  const currentList = activeTab === 'appearances' ? appearanceLeaders : activeTab === 'wins' ? winLeaders : motmLeaders;

  const getMedalColor = (index: number) => {
    if (index === 0) return Colors.gold;
    if (index === 1) return Colors.silver;
    if (index === 2) return Colors.bronze;
    return Colors.textMuted;
  };

  const renderRow = (item: typeof appearanceLeaders[0], index: number) => {
    const medalColor = getMedalColor(index);
    const isTop3 = index < 3;

    return (
      <View key={item.player.id} style={[styles.leaderRow, isTop3 && styles.leaderRowTop]}>
        <View style={[styles.rankBadge, isTop3 && { backgroundColor: medalColor + '20' }]}>
          <Text style={[styles.rankText, { color: medalColor }]}>
            {index + 1}
          </Text>
        </View>

        <PlayerAvatar
          name={item.player.name}
          photoUrl={item.photo}
          size={32}
        />

        <View style={styles.playerInfo}>
          <Text style={styles.playerName}>{item.player.name}</Text>
          <Text style={styles.playerPos}>{item.player.position}</Text>
        </View>

        <View style={styles.statDetails}>
          {activeTab === 'appearances' && (
            <>
              <View style={styles.statChip}>
                <Text style={[styles.statChipValue, { color: Colors.gold }]}>{item.appearances}</Text>
                <Text style={styles.statChipLabel}>Apps</Text>
              </View>
              <View style={styles.statChip}>
                <Text style={[styles.statChipValue, { color: Colors.success }]}>{item.wins}</Text>
                <Text style={styles.statChipLabel}>W</Text>
              </View>
              <View style={styles.statChip}>
                <Text style={[styles.statChipValue, { color: Colors.warning }]}>{item.draws}</Text>
                <Text style={styles.statChipLabel}>D</Text>
              </View>
              <View style={styles.statChip}>
                <Text style={[styles.statChipValue, { color: Colors.danger }]}>{item.losses}</Text>
                <Text style={styles.statChipLabel}>L</Text>
              </View>
            </>
          )}
          {activeTab === 'wins' && (
            <>
              <View style={styles.statChip}>
                <Text style={[styles.statChipValue, { color: Colors.gold }]}>{item.winPct}%</Text>
                <Text style={styles.statChipLabel}>Win%</Text>
              </View>
              <View style={styles.statChip}>
                <Text style={[styles.statChipValue, { color: Colors.text }]}>{item.appearances}</Text>
                <Text style={styles.statChipLabel}>Apps</Text>
              </View>
              <View style={styles.statChip}>
                <Text style={[styles.statChipValue, { color: Colors.success }]}>{item.wins}</Text>
                <Text style={styles.statChipLabel}>Wins</Text>
              </View>
            </>
          )}
          {activeTab === 'motm' && (
            <>
              <View style={styles.statChip}>
                <Text style={[styles.statChipValue, { color: Colors.gold }]}>{item.motm}</Text>
                <Text style={styles.statChipLabel}>POTM</Text>
              </View>
              <View style={styles.statChip}>
                <Text style={[styles.statChipValue, { color: Colors.text }]}>{item.appearances}</Text>
                <Text style={styles.statChipLabel}>Apps</Text>
              </View>
              <View style={styles.statChip}>
                <Text style={[styles.statChipValue, { color: Colors.accent }]}>
                  {item.appearances > 0 ? Math.round((item.motm / item.appearances) * 100) : 0}%
                </Text>
                <Text style={styles.statChipLabel}>Rate</Text>
              </View>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.overviewGrid}>
        <View style={[styles.overviewCard, styles.overviewCardWide]}>
          <Trophy size={20} color={Colors.gold} />
          <Text style={styles.overviewValue}>{totalMatches}</Text>
          <Text style={styles.overviewLabel}>Total Matches</Text>
        </View>
        <View style={styles.overviewCard}>
          <Activity size={20} color={Colors.accent} />
          <Text style={styles.overviewValue}>{avgGoalsPerGame}</Text>
          <Text style={styles.overviewLabel}>Avg Score</Text>
        </View>
        <View style={styles.overviewCard}>
          <Users size={20} color={Colors.teamA} />
          <Text style={[styles.overviewValue, { color: Colors.teamA }]}>{teamAWins}</Text>
          <Text style={styles.overviewLabel}>Team A Wins</Text>
        </View>
        <View style={styles.overviewCard}>
          <Users size={20} color={Colors.teamB} />
          <Text style={[styles.overviewValue, { color: Colors.teamB }]}>{teamBWins}</Text>
          <Text style={styles.overviewLabel}>Team B Wins</Text>
        </View>
        <View style={styles.overviewCard}>
          <Award size={20} color={Colors.warning} />
          <Text style={[styles.overviewValue, { color: Colors.warning }]}>{draws}</Text>
          <Text style={styles.overviewLabel}>Draws</Text>
        </View>
      </View>

      {totalMatches > 0 && (
        <View style={styles.winBarContainer}>
          <Text style={styles.winBarLabel}>Team A vs Team B</Text>
          <View style={styles.winBar}>
            {teamAWins > 0 && (
              <View style={[styles.winBarA, { flex: teamAWins }]}>
                <Text style={styles.winBarText}>{teamAWins}W</Text>
              </View>
            )}
            {draws > 0 && (
              <View style={[styles.winBarD, { flex: draws }]}>
                <Text style={styles.winBarText}>{draws}D</Text>
              </View>
            )}
            {teamBWins > 0 && (
              <View style={[styles.winBarB, { flex: teamBWins }]}>
                <Text style={styles.winBarText}>{teamBWins}W</Text>
              </View>
            )}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Player Leaderboard</Text>

        <View style={styles.tabBar}>
          {tabs.map(tab => (
            <Pressable
              key={tab.key}
              style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              {tab.icon}
              <Text style={[styles.tabBtnText, activeTab === tab.key && styles.tabBtnTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>



        {currentList.length === 0 ? (
          <View style={styles.emptyLeader}>
            <Trophy size={40} color={Colors.textMuted} />
            <Text style={styles.emptyLeaderText}>
              {activeTab === 'motm' ? 'No POTM awards yet' : 'No data yet — play some matches!'}
            </Text>
          </View>
        ) : (
          <View style={styles.leaderList}>
            {currentList.map((item, index) => renderRow(item, index))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  overviewCard: {
    flex: 1,
    minWidth: '28%',
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 4,
  },
  overviewCardWide: {
    minWidth: '45%',
  },
  overviewValue: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  overviewLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  winBarContainer: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  winBarLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 10,
    textAlign: 'center',
  },
  winBar: {
    flexDirection: 'row',
    height: 34,
    borderRadius: 10,
    overflow: 'hidden',
  },
  winBarA: {
    backgroundColor: Colors.teamA,
    alignItems: 'center',
    justifyContent: 'center',
  },
  winBarD: {
    backgroundColor: Colors.warning,
    alignItems: 'center',
    justifyContent: 'center',
  },
  winBarB: {
    backgroundColor: Colors.teamB,
    alignItems: 'center',
    justifyContent: 'center',
  },
  winBarText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#fff',
  },
  section: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 14,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
    gap: 3,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: Colors.gold,
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textMuted,
  },
  tabBtnTextActive: {
    color: Colors.background,
  },
  minGamesNote: {
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: 'italic' as const,
    marginBottom: 10,
    textAlign: 'center',
  },
  leaderList: {
    gap: 8,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  leaderRowTop: {
    borderColor: 'transparent',
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cardBorder,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: Colors.textMuted,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  playerPos: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  statDetails: {
    flexDirection: 'row',
    gap: 6,
  },
  statChip: {
    alignItems: 'center',
    minWidth: 28,
  },
  statChipValue: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  statChipLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: '500' as const,
    marginTop: 1,
  },
  emptyLeader: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 10,
  },
  emptyLeaderText: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
