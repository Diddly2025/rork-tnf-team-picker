import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter, Stack, RelativePathString } from 'expo-router';
import { ArrowLeft, Check, Minus, Plus, Star } from 'lucide-react-native';
import { useTNF } from '@/context/TNFContext';
import { useGroup } from '@/context/GroupContext';
import { Player } from '@/types';
import Colors from '@/constants/colors';
import TuesdayPicker from '@/components/TuesdayPicker';

type Step = 'date' | 'teamA' | 'teamB' | 'score' | 'motm';

export default function AddHistoricalResultScreen() {
  const router = useRouter();
  const { players, saveMatchResult } = useTNF();
  const { activeGroup } = useGroup();

  const playDay = activeGroup?.playDay ?? 'Tuesday';

  const [step, setStep] = useState<Step>('date');
  const [dateText, setDateText] = useState('');
  const [teamAIds, setTeamAIds] = useState<string[]>([]);
  const [teamBIds, setTeamBIds] = useState<string[]>([]);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [manOfMatchId, setManOfMatchId] = useState<string | null>(null);
  const [searchA, setSearchA] = useState('');
  const [searchB, setSearchB] = useState('');

  const sortedPlayers = useMemo(() =>
    [...players].sort((a, b) => a.name.localeCompare(b.name)),
    [players]
  );

  const filteredA = useMemo(() =>
    sortedPlayers.filter(p =>
      p.name.toLowerCase().includes(searchA.toLowerCase()) && !teamBIds.includes(p.id)
    ),
    [sortedPlayers, searchA, teamBIds]
  );

  const filteredB = useMemo(() =>
    sortedPlayers.filter(p =>
      p.name.toLowerCase().includes(searchB.toLowerCase()) && !teamAIds.includes(p.id)
    ),
    [sortedPlayers, searchB, teamAIds]
  );

  const allMatchPlayers: Player[] = useMemo(() =>
    players.filter(p => teamAIds.includes(p.id) || teamBIds.includes(p.id)),
    [players, teamAIds, teamBIds]
  );

  const toggleTeamA = useCallback((id: string) => {
    setTeamAIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  const toggleTeamB = useCallback((id: string) => {
    setTeamBIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  const handleSave = useCallback(() => {
    const teamAPlayers = players.filter(p => teamAIds.includes(p.id));
    const teamBPlayers = players.filter(p => teamBIds.includes(p.id));

    const totalA = teamAPlayers.reduce((s, p) => s + p.rating, 0);
    const avgA = teamAPlayers.length > 0
      ? Math.round((totalA / teamAPlayers.length) * 10) / 10
      : 0;
    const totalB = teamBPlayers.reduce((s, p) => s + p.rating, 0);
    const avgB = teamBPlayers.length > 0
      ? Math.round((totalB / teamBPlayers.length) * 10) / 10
      : 0;

    const allPlayerIds = [...teamAIds, ...teamBIds];
    const potmId = manOfMatchId ?? undefined;

    console.log('[AddPastResult] Saving match:', {
      date: dateText.trim(),
      teamACount: teamAPlayers.length,
      teamBCount: teamBPlayers.length,
      scoreA,
      scoreB,
      playerIdsCount: allPlayerIds.length,
      manOfMatchId: potmId ?? 'none',
      potmName: potmId ? players.find(p => p.id === potmId)?.name : 'none',
    });

    saveMatchResult({
      date: dateText.trim(),
      teamA: { id: `hist-a-${Date.now()}`, players: teamAPlayers, totalRating: totalA, averageRating: avgA },
      teamB: { id: `hist-b-${Date.now()}`, players: teamBPlayers, totalRating: totalB, averageRating: avgB },
      scoreA,
      scoreB,
      playerIds: allPlayerIds,
      isManualTeams: true,
      manOfMatchId: potmId,
    });

    Alert.alert('Result Added', 'Historical result has been saved', [
      { text: 'OK', onPress: () => router.replace('/(tabs)/(history)' as RelativePathString) },
    ]);
  }, [players, teamAIds, teamBIds, dateText, scoreA, scoreB, manOfMatchId, saveMatchResult, router]);

  const handleNext = useCallback(() => {
    if (step === 'date') {
      if (!dateText.trim()) {
        Alert.alert('Date Required', 'Please enter a date for this match');
        return;
      }
      setStep('teamA');
    } else if (step === 'teamA') {
      if (teamAIds.length < 1) {
        Alert.alert('Team A Empty', 'Please select at least one player for Team A');
        return;
      }
      setStep('teamB');
    } else if (step === 'teamB') {
      if (teamBIds.length < 1) {
        Alert.alert('Team B Empty', 'Please select at least one player for Team B');
        return;
      }
      setStep('score');
    } else if (step === 'score') {
      setStep('motm');
    } else if (step === 'motm') {
      handleSave();
    }
  }, [step, dateText, teamAIds, teamBIds, handleSave]);

  const stepLabels: Record<Step, string> = {
    date: 'Match Date',
    teamA: 'Team A Players',
    teamB: 'Team B Players',
    score: 'Final Score',
    motm: 'Player of the Match',
  };

  const steps: Step[] = ['date', 'teamA', 'teamB', 'score', 'motm'];
  const currentStepIndex = steps.indexOf(step);

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {steps.map((s, i) => (
        <View key={s} style={styles.stepItem}>
          <View style={[
            styles.stepDot,
            i < currentStepIndex && styles.stepDotDone,
            i === currentStepIndex && styles.stepDotActive,
          ]}>
            {i < currentStepIndex ? (
              <Check size={10} color={Colors.background} />
            ) : (
              <Text style={[
                styles.stepDotNum,
                i === currentStepIndex && styles.stepDotNumActive,
              ]}>{i + 1}</Text>
            )}
          </View>
          {i < steps.length - 1 && (
            <View style={[styles.stepLine, i < currentStepIndex && styles.stepLineDone]} />
          )}
        </View>
      ))}
    </View>
  );

  const renderDateStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>When was this match played?</Text>
      <Text style={styles.stepSubtitle}>Select the {playDay} this match was played</Text>
      <TuesdayPicker selectedDate={dateText} onSelect={setDateText} playDay={playDay} />
    </View>
  );

  const renderPlayerSelectStep = (team: 'A' | 'B') => {
    const isA = team === 'A';
    const selected = isA ? teamAIds : teamBIds;
    const filtered = isA ? filteredA : filteredB;
    const search = isA ? searchA : searchB;
    const setSearch = isA ? setSearchA : setSearchB;
    const toggle = isA ? toggleTeamA : toggleTeamB;
    const color = isA ? Colors.teamA : Colors.teamB;
    const otherSelected = isA ? teamBIds : teamAIds;

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Select Team {team} Players</Text>
        <Text style={styles.stepSubtitle}>
          {selected.length} selected
        </Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search players..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        <View style={styles.playerSelectList}>
          {filtered.map(p => {
            const isSelected = selected.includes(p.id);
            const inOther = otherSelected.includes(p.id);
            if (inOther) return null;
            return (
              <Pressable
                key={p.id}
                style={[styles.playerSelectRow, isSelected && { borderColor: color, backgroundColor: color + '10' }]}
                onPress={() => toggle(p.id)}
              >
                <View style={[styles.playerSelectCheck, isSelected && { backgroundColor: color, borderColor: color }]}>
                  {isSelected && <Check size={12} color={Colors.background} />}
                </View>
                <View style={styles.playerSelectInfo}>
                  <Text style={[styles.playerSelectName, isSelected && { color: color }]}>{p.name}</Text>
                  <Text style={styles.playerSelectMeta}>{p.position} · {p.rating}</Text>
                </View>
              </Pressable>
            );
          })}
          {filtered.filter(p => !otherSelected.includes(p.id)).length === 0 && (
            <Text style={styles.noPlayersText}>No players available</Text>
          )}
        </View>
      </View>
    );
  };

  const renderScoreStep = () => {
    const teamAPlayers = players.filter(p => teamAIds.includes(p.id));
    const teamBPlayers = players.filter(p => teamBIds.includes(p.id));
    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>What was the final score?</Text>
        <View style={styles.scoreCard}>
          <View style={styles.teamScoreBlock}>
            <Text style={[styles.teamScoreLabel, { color: Colors.teamA }]}>TEAM A</Text>
            <Text style={styles.playerCountNote}>{teamAPlayers.length} players</Text>
          </View>

          <View style={styles.scoreCentre}>
            <View style={styles.scoreControl}>
              <Pressable style={styles.scoreBtn} onPress={() => setScoreA(Math.max(0, scoreA - 1))}>
                <Minus size={20} color={Colors.text} />
              </Pressable>
              <Text style={styles.scoreValue}>{scoreA}</Text>
              <Pressable style={styles.scoreBtn} onPress={() => setScoreA(scoreA + 1)}>
                <Plus size={20} color={Colors.text} />
              </Pressable>
            </View>
            <View style={styles.vsBadge}>
              <Text style={styles.vsText}>VS</Text>
            </View>
            <View style={styles.scoreControl}>
              <Pressable style={styles.scoreBtn} onPress={() => setScoreB(Math.max(0, scoreB - 1))}>
                <Minus size={20} color={Colors.text} />
              </Pressable>
              <Text style={styles.scoreValue}>{scoreB}</Text>
              <Pressable style={styles.scoreBtn} onPress={() => setScoreB(scoreB + 1)}>
                <Plus size={20} color={Colors.text} />
              </Pressable>
            </View>
          </View>

          <View style={styles.teamScoreBlock}>
            <Text style={[styles.teamScoreLabel, { color: Colors.teamB }]}>TEAM B</Text>
            <Text style={styles.playerCountNote}>{teamBPlayers.length} players</Text>
          </View>
        </View>

        <View style={styles.resultPreview}>
          {scoreA > scoreB && <Text style={styles.resultText}>Team A wins {scoreA} – {scoreB}</Text>}
          {scoreB > scoreA && <Text style={styles.resultText}>Team B wins {scoreB} – {scoreA}</Text>}
          {scoreA === scoreB && <Text style={styles.resultDraw}>Draw {scoreA} – {scoreB}</Text>}
        </View>
      </View>
    );
  };

  const renderMotmStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Player of the Match</Text>
      <Text style={styles.stepSubtitle}>Optional — tap a player to award POTM</Text>

      <Text style={[styles.motmTeamHeader, { color: Colors.teamA }]}>Team A</Text>
      {players.filter(p => teamAIds.includes(p.id)).map(p => {
        const isSelected = manOfMatchId === p.id;
        return (
          <Pressable
            key={p.id}
            style={[styles.motmRow, isSelected && styles.motmRowSelected]}
            onPress={() => setManOfMatchId(isSelected ? null : p.id)}
          >
            <Star
              size={16}
              color={isSelected ? Colors.gold : Colors.textMuted}
              fill={isSelected ? Colors.gold : 'none'}
            />
            <Text style={[styles.motmPlayerName, isSelected && styles.motmPlayerNameSelected]}>
              {p.name}
            </Text>
            <Text style={styles.motmPos}>{p.position}</Text>
          </Pressable>
        );
      })}

      <Text style={[styles.motmTeamHeader, { color: Colors.teamB, marginTop: 16 }]}>Team B</Text>
      {players.filter(p => teamBIds.includes(p.id)).map(p => {
        const isSelected = manOfMatchId === p.id;
        return (
          <Pressable
            key={p.id}
            style={[styles.motmRow, isSelected && styles.motmRowSelected]}
            onPress={() => setManOfMatchId(isSelected ? null : p.id)}
          >
            <Star
              size={16}
              color={isSelected ? Colors.gold : Colors.textMuted}
              fill={isSelected ? Colors.gold : 'none'}
            />
            <Text style={[styles.motmPlayerName, isSelected && styles.motmPlayerNameSelected]}>
              {p.name}
            </Text>
            <Text style={styles.motmPos}>{p.position}</Text>
          </Pressable>
        );
      })}

      {manOfMatchId && (
        <View style={styles.motmBanner}>
          <Star size={14} color={Colors.gold} fill={Colors.gold} />
          <Text style={styles.motmBannerText}>
            {allMatchPlayers.find(p => p.id === manOfMatchId)?.name} awarded POTM
          </Text>
        </View>
      )}
    </View>
  );

  const nextLabel = step === 'motm' ? 'Save Result' : 'Next';

  return (
    <View style={styles.container} testID="add-historical-result-screen">
      <Stack.Screen options={{
        title: 'Add Past Result',
        headerLeft: () => (
          <Pressable onPress={() => {
            if (step === 'date') {
              router.back();
            } else {
              const prev = steps[currentStepIndex - 1];
              setStep(prev);
            }
          }} style={{ padding: 4 }}>
            <ArrowLeft size={24} color={Colors.text} />
          </Pressable>
        ),
      }} />

      <View style={styles.headerSection}>
        {renderStepIndicator()}
        <Text style={styles.stepLabel}>{stepLabels[step]}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === 'date' && renderDateStep()}
        {step === 'teamA' && renderPlayerSelectStep('A')}
        {step === 'teamB' && renderPlayerSelectStep('B')}
        {step === 'score' && renderScoreStep()}
        {step === 'motm' && renderMotmStep()}
      </ScrollView>

      <Pressable style={styles.nextButton} onPress={handleNext}>
        {step === 'motm' ? (
          <Check size={20} color={Colors.background} />
        ) : null}
        <Text style={styles.nextButtonText}>{nextLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: Colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    borderColor: Colors.gold,
    backgroundColor: Colors.gold,
  },
  stepDotDone: {
    borderColor: Colors.success,
    backgroundColor: Colors.success,
  },
  stepDotNum: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.textMuted,
  },
  stepDotNumActive: {
    color: Colors.background,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.cardBorder,
    marginHorizontal: 4,
  },
  stepLineDone: {
    backgroundColor: Colors.success,
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  dateInput: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 16,
  },
  dateHints: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  dateHintChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  dateHintText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  searchInput: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 12,
  },
  playerSelectList: {
    gap: 8,
  },
  playerSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
  },
  playerSelectCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerSelectInfo: {
    flex: 1,
  },
  playerSelectName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  playerSelectMeta: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },
  noPlayersText: {
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: 14,
    paddingVertical: 24,
  },
  scoreCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: 'center',
  },
  teamScoreBlock: {
    alignItems: 'center',
    marginBottom: 8,
  },
  teamScoreLabel: {
    fontSize: 15,
    fontWeight: '800' as const,
  },
  playerCountNote: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  scoreCentre: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
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
  vsBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsText: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: Colors.gold,
  },
  resultPreview: {
    alignItems: 'center',
    marginTop: 20,
  },
  resultText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.success,
  },
  resultDraw: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.warning,
  },
  motmTeamHeader: {
    fontSize: 13,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  motmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    marginBottom: 8,
  },
  motmRowSelected: {
    borderColor: Colors.gold,
    backgroundColor: 'rgba(200, 160, 42, 0.08)',
  },
  motmPlayerName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  motmPlayerNameSelected: {
    color: Colors.gold,
  },
  motmPos: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500' as const,
  },
  motmBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(200, 160, 42, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(200, 160, 42, 0.3)',
  },
  motmBannerText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.gold,
  },
  nextButton: {
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
    gap: 8,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  nextButtonText: {
    color: Colors.background,
    fontSize: 17,
    fontWeight: '700' as const,
  },
});
