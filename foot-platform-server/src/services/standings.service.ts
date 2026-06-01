import { getDb } from '../db/connection';
import { Team } from '../types';

export interface GroupStanding {
  rank: number;
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

/**
 * Calculate group standings from finished matches.
 * Points: win=3, draw=1, loss=0
 * Tiebreakers: goal difference → goals scored
 */
export function getGroupStandings(): { group: string; standings: GroupStanding[] }[] {
  const db = getDb();

  // Get all teams with their group
  const teams = db.prepare('SELECT * FROM teams ORDER BY group_name, name_zh').all() as Team[];

  // Get all finished matches
  const matches = db.prepare(
    "SELECT * FROM matches WHERE status = 'finished' AND stage = 'group' AND home_score IS NOT NULL"
  ).all() as Array<{
    id: number; home_team_id: number; away_team_id: number;
    home_score: number; away_score: number; stage: string;
  }>;

  // Group teams by group name
  const groupMap = new Map<string, Team[]>();
  for (const team of teams) {
    if (!team.group_name) continue;
    if (!groupMap.has(team.group_name)) groupMap.set(team.group_name, []);
    groupMap.get(team.group_name)!.push(team);
  }

  const result: { group: string; standings: GroupStanding[] }[] = [];

  for (const [groupName, groupTeams] of groupMap.entries()) {
    // Initialize standings
    const teamStats = new Map<number, GroupStanding>();
    for (const team of groupTeams) {
      teamStats.set(team.id, {
        rank: 0,
        team,
        played: 0, won: 0, drawn: 0, lost: 0,
        goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0,
      });
    }

    // Process matches (only between teams in this group)
    for (const match of matches) {
      const homeStats = teamStats.get(match.home_team_id);
      const awayStats = teamStats.get(match.away_team_id);
      if (!homeStats || !awayStats) continue;

      homeStats.played++;
      awayStats.played++;
      homeStats.goalsFor += match.home_score;
      homeStats.goalsAgainst += match.away_score;
      awayStats.goalsFor += match.away_score;
      awayStats.goalsAgainst += match.home_score;

      if (match.home_score > match.away_score) {
        homeStats.won++;
        homeStats.points += 3;
        awayStats.lost++;
      } else if (match.home_score < match.away_score) {
        awayStats.won++;
        awayStats.points += 3;
        homeStats.lost++;
      } else {
        homeStats.drawn++;
        awayStats.drawn++;
        homeStats.points += 1;
        awayStats.points += 1;
      }
    }

    // Calculate goal difference and sort
    const standings = Array.from(teamStats.values()).map(s => ({
      ...s,
      goalDiff: s.goalsFor - s.goalsAgainst,
    }));

    standings.sort((a, b) =>
      b.points - a.points ||
      b.goalDiff - a.goalDiff ||
      b.goalsFor - a.goalsFor
    );

    // Assign ranks
    standings.forEach((s, i) => { s.rank = i + 1; });

    result.push({ group: groupName, standings });
  }

  // Sort groups alphabetically
  result.sort((a, b) => a.group.localeCompare(b.group));

  return result;
}
