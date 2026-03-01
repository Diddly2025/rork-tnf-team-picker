import { Player, Team, TeamOption, Restriction } from '@/types';

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function calculateTeamStats(players: Player[]): { totalRating: number; averageRating: number } {
  const totalRating = players.reduce((sum, p) => sum + p.rating, 0);
  const averageRating = players.length > 0 ? totalRating / players.length : 0;
  return { totalRating, averageRating: Math.round(averageRating * 10) / 10 };
}

function hasApartViolation(team: Player[], restrictions: Restriction[]): boolean {
  const playerIds = new Set(team.map(p => p.id));
  return restrictions.some(r =>
    (r.type === 'apart' || !r.type) &&
    playerIds.has(r.player1Id) && playerIds.has(r.player2Id)
  );
}

function hasTogetherViolation(teamA: Player[], teamB: Player[], restrictions: Restriction[]): boolean {
  const teamAIds = new Set(teamA.map(p => p.id));
  const teamBIds = new Set(teamB.map(p => p.id));
  return restrictions.some(r => {
    if (r.type !== 'together') return false;
    const p1InA = teamAIds.has(r.player1Id);
    const p2InA = teamAIds.has(r.player2Id);
    const p1InB = teamBIds.has(r.player1Id);
    const p2InB = teamBIds.has(r.player2Id);
    return (p1InA && p2InB) || (p1InB && p2InA);
  });
}

function generateSingleTeamOption(
  players: Player[],
  restrictions: Restriction[],
  attempt: number
): TeamOption | null {
  const shuffled = shuffleArray(players);
  const teamSize = Math.floor(players.length / 2);

  let teamAPlayers: Player[] = [];
  let teamBPlayers: Player[] = [];

  const togetherRestrictions = restrictions.filter(r => r.type === 'together');
  const sortedByRating = [...shuffled].sort((a, b) => b.rating - a.rating);

  for (let i = 0; i < sortedByRating.length; i++) {
    const player = sortedByRating[i];

    const alreadyAssigned =
      teamAPlayers.some(p => p.id === player.id) ||
      teamBPlayers.some(p => p.id === player.id);
    if (alreadyAssigned) continue;

    const togetherPartnerInA = togetherRestrictions.some(r => {
      if (r.player1Id === player.id) return teamAPlayers.some(p => p.id === r.player2Id);
      if (r.player2Id === player.id) return teamAPlayers.some(p => p.id === r.player1Id);
      return false;
    });

    const togetherPartnerInB = togetherRestrictions.some(r => {
      if (r.player1Id === player.id) return teamBPlayers.some(p => p.id === r.player2Id);
      if (r.player2Id === player.id) return teamBPlayers.some(p => p.id === r.player1Id);
      return false;
    });

    if (togetherPartnerInA && teamAPlayers.length < teamSize && !hasApartViolation([...teamAPlayers, player], restrictions)) {
      teamAPlayers.push(player);
      continue;
    }
    if (togetherPartnerInB && teamBPlayers.length < teamSize && !hasApartViolation([...teamBPlayers, player], restrictions)) {
      teamBPlayers.push(player);
      continue;
    }

    const canAddToA = teamAPlayers.length < teamSize &&
      !hasApartViolation([...teamAPlayers, player], restrictions) &&
      !hasTogetherViolation([...teamAPlayers, player], teamBPlayers, restrictions);
    const canAddToB = teamBPlayers.length < teamSize &&
      !hasApartViolation([...teamBPlayers, player], restrictions) &&
      !hasTogetherViolation(teamAPlayers, [...teamBPlayers, player], restrictions);

    if (!canAddToA && !canAddToB) {
      if (teamAPlayers.length < teamSize) {
        teamAPlayers.push(player);
      } else {
        teamBPlayers.push(player);
      }
      continue;
    }

    const teamATotal = teamAPlayers.reduce((sum, p) => sum + p.rating, 0);
    const teamBTotal = teamBPlayers.reduce((sum, p) => sum + p.rating, 0);

    if (canAddToA && canAddToB) {
      if (teamATotal <= teamBTotal && teamAPlayers.length < teamSize) {
        teamAPlayers.push(player);
      } else if (teamBPlayers.length < teamSize) {
        teamBPlayers.push(player);
      } else {
        teamAPlayers.push(player);
      }
    } else if (canAddToA) {
      teamAPlayers.push(player);
    } else {
      teamBPlayers.push(player);
    }
  }

  const teamAStats = calculateTeamStats(teamAPlayers);
  const teamBStats = calculateTeamStats(teamBPlayers);

  return {
    id: `option-${attempt}-${Date.now()}`,
    teamA: {
      id: `team-a-${attempt}`,
      players: teamAPlayers,
      ...teamAStats,
    },
    teamB: {
      id: `team-b-${attempt}`,
      players: teamBPlayers,
      ...teamBStats,
    },
    ratingDifference: Math.abs(teamAStats.averageRating - teamBStats.averageRating),
  };
}

export function generateTeamOptions(
  players: Player[],
  restrictions: Restriction[],
  count: number = 4
): TeamOption[] {
  if (players.length < 2) {
    return [];
  }

  const options: TeamOption[] = [];
  const maxAttempts = count * 10;
  let attempts = 0;

  while (options.length < count && attempts < maxAttempts) {
    const option = generateSingleTeamOption(players, restrictions, attempts);
    if (option) {
      const isDuplicate = options.some(existing => {
        const existingAIds = new Set(existing.teamA.players.map(p => p.id));
        const newAIds = new Set(option.teamA.players.map(p => p.id));
        return existingAIds.size === newAIds.size &&
          [...existingAIds].every(id => newAIds.has(id));
      });

      if (!isDuplicate) {
        options.push(option);
      }
    }
    attempts++;
  }

  return options.sort((a, b) => a.ratingDifference - b.ratingDifference);
}

export function getPositionColor(position: string): string {
  switch (position) {
    case 'GK': return '#f59e0b';
    case 'DEF': return '#3b82f6';
    case 'MID': return '#22c55e';
    case 'FWD': return '#ef4444';
    default: return '#9ca3af';
  }
}

export function getRatingTier(rating: number): 'gold' | 'silver' | 'bronze' {
  if (rating >= 75) return 'gold';
  if (rating >= 50) return 'silver';
  return 'bronze';
}
