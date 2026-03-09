import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Team } from '@/types';
import { useTNF } from '@/context/TNFContext';
import PlayerCard from './PlayerCard';

interface PitchViewProps {
  teamA: Team;
  teamB: Team;
  compact?: boolean;
}

export default function PitchView({ teamA, teamB, compact = false }: PitchViewProps) {
  const { sportConfig: sc } = useTNF();
  const courtBg = sc.courtColor;
  const lineColor = sc.courtLinesColor;

  const buildFormationRows = (players: typeof teamA.players) => {
    const sorted = [...players].sort((a, b) => {
      const posOrder: Record<string, number> = { GK: 0, DEF: 1, MID: 2, FWD: 3, PG: 0, SG: 1, SF: 2, PF: 3, C: 4 };
      return (posOrder[a.position] ?? 2) - (posOrder[b.position] ?? 2);
    });

    if (sorted.length <= 3) {
      return [sorted];
    }

    const backRow = sorted.slice(0, 4);
    const frontRow = sorted.slice(4);

    return [backRow, frontRow].filter(row => row.length > 0);
  };

  const renderTeamFormation = (team: Team, isTeamA: boolean) => {
    const rows = buildFormationRows(team.players);
    const displayRows = isTeamA ? rows : [...rows].reverse();

    return (
      <View style={[styles.teamHalf, compact && styles.teamHalfCompact]}>
        {displayRows.map((row, index) => (
          <View key={index} style={styles.formationRow}>
            {row.map(player => (
              <PlayerCard 
                key={player.id} 
                player={player} 
                size="small"
              />
            ))}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.pitch, compact && styles.pitchCompact, { backgroundColor: courtBg }]}>
      <View style={styles.pitchMarkings}>
        <View style={[styles.halfwayLine, { backgroundColor: lineColor }]} />
        <View style={[styles.centerCircle, { borderColor: lineColor }]} />
        <View style={[styles.penaltyArea, styles.topPenaltyArea, { borderColor: lineColor }]} />
        <View style={[styles.penaltyArea, styles.bottomPenaltyArea, { borderColor: lineColor }]} />
      </View>
      
      <View style={styles.teamsContainer}>
        <View style={[styles.teamSection, compact && styles.teamSectionCompact]}>
          <View style={styles.teamHeader}>
            <Text style={[styles.teamLabel, { color: '#ffffff' }]}>TEAM A</Text>
            <Text style={styles.teamRating}>AVG: {teamA.averageRating}</Text>
          </View>
          {renderTeamFormation(teamA, true)}
        </View>

        <View style={[styles.divider, { backgroundColor: lineColor }]} />
        
        <View style={[styles.teamSection, compact && styles.teamSectionCompact]}>
          <View style={styles.teamHeader}>
            <Text style={[styles.teamLabel, { color: '#ffffff' }]}>TEAM B</Text>
            <Text style={styles.teamRating}>AVG: {teamB.averageRating}</Text>
          </View>
          {renderTeamFormation(teamB, false)}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pitch: {
    minHeight: 700,
    backgroundColor: '#2d5a27',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  pitchCompact: {
    minHeight: 0,
    flex: 1,
  },
  pitchMarkings: {
    ...StyleSheet.absoluteFillObject,
  },
  halfwayLine: {
    position: 'absolute',
    top: '50%',
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: '#3d7a37',
  },
  centerCircle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 50,
    height: 50,
    marginLeft: -25,
    marginTop: -25,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#3d7a37',
  },
  penaltyArea: {
    position: 'absolute',
    left: '20%',
    right: '20%',
    height: 40,
    borderWidth: 2,
    borderColor: '#3d7a37',
  },
  topPenaltyArea: {
    top: 0,
    borderTopWidth: 0,
  },
  bottomPenaltyArea: {
    bottom: 0,
    borderBottomWidth: 0,
  },
  teamsContainer: {
    flex: 1,
    zIndex: 1,
  },
  teamSection: {
    flex: 1,
    padding: 6,
    minHeight: 220,
  },
  teamSectionCompact: {
    minHeight: 0,
    padding: 4,
  },
  divider: {
    height: 2,
    backgroundColor: '#3d7a37',
    marginHorizontal: 20,
    opacity: 0.5,
  },
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  teamLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  teamRating: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '600' as const,
  },
  teamHalf: {
    flex: 1,
    justifyContent: 'space-around',
  },
  teamHalfCompact: {
    justifyContent: 'space-evenly',
  },
  formationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
