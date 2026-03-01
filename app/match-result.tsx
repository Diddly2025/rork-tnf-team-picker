import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack, RelativePathString } from 'expo-router';
import { ArrowLeft, Check, Minus, Plus, Star } from 'lucide-react-native';
import { useTNF } from '@/context/TNFContext';
import { Player } from '@/types';
import Colors from '@/constants/colors';

export default function MatchResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ isManual?: string; teamOptionIndex?: string }>();
  const isManual = params.isManual === 'true';
  const teamOptionIndex = params.teamOptionIndex ? parseInt(params.teamOptionIndex, 10) : 0;

  const { 
    generatedTeams, 
    buildManualTeamOption,
    saveMatchResult,
    clearGeneratedTeams,
    clearManualTeams,
    clearSelection,
  } = useTNF();

  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [manOfMatchId, setManOfMatchId] = useState<string | null>(null);

  const teamOption = isManual 
    ? buildManualTeamOption() 
    : generatedTeams[teamOptionIndex] ?? null;

  const allPlayers: Player[] = teamOption 
    ? [...teamOption.teamA.players, ...teamOption.teamB.players]
    : [];

  const handleSave = useCallback(() => {
    if (!teamOption) {
      Alert.alert('Error', 'No team data available');
      return;
    }

    const allPlayerIds = [
      ...teamOption.teamA.players.map(p => p.id),
      ...teamOption.teamB.players.map(p => p.id),
    ];

    const today = new Date();
    const dateStr = today.toLocaleDateString('en-GB', { 
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' 
    });

    saveMatchResult({
      date: dateStr,
      teamA: teamOption.teamA,
      teamB: teamOption.teamB,
      scoreA,
      scoreB,
      playerIds: allPlayerIds,
      isManualTeams: isManual,
      manOfMatchId: manOfMatchId ?? undefined,
    });

    clearGeneratedTeams();
    clearManualTeams();
    clearSelection();
    
    Alert.alert('Result Saved', 'Match result has been recorded', [
      { text: 'OK', onPress: () => router.replace('/(tabs)/(history)' as RelativePathString) }
    ]);
  }, [teamOption, scoreA, scoreB, isManual, manOfMatchId, saveMatchResult, clearGeneratedTeams, clearManualTeams, clearSelection, router]);

  if (!teamOption) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Record Result' }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No team data found</Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const getPlayerTeam = (playerId: string) => {
    if (teamOption.teamA.players.some(p => p.id === playerId)) return 'A';
    return 'B';
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ 
        title: 'Record Result',
        headerLeft: () => (
          <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
            <ArrowLeft size={24} color={Colors.text} />
          </Pressable>
        ),
      }} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.scoreCard}>
          <View style={styles.teamScoreSection}>
            <Text style={[styles.teamLabel, { color: Colors.teamA }]}>TEAM A</Text>
            <View style={styles.playerList}>
              {teamOption.teamA.players.map(p => (
                <Text key={p.id} style={styles.playerName}>{p.name}</Text>
              ))}
            </View>
            <Text style={styles.avgText}>AVG: {teamOption.teamA.averageRating}</Text>
          </View>

          <View style={styles.scoreSection}>
            <View style={styles.scoreControl}>
              <Pressable 
                style={styles.scoreBtn} 
                onPress={() => setScoreA(Math.max(0, scoreA - 1))}
              >
                <Minus size={20} color={Colors.text} />
              </Pressable>
              <Text style={styles.scoreValue}>{scoreA}</Text>
              <Pressable 
                style={styles.scoreBtn} 
                onPress={() => setScoreA(scoreA + 1)}
              >
                <Plus size={20} color={Colors.text} />
              </Pressable>
            </View>

            <View style={styles.vsContainer}>
              <Text style={styles.vsText}>VS</Text>
            </View>

            <View style={styles.scoreControl}>
              <Pressable 
                style={styles.scoreBtn} 
                onPress={() => setScoreB(Math.max(0, scoreB - 1))}
              >
                <Minus size={20} color={Colors.text} />
              </Pressable>
              <Text style={styles.scoreValue}>{scoreB}</Text>
              <Pressable 
                style={styles.scoreBtn} 
                onPress={() => setScoreB(scoreB + 1)}
              >
                <Plus size={20} color={Colors.text} />
              </Pressable>
            </View>
          </View>

          <View style={styles.teamScoreSection}>
            <Text style={[styles.teamLabel, { color: Colors.teamB }]}>TEAM B</Text>
            <View style={styles.playerList}>
              {teamOption.teamB.players.map(p => (
                <Text key={p.id} style={styles.playerName}>{p.name}</Text>
              ))}
            </View>
            <Text style={styles.avgText}>AVG: {teamOption.teamB.averageRating}</Text>
          </View>
        </View>

        <View style={styles.resultPreview}>
          {scoreA > scoreB && (
            <Text style={styles.resultText}>Team A wins {scoreA} - {scoreB}</Text>
          )}
          {scoreB > scoreA && (
            <Text style={styles.resultText}>Team B wins {scoreB} - {scoreA}</Text>
          )}
          {scoreA === scoreB && (
            <Text style={styles.resultTextDraw}>Draw {scoreA} - {scoreB}</Text>
          )}
        </View>

        <View style={styles.motmSection}>
          <View style={styles.motmHeader}>
            <Star size={18} color={Colors.gold} fill={Colors.gold} />
            <Text style={styles.motmTitle}>Man of the Match</Text>
          </View>
          <Text style={styles.motmSubtitle}>Optional — tap to select</Text>
          <View style={styles.motmGrid}>
            {allPlayers.map(player => {
              const isSelected = manOfMatchId === player.id;
              const team = getPlayerTeam(player.id);
              const teamColor = team === 'A' ? Colors.teamA : Colors.teamB;
              return (
                <Pressable
                  key={player.id}
                  style={[
                    styles.motmPlayerChip,
                    isSelected && styles.motmPlayerChipSelected,
                  ]}
                  onPress={() => setManOfMatchId(isSelected ? null : player.id)}
                >
                  {isSelected && (
                    <Star size={11} color={Colors.gold} fill={Colors.gold} />
                  )}
                  <View style={[styles.teamDot, { backgroundColor: teamColor }]} />
                  <Text style={[
                    styles.motmPlayerName,
                    isSelected && styles.motmPlayerNameSelected,
                  ]} numberOfLines={1}>
                    {player.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {manOfMatchId && (
            <View style={styles.motmSelectedBanner}>
              <Star size={14} color={Colors.gold} fill={Colors.gold} />
              <Text style={styles.motmSelectedText}>
                {allPlayers.find(p => p.id === manOfMatchId)?.name} — MOTM
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Pressable style={styles.saveButton} onPress={handleSave}>
        <Check size={22} color={Colors.background} />
        <Text style={styles.saveText}>Save Result</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  backBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.cardBackground,
    borderRadius: 10,
  },
  backBtnText: {
    color: Colors.gold,
    fontWeight: '600' as const,
  },
  scoreCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  scoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 16,
  },
  scoreControl: {
    alignItems: 'center',
    gap: 8,
  },
  scoreBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '800' as const,
    color: Colors.gold,
    minWidth: 60,
    textAlign: 'center',
  },
  vsContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsText: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: Colors.gold,
  },
  teamScoreSection: {
    alignItems: 'center',
  },
  teamLabel: {
    fontSize: 16,
    fontWeight: '800' as const,
    marginBottom: 8,
  },
  playerList: {
    alignItems: 'center',
    gap: 2,
  },
  playerName: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  avgText: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 6,
  },
  resultPreview: {
    marginTop: 20,
    alignItems: 'center',
  },
  resultText: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.success,
  },
  resultTextDraw: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.warning,
  },
  motmSection: {
    marginTop: 24,
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  motmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  motmTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  motmSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 14,
    marginLeft: 26,
  },
  motmGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  motmPlayerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  motmPlayerChipSelected: {
    backgroundColor: 'rgba(200, 160, 42, 0.12)',
    borderColor: Colors.gold,
  },
  teamDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  motmPlayerName: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
    maxWidth: 100,
  },
  motmPlayerNameSelected: {
    color: Colors.gold,
    fontWeight: '700' as const,
  },
  motmSelectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  motmSelectedText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.gold,
  },
  saveButton: {
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
  saveText: {
    color: Colors.background,
    fontSize: 17,
    fontWeight: '700' as const,
  },
});
