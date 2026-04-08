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
import { useRouter, Stack, useLocalSearchParams, RelativePathString } from 'expo-router';
import { ArrowLeft, Check, Minus, Plus, Star } from 'lucide-react-native';
import { useTNF } from '@/context/TNFContext';
import { Player } from '@/types';
import Colors from '@/constants/colors';
import TuesdayPicker from '@/components/TuesdayPicker';

type Step = 'date' | 'teamA' | 'teamB' | 'score' | 'motm';

export default function EditResultScreen() {
  console.log('[EditResult] Screen rendered');
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { players, matchHistory, updateMatchResult } = useTNF();

  const match = useMemo(() => matchHistory.find(m => m.id === id), [matchHistory, id]);

  const [step, setStep] = useState<Step>('date');
  const [dateText, setDateText] = useState(match?.date ?? '');
  const [teamAIds, setTeamAIds] = useState<string[]>(match?.teamA.players.map(p => p.id) ?? []);
  const [teamBIds, setTeamBIds] = useState<string[]>(match?.teamB.players.map(p => p.id) ?? []);
  const [scoreA, setScoreA] = useState(match?.scoreA ?? 0);
  const [scoreB, setScoreB] = useState(match?.scoreB ?? 0);
  const [manOfMatchId, setManOfMatchId] = useState<string | null>(match?.manOfMatchId ?? null);
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

  const toggleTeamA = useCallback((pid: string) => {
    setTeamAIds(prev => prev.includes(pid) ? prev.filter(x => x !== pid) : [...prev, pid]);
  }, []);

  const toggleTeamB = useCallback((pid: string) => {
    setTeamBIds(prev => prev.includes(pid) ? prev.filter(x => x !== pid) : [...prev, pid]);
  }, []);

  const steps: Step[] = ['date', 'teamA', 'teamB', 'score', 'motm'];
  const currentStepIndex = steps.indexOf(step);

  const handleSave = useCallback(() => {
    if (!match) return;

    const teamAPlayers = players.filter(p => teamAIds.includes(p.id));
    const teamBPlayers = players.filter(p => teamBIds.includes(p.id));

    const totalA = teamAPlayers.reduce((s, p) => s + p.rating, 0);
    const avgA = teamAPlayers.length > 0 ? Math.round((totalA / teamAPlayers.length) * 10) / 10 : 0;
    const totalB = teamBPlayers.reduce((s, p) => s + p.rating, 0);
    const avgB = teamBPlayers.length > 0 ? Math.round((totalB / teamBPlayers.length) * 10) / 10 : 0;

    const allPlayerIds = [...teamAIds, ...teamBIds];
    const potmId = manOfMatchId ?? undefined;

    console.log('[EditResult] Saving match update:', {
      id: match.id,
      date: dateText.trim(),
      scoreA,
      scoreB,
      manOfMatchId: potmId ?? 'none',
      potmName: potmId ? players.find(p => p.id === potmId)?.name : 'none',
      playerIdsCount: allPlayerIds.length,
    });

    updateMatchResult(match.id, {
      date: dateText.trim(),
      teamA: { id: match.teamA.id, players: teamAPlayers, totalRating: totalA, averageRating: avgA },
      teamB: { id: match.teamB.id, players: teamBPlayers, totalRating: totalB, averageRating: avgB },
      scoreA,
      scoreB,
      playerIds: allPlayerIds,
      manOfMatchId: potmId,
    });

    Alert.alert('Saved', 'Match result updated', [
      { text: 'OK', onPress: () => router.replace('/(tabs)/history' as RelativePathString) },
    ]);
  }, [match, players, teamAIds, teamBIds, dateText, scoreA, scoreB, manOfMatchId, updateMatchResult, router]);

  const handleNext = useCallback(() => {
    if (step === 'date') {
      if (!dateText.trim()) { Alert.alert('Date Required', 'Please enter a date'); return; }
      setStep('teamA');
    } else if (step === 'teamA') {
      if (teamAIds.length < 1) { Alert.alert('Team A Empty', 'Select at least one player'); return; }
      setStep('teamB');
    } else if (step === 'teamB') {
      if (teamBIds.length < 1) { Alert.alert('Team B Empty', 'Select at least one player'); return; }
      setStep('score');
    } else if (step === 'score') {
      setStep('motm');
    } else if (step === 'motm') {
      handleSave();
    }
  }, [step, dateText, teamAIds, teamBIds, handleSave]);

  const stepLabels: Record<Step, string> = {
    date: 'Match Date', teamA: 'Team A Players', teamB: 'Team B Players',
    score: 'Final Score', motm: 'Player of the Match',
  };

  if (!match) {
    return (
      <View style={styles.container} testID="edit-result-screen">
        <Stack.Screen options={{ title: 'Edit Result' }} />
        <Text style={styles.notFound}>Match not found</Text>
      </View>
    );
  }

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {steps.map((s, i) => (
        <View key={s} style={styles.stepItem}>
          <View style={[
            styles.stepDot,
            i < currentStepIndex && styles.stepDotDone,
            i === currentStepIndex && styles.stepDotActive,
          ]}>
            {i < currentStepIndex
              ? <Check size={10} color={Colors.background} />
              : <Text style={[styles.stepDotNum, i === currentStepIndex && styles.stepDotNumActive]}>{i + 1}</Text>
            }
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
      <Text style={styles.stepTitle}>Match Date</Text>
      <Text style={styles.stepSubtitle}>Select the Tuesday this match was played</Text>
      <TuesdayPicker selectedDate={dateText} onSelect={setDateText} />
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
        <Text style={styles.stepTitle}>Team {team} Players</Text>
        <Text style={styles.stepSubtitle}>{selected.length} selected</Text>
        <TextInput
          style={styles.input}
          placeholder="Search players..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        <View style={styles.playerList}>
          {filtered.map(p => {
            if (otherSelected.includes(p.id)) return null;
            const isSel = selected.includes(p.id);
            return (
              <Pressable
                key={p.id}
                style={[styles.playerRow, isSel && { borderColor: color, backgroundColor: color + '10' }]}
                onPress={() => toggle(p.id)}
              >
                <View style={[styles.checkCircle, isSel && { backgroundColor: color, borderColor: color }]}>
                  {isSel && <Check size={12} color={Colors.background} />}
                </View>
                <View style={styles.playerRowInfo}>
                  <Text style={[styles.playerRowName, isSel && { color }]}>{p.name}</Text>
                  <Text style={styles.playerRowMeta}>{p.position} · {p.rating}</Text>
                </View>
              </Pressable>
            );
          })}
          {filtered.filter(p => !otherSelected.includes(p.id)).length === 0 && (
            <Text style={styles.noPlayers}>No players available</Text>
          )}
        </View>
      </View>
    );
  };

  const renderScoreStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Final Score</Text>
      <View style={styles.scoreCard}>
        <View style={styles.teamScoreBlock}>
          <Text style={[styles.teamLabel, { color: Colors.teamA }]}>TEAM A</Text>
          <Text style={styles.playerCount}>{teamAIds.length} players</Text>
        </View>
        <View style={styles.scoreCentre}>
          <View style={styles.scoreCtrl}>
            <Pressable style={styles.scoreBtn} onPress={() => setScoreA(Math.max(0, scoreA - 1))}>
              <Minus size={20} color={Colors.text} />
            </Pressable>
            <Text style={styles.scoreValue}>{scoreA}</Text>
            <Pressable style={styles.scoreBtn} onPress={() => setScoreA(scoreA + 1)}>
              <Plus size={20} color={Colors.text} />
            </Pressable>
          </View>
          <View style={styles.vsBadge}><Text style={styles.vsText}>VS</Text></View>
          <View style={styles.scoreCtrl}>
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
          <Text style={[styles.teamLabel, { color: Colors.teamB }]}>TEAM B</Text>
          <Text style={styles.playerCount}>{teamBIds.length} players</Text>
        </View>
      </View>
      <View style={styles.resultPreview}>
        {scoreA > scoreB && <Text style={styles.resultWin}>Team A wins {scoreA} – {scoreB}</Text>}
        {scoreB > scoreA && <Text style={styles.resultWin}>Team B wins {scoreB} – {scoreA}</Text>}
        {scoreA === scoreB && <Text style={styles.resultDraw}>Draw {scoreA} – {scoreB}</Text>}
      </View>
    </View>
  );

  const renderMotmStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Player of the Match</Text>
      <Text style={styles.stepSubtitle}>Optional — tap to award or change POTM</Text>

      <Text style={[styles.motmTeamHeader, { color: Colors.teamA }]}>Team A</Text>
      {players.filter(p => teamAIds.includes(p.id)).map(p => {
        const isSel = manOfMatchId === p.id;
        return (
          <Pressable key={p.id} style={[styles.motmRow, isSel && styles.motmRowSel]} onPress={() => setManOfMatchId(isSel ? null : p.id)}>
            <Star size={16} color={isSel ? Colors.gold : Colors.textMuted} fill={isSel ? Colors.gold : 'none'} />
            <Text style={[styles.motmName, isSel && styles.motmNameSel]}>{p.name}</Text>
            <Text style={styles.motmPos}>{p.position}</Text>
          </Pressable>
        );
      })}

      <Text style={[styles.motmTeamHeader, { color: Colors.teamB, marginTop: 16 }]}>Team B</Text>
      {players.filter(p => teamBIds.includes(p.id)).map(p => {
        const isSel = manOfMatchId === p.id;
        return (
          <Pressable key={p.id} style={[styles.motmRow, isSel && styles.motmRowSel]} onPress={() => setManOfMatchId(isSel ? null : p.id)}>
            <Star size={16} color={isSel ? Colors.gold : Colors.textMuted} fill={isSel ? Colors.gold : 'none'} />
            <Text style={[styles.motmName, isSel && styles.motmNameSel]}>{p.name}</Text>
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

  return (
    <View style={styles.container}>
      <Stack.Screen options={{
        title: 'Edit Result',
        headerLeft: () => (
          <Pressable onPress={() => {
            if (step === 'date') { router.back(); } else {
              setStep(steps[currentStepIndex - 1]);
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

      <Pressable style={styles.nextBtn} onPress={handleNext}>
        {step === 'motm' && <Check size={20} color={Colors.background} />}
        <Text style={styles.nextBtnText}>{step === 'motm' ? 'Save Changes' : 'Next'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  notFound: { textAlign: 'center', marginTop: 80, color: Colors.textMuted, fontSize: 16 },
  headerSection: {
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
    backgroundColor: Colors.cardBackground, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder,
  },
  stepIndicator: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  stepItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stepDot: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.background, borderWidth: 2, borderColor: Colors.cardBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { borderColor: Colors.gold, backgroundColor: Colors.gold },
  stepDotDone: { borderColor: Colors.success, backgroundColor: Colors.success },
  stepDotNum: { fontSize: 10, fontWeight: '700' as const, color: Colors.textMuted },
  stepDotNumActive: { color: Colors.background },
  stepLine: { flex: 1, height: 2, backgroundColor: Colors.cardBorder, marginHorizontal: 4 },
  stepLineDone: { backgroundColor: Colors.success },
  stepLabel: { fontSize: 13, fontWeight: '600' as const, color: Colors.textSecondary, marginBottom: 4 },
  content: { padding: 20, paddingBottom: 100 },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 22, fontWeight: '700' as const, color: Colors.text, marginBottom: 4 },
  stepSubtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: 20 },
  input: {
    backgroundColor: Colors.cardBackground, borderRadius: 14, paddingHorizontal: 16,
    paddingVertical: 14, fontSize: 16, color: Colors.text, borderWidth: 1,
    borderColor: Colors.cardBorder, marginBottom: 16,
  },
  playerList: { gap: 8 },
  playerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12,
    backgroundColor: Colors.cardBackground, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.cardBorder,
  },
  checkCircle: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1.5,
    borderColor: Colors.cardBorder, alignItems: 'center', justifyContent: 'center',
  },
  playerRowInfo: { flex: 1 },
  playerRowName: { fontSize: 14, fontWeight: '600' as const, color: Colors.text },
  playerRowMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  noPlayers: { textAlign: 'center', color: Colors.textMuted, fontSize: 14, paddingVertical: 24 },
  scoreCard: {
    backgroundColor: Colors.cardBackground, borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: Colors.cardBorder, alignItems: 'center',
  },
  teamScoreBlock: { alignItems: 'center', marginBottom: 8 },
  teamLabel: { fontSize: 15, fontWeight: '800' as const },
  playerCount: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  scoreCentre: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16 },
  scoreCtrl: { alignItems: 'center', gap: 8 },
  scoreBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.cardBorder,
  },
  scoreValue: { fontSize: 48, fontWeight: '800' as const, color: Colors.gold, minWidth: 60, textAlign: 'center' },
  vsBadge: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: Colors.gold, alignItems: 'center', justifyContent: 'center' },
  vsText: { fontSize: 12, fontWeight: '800' as const, color: Colors.gold },
  resultPreview: { alignItems: 'center', marginTop: 20 },
  resultWin: { fontSize: 18, fontWeight: '700' as const, color: Colors.success },
  resultDraw: { fontSize: 18, fontWeight: '700' as const, color: Colors.warning },
  motmTeamHeader: { fontSize: 13, fontWeight: '700' as const, letterSpacing: 0.5, marginBottom: 8 },
  motmRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: Colors.cardBackground, borderRadius: 12, borderWidth: 1.5,
    borderColor: Colors.cardBorder, marginBottom: 8,
  },
  motmRowSel: { borderColor: Colors.gold, backgroundColor: 'rgba(200,160,42,0.08)' },
  motmName: { flex: 1, fontSize: 14, fontWeight: '600' as const, color: Colors.text },
  motmNameSel: { color: Colors.gold },
  motmPos: { fontSize: 12, color: Colors.textMuted, fontWeight: '500' as const },
  motmBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16,
    paddingHorizontal: 14, paddingVertical: 10, backgroundColor: 'rgba(200,160,42,0.1)',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(200,160,42,0.3)',
  },
  motmBannerText: { fontSize: 13, fontWeight: '600' as const, color: Colors.gold },
  nextBtn: {
    position: 'absolute', bottom: 20, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.gold, paddingVertical: 16, borderRadius: 16, gap: 8,
    shadowColor: Colors.gold, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  nextBtnText: { color: Colors.background, fontSize: 17, fontWeight: '700' as const },
});
