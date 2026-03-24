export type SportType = 'football' | 'padel' | 'tennis' | 'badminton' | 'basketball' | 'hockey' | 'rugby' | 'volleyball' | 'other';

export type Position = string;

export interface Group {
  id: string;
  name: string;
  sport: SportType;
  customSport?: string;
  playersPerTeam: number;
  playDay: string;
  playTime: string;
  costPerSession?: number;
  createdAt: number;
}

export interface Player {
  id: string;
  name: string;
  position: string;
  rating: number;
  photo?: string;
  createdAt: number;
}

export interface Restriction {
  id: string;
  player1Id: string;
  player2Id: string;
  type: 'apart' | 'together';
}

export interface Team {
  id: string;
  players: Player[];
  totalRating: number;
  averageRating: number;
}

export interface TeamOption {
  id: string;
  teamA: Team;
  teamB: Team;
  ratingDifference: number;
}

export interface MatchResult {
  id: string;
  date: string;
  teamA: Team;
  teamB: Team;
  scoreA: number;
  scoreB: number;
  playerIds: string[];
  isManualTeams: boolean;
  manOfMatchId?: string;
  createdAt: number;
}

export interface MatchDay {
  id: string;
  date: string;
  selectedPlayerIds: string[];
  generatedTeams?: TeamOption[];
}

export interface SubsPayment {
  id: string;
  playerId: string;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  date: string;
  createdAt: number;
  guestName?: string;
  voidedMatchId?: string;
}

export interface SubsSettings {
  costPerGame: number;
  lateFee: number;
  gameCost: number;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: 'equipment' | 'venue' | 'social' | 'other';
  date: string;
  createdAt: number;
}
