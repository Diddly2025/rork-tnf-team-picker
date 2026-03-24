import { SportType } from '@/types';

export interface SportConfig {
  label: string;
  emoji: string;
  defaultPlayersPerTeam: number;
  hasPositions: boolean;
  positions: string[];
  scoreLabel: string;
  courtColor: string;
  courtLinesColor: string;
}

export const SPORT_CONFIGS: Record<SportType, SportConfig> = {
  football: {
    label: 'Football',
    emoji: '⚽',
    defaultPlayersPerTeam: 7,
    hasPositions: true,
    positions: ['GK', 'DEF', 'MID', 'FWD'],
    scoreLabel: 'Goals',
    courtColor: '#2d5a27',
    courtLinesColor: '#3d7a37',
  },
  padel: {
    label: 'Padel',
    emoji: '🎾',
    defaultPlayersPerTeam: 2,
    hasPositions: false,
    positions: [],
    scoreLabel: 'Sets',
    courtColor: '#1a5276',
    courtLinesColor: '#2980b9',
  },
  tennis: {
    label: 'Tennis',
    emoji: '🎾',
    defaultPlayersPerTeam: 1,
    hasPositions: false,
    positions: [],
    scoreLabel: 'Sets',
    courtColor: '#1a5276',
    courtLinesColor: '#2980b9',
  },
  badminton: {
    label: 'Badminton',
    emoji: '🏸',
    defaultPlayersPerTeam: 2,
    hasPositions: false,
    positions: [],
    scoreLabel: 'Sets',
    courtColor: '#1a5276',
    courtLinesColor: '#2980b9',
  },
  basketball: {
    label: 'Basketball',
    emoji: '🏀',
    defaultPlayersPerTeam: 5,
    hasPositions: true,
    positions: ['PG', 'SG', 'SF', 'PF', 'C'],
    scoreLabel: 'Points',
    courtColor: '#8B4513',
    courtLinesColor: '#A0522D',
  },
  hockey: {
    label: 'Hockey',
    emoji: '🏑',
    defaultPlayersPerTeam: 6,
    hasPositions: true,
    positions: ['GK', 'DEF', 'MID', 'FWD'],
    scoreLabel: 'Goals',
    courtColor: '#2d5a27',
    courtLinesColor: '#3d7a37',
  },
  rugby: {
    label: 'Rugby',
    emoji: '🏉',
    defaultPlayersPerTeam: 7,
    hasPositions: false,
    positions: [],
    scoreLabel: 'Points',
    courtColor: '#2d5a27',
    courtLinesColor: '#3d7a37',
  },
  volleyball: {
    label: 'Volleyball',
    emoji: '🏐',
    defaultPlayersPerTeam: 6,
    hasPositions: false,
    positions: [],
    scoreLabel: 'Sets',
    courtColor: '#8B6914',
    courtLinesColor: '#B8860B',
  },
  other: {
    label: 'Other',
    emoji: '🏅',
    defaultPlayersPerTeam: 5,
    hasPositions: false,
    positions: [],
    scoreLabel: 'Points',
    courtColor: '#34495e',
    courtLinesColor: '#5d6d7e',
  },
};

export const SPORT_OPTIONS: { value: SportType; label: string; emoji: string }[] = [
  { value: 'football', label: 'Football', emoji: '⚽' },
  { value: 'padel', label: 'Padel', emoji: '🎾' },
  { value: 'tennis', label: 'Tennis', emoji: '🎾' },
  { value: 'badminton', label: 'Badminton', emoji: '🏸' },
  { value: 'basketball', label: 'Basketball', emoji: '🏀' },
  { value: 'hockey', label: 'Hockey', emoji: '🏑' },
  { value: 'rugby', label: 'Rugby', emoji: '🏉' },
  { value: 'volleyball', label: 'Volleyball', emoji: '🏐' },
  { value: 'other', label: 'Other', emoji: '🏅' },
];

export const DAY_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function getSportConfig(sport: SportType): SportConfig {
  return SPORT_CONFIGS[sport];
}

export function getSportLabel(sport: SportType, customSport?: string): string {
  if (sport === 'other' && customSport) return customSport;
  return SPORT_CONFIGS[sport].label;
}

export function getPositionColorForSport(position: string): string {
  switch (position) {
    case 'GK': return '#f59e0b';
    case 'DEF': return '#3b82f6';
    case 'MID': return '#22c55e';
    case 'FWD': return '#ef4444';
    case 'PG': return '#8b5cf6';
    case 'SG': return '#3b82f6';
    case 'SF': return '#22c55e';
    case 'PF': return '#f59e0b';
    case 'C': return '#ef4444';
    default: return '#9ca3af';
  }
}
