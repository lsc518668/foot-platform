import { getDb } from '../db/connection';
import { Match, MatchWithTeams, Odds, Team } from '../types';
import { NotFoundError, AppError } from '../utils/errors';
import { calculateOdds } from '../utils/odds';
import { simulateScore } from '../utils/simulate';
import * as teamService from './team.service';
import * as oddsService from './odds.service';

/**
 * Auto-transition match statuses based on time.
 * scheduled → live when match_date passes.
 * live → finished (with simulated scores) when 90+ min elapsed.
 */
export function autoTransitionStatuses(): { transitioned: number } {
  const db = getDb();
  const now = new Date();
  let count = 0;

  // scheduled → live
  const scheduledMatches = db.prepare(
    "SELECT id, match_date FROM matches WHERE status = 'scheduled'"
  ).all() as Array<{ id: number; match_date: string }>;

  for (const m of scheduledMatches) {
    if (new Date(m.match_date) <= now) {
      db.prepare("UPDATE matches SET status = 'live', updated_at = datetime('now') WHERE id = ?").run(m.id);
      count++;
      console.log(`[Auto] Match ${m.id}: scheduled → live`);
    }
  }

  // live → finished (90 minutes after match start, Elo+Poisson simulation)
  const ninetyMin = 90 * 60 * 1000;
  const liveMatches = db.prepare(
    `SELECT m.id, m.match_date, ht.elo_rating as home_elo, at.elo_rating as away_elo
     FROM matches m
     JOIN teams ht ON m.home_team_id = ht.id
     JOIN teams at ON m.away_team_id = at.id
     WHERE m.status = 'live'`
  ).all() as Array<{ id: number; match_date: string; home_elo: number; away_elo: number }>;

  for (const m of liveMatches) {
    const elapsed = now.getTime() - new Date(m.match_date).getTime();
    if (elapsed >= ninetyMin) {
      const [homeScore, awayScore] = simulateScore(m.home_elo, m.away_elo);
      db.prepare(
        "UPDATE matches SET status = 'finished', home_score = ?, away_score = ?, updated_at = datetime('now') WHERE id = ?"
      ).run(homeScore, awayScore, m.id);
      count++;
      console.log(`[Auto] Match ${m.id}: live → finished (${homeScore}-${awayScore}) [Elo: ${m.home_elo} vs ${m.away_elo}]`);
    }
  }

  return { transitioned: count };
}

interface MatchFilters {
  status?: string;
  stage?: string;
  date?: string;
  page?: number;
  limit?: number;
}

/**
 * Get all matches with filters and pagination.
 */
