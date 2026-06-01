import { getDb } from '../db/connection';
import { Odds, MarketType } from '../types';
import { NotFoundError } from '../utils/errors';
import { calculateOdds } from '../utils/odds';
import { calcFirstHalf, calcSecondHalf, calcCorrectScore, calcPenalty, calcCorners } from '../utils/markets';
import * as teamService from './team.service';
import * as matchService from './match.service';

export function getByMatchId(matchId: number, marketType: MarketType = 'full_time'): Odds {
  const db = getDb();
  const odds = db.prepare('SELECT * FROM odds WHERE match_id = ? AND market_type = ?')
    .get(matchId, marketType) as Odds | undefined;
  if (!odds) throw new NotFoundError(`该比赛暂无"${marketType}"赔率数据`);
  return odds;
}

export function getAllByMatchId(matchId: number): Odds[] {
  const db = getDb();
  return db.prepare('SELECT * FROM odds WHERE match_id = ? ORDER BY market_type').all(matchId) as Odds[];
}

export function calculateForMatch(matchId: number): void {
  const match = matchService.getById(matchId);
  const homeTeam = teamService.getById(match.home_team_id);
  const awayTeam = teamService.getById(match.away_team_id);
  const db = getDb();

  const markets: { type: MarketType; sql: string; params: any[] }[] = [];

  // 1. Full time
  const ft = calculateOdds(homeTeam.elo_rating, awayTeam.elo_rating);
  markets.push({
    type: 'full_time',
    sql: `INSERT OR REPLACE INTO odds (match_id, market_type, home_win_odds, draw_odds, away_win_odds, is_manual_override)
          VALUES (?, 'full_time', ?, ?, ?, 0)`,
    params: [matchId, ft.homeWinOdds, ft.drawOdds, ft.awayWinOdds],
  });

  // 2. First half
  const fh = calcFirstHalf(homeTeam.elo_rating, awayTeam.elo_rating);
  markets.push({
    type: 'first_half',
    sql: `INSERT OR REPLACE INTO odds (match_id, market_type, home_win_odds, draw_odds, away_win_odds, is_manual_override)
          VALUES (?, 'first_half', ?, ?, ?, 0)`,
    params: [matchId, fh.homeWinOdds, fh.drawOdds, fh.awayWinOdds],
  });

  // 3. Second half
  const sh = calcSecondHalf(homeTeam.elo_rating, awayTeam.elo_rating);
  markets.push({
    type: 'second_half',
    sql: `INSERT OR REPLACE INTO odds (match_id, market_type, home_win_odds, draw_odds, away_win_odds, is_manual_override)
          VALUES (?, 'second_half', ?, ?, ?, 0)`,
    params: [matchId, sh.homeWinOdds, sh.drawOdds, sh.awayWinOdds],
  });

  // 4. Correct score (JSON)
  const cs = calcCorrectScore(homeTeam.elo_rating, awayTeam.elo_rating);
  markets.push({
    type: 'correct_score',
    sql: `INSERT OR REPLACE INTO odds (match_id, market_type, odds_data, is_manual_override)
          VALUES (?, 'correct_score', ?, 0)`,
    params: [matchId, JSON.stringify(cs)],
  });

  // 5. Penalty (JSON)
  const pen = calcPenalty(homeTeam.elo_rating, awayTeam.elo_rating);
  markets.push({
    type: 'penalty',
    sql: `INSERT OR REPLACE INTO odds (match_id, market_type, odds_data, is_manual_override)
          VALUES (?, 'penalty', ?, 0)`,
    params: [matchId, JSON.stringify(pen)],
  });

  // 6. Corners (JSON)
  const cor = calcCorners(homeTeam.elo_rating, awayTeam.elo_rating);
  markets.push({
    type: 'corners',
    sql: `INSERT OR REPLACE INTO odds (match_id, market_type, odds_data, is_manual_override)
          VALUES (?, 'corners', ?, 0)`,
    params: [matchId, JSON.stringify(cor)],
  });

  for (const m of markets) {
    const existing = db.prepare('SELECT is_manual_override FROM odds WHERE match_id = ? AND market_type = ?')
      .get(matchId, m.type) as { is_manual_override: number } | undefined;
    if (existing?.is_manual_override === 1) continue;
    db.prepare(m.sql).run(...m.params);
  }
}

export function manualOverride(matchId: number, marketType: MarketType, data: any): Odds {
  const db = getDb();
  matchService.getById(matchId);

  if (marketType === 'correct_score' || marketType === 'penalty' || marketType === 'corners') {
    db.prepare(`INSERT OR REPLACE INTO odds (match_id, market_type, odds_data, is_manual_override) VALUES (?, ?, ?, 1)`)
      .run(matchId, marketType, JSON.stringify(data));
  } else {
    db.prepare(`INSERT OR REPLACE INTO odds (match_id, market_type, home_win_odds, draw_odds, away_win_odds, is_manual_override)
      VALUES (?, ?, ?, ?, ?, 1)`)
      .run(matchId, marketType, data.homeWinOdds, data.drawOdds, data.awayWinOdds);
  }
  return getByMatchId(matchId, marketType);
}

export function removeOverride(matchId: number, marketType: MarketType): void {
  calculateForMatch(matchId);
}

export function recalculateForTeam(teamId: number): void {
  const db = getDb();
  const matchIds = db.prepare(`
    SELECT id FROM matches WHERE (home_team_id = ? OR away_team_id = ?) AND status = 'scheduled'
  `).all(teamId, teamId) as Array<{ id: number }>;

  for (const { id } of matchIds) {
    try { calculateForMatch(id); } catch (err) { console.warn(`[Odds] Failed for match ${id}:`, err); }
  }
}
