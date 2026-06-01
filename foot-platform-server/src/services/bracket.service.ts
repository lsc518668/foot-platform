import { getDb } from '../db/connection';
import { Team } from '../types';
import { AppError } from '../utils/errors';
import { calculateOdds } from '../utils/odds';

interface QualifiedTeam {
  team: Team;
  group: string;
  rank: number;
  points: number;
  goalDiff: number;
  goalsFor: number;
}

/**
 * Generate knockout bracket from group stage results.
 *
 * Format: 12 groups × top 2 = 24 + 8 best 3rd place = 32 teams
 * Creates: round_of_32 → round_of_16 → quarter_final → semi_final → third_place → final
 */
export function generateKnockoutBracket(): { rounds: number; message: string } {
  const db = getDb();

  // Check for existing knockout matches
  const existing = db.prepare("SELECT COUNT(*) as c FROM matches WHERE stage != 'group'").get() as { c: number };
  if (existing.c > 0) {
    throw new AppError('淘汰赛已存在，请先删除现有淘汰赛对阵');
  }

  // Check all group matches are finished
  const unfinished = db.prepare("SELECT COUNT(*) as c FROM matches WHERE stage = 'group' AND status != 'finished'").get() as { c: number };
  if (unfinished.c > 0) {
    throw new AppError(`还有 ${unfinished.c} 场小组赛未完成，请先完成全部小组赛`);
  }

  // Get group standings
  const standings = db.prepare(`
    SELECT t.id, t.name_zh, t.name_en, t.short_code, t.flag_emoji, t.elo_rating, t.group_name,
           COUNT(m.id) as played,
           SUM(CASE WHEN (m.home_team_id = t.id AND m.home_score > m.away_score) OR
                          (m.away_team_id = t.id AND m.away_score > m.home_score) THEN 3
                    WHEN m.home_score = m.away_score THEN 1 ELSE 0 END) as points,
           SUM(CASE WHEN m.home_team_id = t.id THEN m.home_score ELSE m.away_score END) as goals_for,
           SUM(CASE WHEN m.home_team_id = t.id THEN m.away_score ELSE m.home_score END) as goals_against
    FROM teams t
    JOIN matches m ON (m.home_team_id = t.id OR m.away_team_id = t.id) AND m.stage = 'group' AND m.status = 'finished'
    WHERE t.group_name IS NOT NULL
    GROUP BY t.id
    ORDER BY t.group_name, points DESC, (goals_for - goals_against) DESC, goals_for DESC
  `).all() as any[];

  // Build qualified teams map: group → ranked teams
  const groupMap = new Map<string, QualifiedTeam[]>();
  for (const s of standings) {
    const team: Team = {
      id: s.id, name_zh: s.name_zh, name_en: s.name_en, short_code: s.short_code,
      flag_emoji: s.flag_emoji, elo_rating: s.elo_rating, group_name: s.group_name,
      created_at: '', updated_at: '',
    };
    if (!groupMap.has(s.group_name)) groupMap.set(s.group_name, []);
    const list = groupMap.get(s.group_name)!;
    list.push({
      team,
      group: s.group_name,
      rank: list.length + 1,
      points: s.points || 0,
      goalDiff: (s.goals_for || 0) - (s.goals_against || 0),
      goalsFor: s.goals_for || 0,
    });
  }

  // Top 2 from each group
  const top2: QualifiedTeam[] = [];
  const thirdPlace: QualifiedTeam[] = [];
  for (const [, teams] of groupMap) {
    top2.push(teams[0], teams[1]);
    if (teams[2]) thirdPlace.push(teams[2]);
  }

  // Best 8 third-place teams
  thirdPlace.sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor);
  const bestThird = thirdPlace.slice(0, 8);

  // All 32 qualified teams
  const allQualified = [...top2, ...bestThird];

  // Sort by group then rank for pairing
  // Simplified pairing: adjacent pairs from the sorted list
  const pairs: [QualifiedTeam, QualifiedTeam][] = [];
  for (let i = 0; i < allQualified.length; i += 2) {
    pairs.push([allQualified[i], allQualified[i + 1]]);
  }

  // Create round_of_32 matches
  const baseDate = new Date('2026-07-01T17:00:00Z');
  let dayOffset = 0;
  let matchIndex = 0;

  const stages = ['round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final'];
  const matchesPerStage = [16, 8, 4, 2, 1, 1];

  for (let stageIdx = 0; stageIdx < stages.length; stageIdx++) {
    const stage = stages[stageIdx];
    const numMatches = matchesPerStage[stageIdx];

    for (let i = 0; i < numMatches; i++) {
      const matchDate = new Date(baseDate);
      matchDate.setDate(matchDate.getDate() + dayOffset);
      matchDate.setUTCHours(i % 2 === 0 ? 17 : 20, 0, 0, 0);

      // For round_of_32, use actual teams from group results
      // For later rounds, use placeholder TBD
      let homeTeamId: number;
      let awayTeamId: number;

      if (stage === 'round_of_32') {
        const pair = pairs[matchIndex];
        homeTeamId = pair[0].team.id;
        awayTeamId = pair[1].team.id;
      } else {
        // Placeholder: use first available teams (will be updated after previous round)
        homeTeamId = allQualified[0].team.id;
        awayTeamId = allQualified[1].team.id;
      }

      const result = db.prepare(
        'INSERT INTO matches (home_team_id, away_team_id, match_date, venue, stage, status) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(homeTeamId, awayTeamId, matchDate.toISOString(), '世界杯场馆', stage, 'scheduled');

      const matchId = result.lastInsertRowid as number;

      // Calculate odds
      const homeTeam = allQualified.find(q => q.team.id === homeTeamId);
      const awayTeam = allQualified.find(q => q.team.id === awayTeamId);
      if (homeTeam && awayTeam) {
        const odds = calculateOdds(homeTeam.team.elo_rating, awayTeam.team.elo_rating);
        db.prepare(
          'INSERT INTO odds (match_id, home_win_odds, draw_odds, away_win_odds) VALUES (?, ?, ?, ?)'
        ).run(matchId, odds.homeWinOdds, odds.drawOdds, odds.awayWinOdds);
      }

      matchIndex++;
      if (i % 2 === 1) dayOffset++;
    }
    if (numMatches % 2 === 1) dayOffset++;
  }

  return {
    rounds: stages.length,
    message: `淘汰赛对阵已生成！32 强（${top2.length} 小组前二 + ${bestThird.length} 最佳第三）→ ${stages.join(' → ')}`,
  };
}
