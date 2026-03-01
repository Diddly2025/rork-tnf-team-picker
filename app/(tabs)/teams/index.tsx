import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable,
  Modal,
} from 'react-native';
import { useRouter, RelativePathString } from 'expo-router';
import { ChevronLeft, ChevronRight, Trophy, RefreshCw, Check, Info, X } from 'lucide-react-native';
import { useTNF } from '@/context/TNFContext';
import PitchView from '@/components/PitchView';
import Colors from '@/constants/colors';

export default function TeamsScreen() {
  const router = useRouter();
  const { generatedTeams, generateTeams, selectedPlayerIds } = useTNF();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [summaryVisible, setSummaryVisible] = useState(false);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < generatedTeams.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, generatedTeams.length]);

  const handleRegenerate = useCallback(() => {
    generateTeams();
    setCurrentIndex(0);
  }, [generateTeams]);

  const handleSelectTeam = useCallback(() => {
    router.push({ pathname: '/match-result' as RelativePathString, params: { teamOptionIndex: String(currentIndex) } });
  }, [currentIndex, router]);

  if (generatedTeams.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Trophy size={64} color={Colors.textMuted} />
        <Text style={styles.emptyTitle}>No Teams Generated</Text>
        <Text style={styles.emptyText}>
          Select players on Match Day and generate teams
        </Text>
      </View>
    );
  }

  const currentTeam = generatedTeams[currentIndex];

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Pressable 
            style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
            onPress={handlePrevious}
            disabled={currentIndex === 0}
          >
            <ChevronLeft size={20} color={currentIndex === 0 ? Colors.textMuted : Colors.gold} />
          </Pressable>
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>{currentIndex + 1}/{generatedTeams.length}</Text>
            <View style={styles.pagination}>
              {generatedTeams.map((_, index) => (
                <View 
                  key={index} 
                  style={[styles.dot, index === currentIndex && styles.dotActive]} 
                />
              ))}
            </View>
          </View>
          <Pressable 
            style={[styles.navButton, currentIndex === generatedTeams.length - 1 && styles.navButtonDisabled]}
            onPress={handleNext}
            disabled={currentIndex === generatedTeams.length - 1}
          >
            <ChevronRight size={20} color={currentIndex === generatedTeams.length - 1 ? Colors.textMuted : Colors.gold} />
          </Pressable>
        </View>
        <View style={styles.topBarRight}>
          <View style={[
            styles.balanceBadge,
            currentTeam.ratingDifference <= 2 && styles.balanceBadgeGood,
            currentTeam.ratingDifference > 2 && currentTeam.ratingDifference <= 5 && styles.balanceBadgeMedium,
            currentTeam.ratingDifference > 5 && styles.balanceBadgePoor,
          ]}>
            <Text style={styles.balanceValue}>±{currentTeam.ratingDifference.toFixed(1)}</Text>
          </View>
          <Pressable style={styles.infoButton} onPress={() => setSummaryVisible(true)}>
            <Info size={20} color={Colors.gold} />
          </Pressable>
        </View>
      </View>

      <View style={styles.pitchWrapper}>
        <PitchView teamA={currentTeam.teamA} teamB={currentTeam.teamB} compact />
      </View>

      <View style={styles.bottomActions}>
        {selectedPlayerIds.length >= 4 && (
          <Pressable style={styles.regenerateButton} onPress={handleRegenerate}>
            <RefreshCw size={18} color={Colors.gold} />
          </Pressable>
        )}
        <Pressable style={styles.selectButton} onPress={handleSelectTeam}>
          <Check size={20} color={Colors.background} />
          <Text style={styles.selectText}>Select & Record</Text>
        </Pressable>
      </View>

      <Modal
        visible={summaryVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSummaryVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSummaryVisible(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Team Summary</Text>
              <Pressable onPress={() => setSummaryVisible(false)} style={styles.closeButton}>
                <X size={22} color={Colors.text} />
              </Pressable>
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.summaryTeam}>
                <View style={[styles.teamBadge, { backgroundColor: Colors.teamA }]}>
                  <Text style={styles.teamBadgeText}>A</Text>
                </View>
                <Text style={styles.summaryRating}>{currentTeam.teamA.totalRating} pts</Text>
                <Text style={styles.summaryAvg}>AVG: {currentTeam.teamA.averageRating}</Text>
                <View style={styles.playerList}>
                  {currentTeam.teamA.players.map(p => (
                    <View key={p.id} style={styles.playerRow}>
                      <View style={[styles.positionDot, { backgroundColor: getPositionColor(p.position) }]} />
                      <Text style={styles.playerName}>{p.name}</Text>
                      <Text style={styles.playerRating}>{p.rating}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.vsDivider}>
                <View style={styles.vsCircle}>
                  <Text style={styles.vsText}>VS</Text>
                </View>
              </View>

              <View style={styles.summaryTeam}>
                <View style={[styles.teamBadge, { backgroundColor: Colors.teamB }]}>
                  <Text style={styles.teamBadgeText}>B</Text>
                </View>
                <Text style={styles.summaryRating}>{currentTeam.teamB.totalRating} pts</Text>
                <Text style={styles.summaryAvg}>AVG: {currentTeam.teamB.averageRating}</Text>
                <View style={styles.playerList}>
                  {currentTeam.teamB.players.map(p => (
                    <View key={p.id} style={styles.playerRow}>
                      <View style={[styles.positionDot, { backgroundColor: getPositionColor(p.position) }]} />
                      <Text style={styles.playerName}>{p.name}</Text>
                      <Text style={styles.playerRating}>{p.rating}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            <View style={[
              styles.balanceSummary,
              currentTeam.ratingDifference <= 2 && styles.balanceSummaryGood,
              currentTeam.ratingDifference > 2 && currentTeam.ratingDifference <= 5 && styles.balanceSummaryMedium,
              currentTeam.ratingDifference > 5 && styles.balanceSummaryPoor,
            ]}>
              <Text style={styles.balanceSummaryText}>
                Rating Difference: ±{currentTeam.ratingDifference.toFixed(1)}
              </Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function getPositionColor(position: string): string {
  switch (position) {
    case 'GK': return '#f59e0b';
    case 'DEF': return '#3b82f6';
    case 'MID': return '#10b981';
    case 'FWD': return '#ef4444';
    default: return Colors.textMuted;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionInfo: {
    alignItems: 'center',
    gap: 4,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  pagination: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.cardBorder,
  },
  dotActive: {
    backgroundColor: Colors.gold,
    width: 16,
  },
  balanceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  balanceBadgeGood: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  balanceBadgeMedium: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  balanceBadgePoor: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  balanceValue: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  infoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  pitchWrapper: {
    flex: 1,
    padding: 8,
  },
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: Colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  regenerateButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  selectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gold,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  selectText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
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
  summaryRow: {
    flexDirection: 'row',
    padding: 16,
  },
  summaryTeam: {
    flex: 1,
    alignItems: 'center',
  },
  teamBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800' as const,
  },
  summaryRating: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 6,
  },
  summaryAvg: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  playerList: {
    marginTop: 10,
    width: '100%',
    paddingHorizontal: 4,
    gap: 4,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  positionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  playerName: {
    flex: 1,
    color: Colors.text,
    fontSize: 12,
  },
  playerRating: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '600' as const,
  },
  vsDivider: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.gold,
  },
  vsText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.gold,
  },
  balanceSummary: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  balanceSummaryGood: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  balanceSummaryMedium: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  balanceSummaryPoor: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  balanceSummaryText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600' as const,
  },
});