export function getAll(filters: MatchFilters = {}): { matches: MatchWithTeams[]; total: number } {
  autoTransitionStatuses();
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.status) {
    conditions.push('m.status = ?');
    params.push(filters.status);
  }
  if (filters.stage) {
    conditions.push('m.stage = ?');
    params.push(filters.stage);
  }
  if (filters.date) {
    conditions.push('date(m.match_date) = date(?)');
    params.push(filters.date);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const offset = (page - 1) * limit;

  const countResult = db.prepare(
    `SELECT COUNT(*) as count FROM matches m ${whereClause}`
  ).get(...params) as { count: number };

  const matches = db.prepare(`
    SELECT m.*,
           ht.id as ht_id, ht.name_zh as ht_name_zh, ht.name_en as ht_name_en, ht.short_code as ht_short_code,
           ht.flag_emoji as ht_flag_emoji, ht.elo_rating as ht_elo_rating, ht.group_name as ht_group_name,
           at.id as at_id, at.name_zh as at_name_zh, at.name_en as at_name_en, at.short_code as at_short_code,
           at.flag_emoji as at_flag_emoji, at.elo_rating as at_elo_rating, at.group_name as at_group_name,
           o.id as o_id, o.home_win_odds, o.draw_odds, o.away_win_odds, o.is_manual_override
    FROM matches m
    JOIN teams ht ON m.home_team_id = ht.id
    JOIN teams at ON m.away_team_id = at.id
    LEFT JOIN odds o ON m.id = o.match_id AND o.market_type = 'full_time'
    ${whereClause}
    ORDER BY m.match_date ASC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as any[];

  return {
    matches: matches.map(mapMatchRow),
    total: countResult.count,
  };
}

/**
 * Get a single match by ID with teams and odds.
 */
export function getById(id: number): MatchWithTeams {
  const db = getDb();

  const row = db.prepare(`
    SELECT m.*,
           ht.id as ht_id, ht.name_zh as ht_name_zh, ht.name_en as ht_name_en, ht.short_code as ht_short_code,
           ht.flag_emoji as ht_flag_emoji, ht.elo_rating as ht_elo_rating, ht.group_name as ht_group_name,
           at.id as at_id, at.name_zh as at_name_zh, at.name_en as at_name_en, at.short_code as at_short_code,
           at.flag_emoji as at_flag_emoji, at.elo_rating as at_elo_rating, at.group_name as at_group_name,
           o.id as o_id, o.home_win_odds, o.draw_odds, o.away_win_odds, o.is_manual_override, o.calculated_at
    FROM matches m
    JOIN teams ht ON m.home_team_id = ht.id
    JOIN teams at ON m.away_team_id = at.id
    LEFT JOIN odds o ON m.id = o.match_id AND o.market_type = 'full_time'
    WHERE m.id = ?
  `).get(id) as any;

  if (!row) {
    throw new NotFoundError('比赛不存在');
  }

  return mapMatchRow(row);
}

/**
 * Create a new match and auto-calculate odds.
 */
export function create(data: {
  homeTeamId: number;
  awayTeamId: number;
  matchDate: string;
  venue?: string;
  stage?: string;
}): MatchWithTeams {
  const db = getDb();

  // Validate teams exist
  teamService.getById(data.homeTeamId);
  teamService.getById(data.awayTeamId);

  if (data.homeTeamId === data.awayTeamId) {
    throw new AppError('主队和客队不能相同');
  }

  const result = db.prepare(
    'INSERT INTO matches (home_team_id, away_team_id, match_date, venue, stage) VALUES (?, ?, ?, ?, ?)'
  ).run(
    data.homeTeamId,
    data.awayTeamId,
    data.matchDate,
    data.venue || '',
    data.stage || 'group'
  );

  const matchId = result.lastInsertRowid as number;

  // Auto-calculate odds
  calculateAndSaveOdds(matchId, data.homeTeamId, data.awayTeamId);

  return getById(matchId);
}

/**
 * Update a match. Recalculates odds if team IDs changed.
 */
export function update(id: number, data: {
  homeTeamId?: number;
  awayTeamId?: number;
  matchDate?: string;
  venue?: string;
  stage?: string;
}): MatchWithTeams {
  const db = getDb();
  const existing = getById(id);

  const homeTeamId = data.homeTeamId ?? existing.home_team_id;
  const awayTeamId = data.awayTeamId ?? existing.away_team_id;
  const matchDate = data.matchDate ?? existing.match_date;
  const venue = data.venue ?? existing.venue;
  const stage = data.stage ?? existing.stage;

  db.prepare(`
    UPDATE matches
    SET home_team_id = ?, away_team_id = ?, match_date = ?, venue = ?, stage = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(homeTeamId, awayTeamId, matchDate, venue, stage, id);

  // Recalculate odds if teams changed
  if (data.homeTeamId || data.awayTeamId) {
    calculateAndSaveOdds(id, homeTeamId, awayTeamId);
  }

  return getById(id);
}

/**
 * Update match status.
 */
export function updateStatus(id: number, status: string, homeScore?: number, awayScore?: number): MatchWithTeams {
  const db = getDb();
  getById(id); // Ensure exists

  if (status === 'finished') {
    db.prepare(`
      UPDATE matches SET status = ?, home_score = ?, away_score = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(status, homeScore ?? null, awayScore ?? null, id);
  } else {
    db.prepare("UPDATE matches SET status = ?, updated_at = datetime('now') WHERE id = ?")
      .run(status, id);
  }

  return getById(id);
}

/**
 * Delete a match (only if no bets exist).
 */
export function remove(id: number): void {
  const db = getDb();
  getById(id);

  const betCount = db.prepare('SELECT COUNT(*) as count FROM bets WHERE match_id = ?').get(id) as { count: number };
  if (betCount.count > 0) {
    throw new AppError('该比赛已有投注记录，无法删除');
  }

  db.prepare('DELETE FROM odds WHERE match_id = ?').run(id);
  db.prepare('DELETE FROM matches WHERE id = ?').run(id);
}

/**
 * Get matches that need settlement (finished but have pending bets).
 */
export function getPendingSettlements(): MatchWithTeams[] {
  const db = getDb();

  const rows = db.prepare(`
    SELECT DISTINCT m.*,
           ht.id as ht_id, ht.name_zh as ht_name_zh, ht.name_en as ht_name_en, ht.short_code as ht_short_code,
           ht.flag_emoji as ht_flag_emoji, ht.elo_rating as ht_elo_rating, ht.group_name as ht_group_name,
           at.id as at_id, at.name_zh as at_name_zh, at.name_en as at_name_en, at.short_code as at_short_code,
           at.flag_emoji as at_flag_emoji, at.elo_rating as at_elo_rating, at.group_name as at_group_name
    FROM matches m
    JOIN teams ht ON m.home_team_id = ht.id
    JOIN teams at ON m.away_team_id = at.id
    JOIN bets b ON m.id = b.match_id
    WHERE m.status = 'finished' AND b.status = 'pending'
  `).all() as any[];

  return rows.map(r => ({
    ...mapMatchRow(r),
    odds: undefined,
  }));
}

// ---- Private Helpers ----

function calculateAndSaveOdds(matchId: number, _homeTeamId: number, _awayTeamId: number): void {
  try {
    oddsService.calculateForMatch(matchId);
  } catch (err) {
    console.error(`[Match] Failed to calculate odds for match ${matchId}:`, err);
  }
}

function mapMatchRow(row: any): MatchWithTeams {
  const homeTeam: Team = {
    id: row.ht_id,
    name_zh: row.ht_name_zh,
    name_en: row.ht_name_en,
    short_code: row.ht_short_code,
    flag_emoji: row.ht_flag_emoji,
    elo_rating: row.ht_elo_rating,
    group_name: row.ht_group_name,
    created_at: '',
    updated_at: '',
  };

  const awayTeam: Team = {
    id: row.at_id,
    name_zh: row.at_name_zh,
    name_en: row.at_name_en,
    short_code: row.at_short_code,
    flag_emoji: row.at_flag_emoji,
    elo_rating: row.at_elo_rating,
    group_name: row.at_group_name,
    created_at: '',
    updated_at: '',
  };

  let odds: Odds | undefined;
  if (row.o_id) {
    odds = {
      id: row.o_id,
      match_id: row.id,
      market_type: 'full_time' as any,
      home_win_odds: row.home_win_odds,
      draw_odds: row.draw_odds,
      away_win_odds: row.away_win_odds,
      odds_data: null,
      is_manual_override: row.is_manual_override || 0,
      calculated_at: row.calculated_at || '',
    };
  }

  return {
    id: row.id,
    home_team_id: row.home_team_id,
    away_team_id: row.away_team_id,
    match_date: row.match_date,
    venue: row.venue,
    stage: row.stage,
    status: row.status,
    home_score: row.home_score,
    away_score: row.away_score,
    created_at: row.created_at,
    updated_at: row.updated_at,
    homeTeam,
    awayTeam,
    odds,
  };
}
