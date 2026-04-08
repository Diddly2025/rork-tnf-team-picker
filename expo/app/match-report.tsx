import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Share,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Send, Pencil, X, Save, Star, Clock } from 'lucide-react-native';
import { useTNF } from '@/context/TNFContext';
import PlayerAvatar from '@/components/PlayerAvatar';
import Colors from '@/constants/colors';

type Mode = 'add' | 'view' | 'edit';

export default function MatchReportScreen() {
  const { id, mode: initialMode } = useLocalSearchParams<{ id: string; mode: string }>();
  const router = useRouter();
  const { matchHistory, updateMatchResult, players } = useTNF();

  const match = useMemo(() => matchHistory.find(m => m.id === id), [matchHistory, id]);
  const [mode, setMode] = useState<Mode>((initialMode as Mode) ?? (match?.report ? 'view' : 'add'));
  const [reportText, setReportText] = useState(match?.report ?? '');

  console.log('[MatchReport] Screen rendered, mode:', mode, 'matchId:', id);

  const motmPlayer = useMemo(() => {
    if (!match?.manOfMatchId) return null;
    const allMatchPlayers = [...(match.teamA.players ?? []), ...(match.teamB.players ?? [])];
    const fromMatch = allMatchPlayers.find(p => p.id === match.manOfMatchId);
    const fromRoster = players.find(p => p.id === match.manOfMatchId);
    return {
      name: fromRoster?.name ?? fromMatch?.name ?? 'Unknown',
      photo: fromRoster?.photo,
    };
  }, [match, players]);

  const handleSave = useCallback(() => {
    if (!match || !reportText.trim()) {
      Alert.alert('Empty Report', 'Please write something before saving.');
      return;
    }
    console.log('[MatchReport] Saving report for match:', match.id);
    updateMatchResult(match.id, { report: reportText.trim() });
    setMode('view');
  }, [match, reportText, updateMatchResult]);

  const handleShare = useCallback(async () => {
    if (!match) return;
    const motmName = motmPlayer?.name ?? 'N/A';
    const teamANames = match.teamA.players.map(p => p.name).join(', ');
    const teamBNames = match.teamB.players.map(p => p.name).join(', ');

    const shareText = [
      `Match Report - ${match.date}`,
      ``,
      `Team A ${match.scoreA} - ${match.scoreB} Team B`,
      ``,
      `Team A: ${teamANames}`,
      `Team B: ${teamBNames}`,
      motmPlayer ? `\nPlayer of the Match: ${motmName}` : '',
      ``,
      `--- Report ---`,
      match.report ?? reportText,
    ].filter(Boolean).join('\n');

    try {
      await Share.share({ message: shareText, title: `Match Report - ${match.date}` });
    } catch {
      console.log('[MatchReport] Share cancelled');
    }
  }, [match, motmPlayer, reportText]);

  if (!match) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Match Report' }} />
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Match not found</Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const getResultLabel = () => {
    if (match.scoreA > match.scoreB) return 'Team A Won';
    if (match.scoreB > match.scoreA) return 'Team B Won';
    return 'Draw';
  };

  const getResultColor = () => {
    if (match.scoreA > match.scoreB) return Colors.teamA;
    if (match.scoreB > match.scoreA) return Colors.teamB;
    return Colors.warning;
  };

  const headerTitle = mode === 'add' ? 'Add Report' : mode === 'edit' ? 'Edit Report' : 'Match Report';

  return (
    <View style={styles.container} testID="match-report-screen">
      <Stack.Screen
        options={{
          title: headerTitle,
          headerRight: () => mode === 'view' ? (
            <View style={styles.headerActions}>
              <Pressable onPress={handleShare} hitSlop={8} style={styles.headerBtn}>
                <Send size={18} color={Colors.gold} />
              </Pressable>
              <Pressable onPress={() => setMode('edit')} hitSlop={8} style={styles.headerBtn}>
                <Pencil size={18} color={Colors.textSecondary} />
              </Pressable>
            </View>
          ) : null,
        }}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.matchSummaryCard}>
            <View style={styles.matchDateRow}>
              <Clock size={14} color={Colors.textMuted} />
              <Text style={styles.matchDate}>{match.date}</Text>
            </View>

            <View style={styles.scoreSection}>
              <View style={styles.teamCol}>
                <Text style={[styles.teamLabel, { color: Colors.teamA }]}>TEAM A</Text>
                <Text style={styles.teamPlayersList} numberOfLines={3}>
                  {match.teamA.players.map(p => p.name).join(', ')}
                </Text>
              </View>
              <View style={styles.scoreCenter}>
                <View style={styles.scoreBubble}>
                  <Text style={styles.scoreNum}>{match.scoreA}</Text>
                  <Text style={styles.scoreSeparator}>-</Text>
                  <Text style={styles.scoreNum}>{match.scoreB}</Text>
                </View>
                <View style={[styles.resultChip, { backgroundColor: getResultColor() + '20' }]}>
                  <Text style={[styles.resultChipText, { color: getResultColor() }]}>
                    {getResultLabel()}
                  </Text>
                </View>
              </View>
              <View style={[styles.teamCol, styles.teamColRight]}>
                <Text style={[styles.teamLabel, { color: Colors.teamB }]}>TEAM B</Text>
                <Text style={[styles.teamPlayersList, styles.textRight]} numberOfLines={3}>
                  {match.teamB.players.map(p => p.name).join(', ')}
                </Text>
              </View>
            </View>

            {motmPlayer && (
              <View style={styles.motmStrip}>
                <PlayerAvatar
                  name={motmPlayer.name}
                  photoUrl={motmPlayer.photo}
                  size={24}
                  borderColor={Colors.gold}
                  borderWidth={1.5}
                />
                <Star size={13} color={Colors.gold} fill={Colors.gold} />
                <Text style={styles.motmName}>{motmPlayer.name}</Text>
                <Text style={styles.motmTag}>POTM</Text>
              </View>
            )}
          </View>

          {(mode === 'add' || mode === 'edit') ? (
            <View style={styles.editorSection}>
              <Text style={styles.editorLabel}>
                {mode === 'add' ? 'Write your match report' : 'Edit match report'}
              </Text>
              <TextInput
                style={styles.reportInput}
                value={reportText}
                onChangeText={setReportText}
                placeholder="Type or paste your match report here..."
                placeholderTextColor={Colors.textMuted}
                multiline
                textAlignVertical="top"
                autoFocus={mode === 'add'}
                testID="report-text-input"
              />
              <View style={styles.editorActions}>
                <Pressable
                  style={styles.cancelBtn}
                  onPress={() => {
                    if (mode === 'edit' && match.report) {
                      setReportText(match.report);
                      setMode('view');
                    } else {
                      router.back();
                    }
                  }}
                >
                  <X size={16} color={Colors.textSecondary} />
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.saveBtn} onPress={handleSave} testID="save-report-btn">
                  <Save size={16} color="#fff" />
                  <Text style={styles.saveBtnText}>Save Report</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.reportViewSection}>
              <Text style={styles.reportViewLabel}>MATCH REPORT</Text>
              <View style={styles.reportViewCard}>
                <Text style={styles.reportViewText}>{match.report}</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerBtn: {
    padding: 4,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  notFoundText: {
    fontSize: 16,
    color: Colors.textMuted,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.gold,
  },
  backBtnText: {
    color: '#fff',
    fontWeight: '600' as const,
    fontSize: 14,
  },
  matchSummaryCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 16,
  },
  matchDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  matchDate: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  scoreSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  teamCol: {
    flex: 1,
  },
  teamColRight: {
    alignItems: 'flex-end',
  },
  teamLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  teamPlayersList: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  textRight: {
    textAlign: 'right',
  },
  scoreCenter: {
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  scoreBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scoreNum: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  scoreSeparator: {
    fontSize: 18,
    color: Colors.textMuted,
    fontWeight: '300' as const,
  },
  resultChip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
  },
  resultChipText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  motmStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  motmName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.gold,
    flex: 1,
  },
  motmTag: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  editorSection: {
    gap: 12,
  },
  editorLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  reportInput: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
    minHeight: 220,
  },
  editorActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.gold,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#fff',
  },
  reportViewSection: {
    gap: 10,
  },
  reportViewLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },
  reportViewCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  reportViewText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 23,
  },
});
