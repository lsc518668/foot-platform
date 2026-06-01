import { getDb } from '../db/connection';
import { Bet, BetWithMatch } from '../types';
import { NotFoundError, AppError, BetClosedError, InsufficientBalanceError, UserFrozenError } from '../utils/errors';
import * as matchService from './match.service';
import * as oddsService from './odds.service';
import * as walletService from './wallet.service';

function getConfigValue(key: string, fallback: number): number {
  const db = getDb();
  const row = db.prepare('SELECT value FROM system_config WHERE key = ?').get(key) as { value: string } | undefined;
  return row ? Number(row.value) : fallback;
}

interface PlaceBetInput {
  userId: number;
  matchId: number;
  betType: string;
  marketType?: string;
  amount: number;
}

/**
 * Place a bet on a match.
 * - Validates the match is scheduled
 * - Gets current odds
 * - Deducts balance
 * - Creates bet record
 */
export function placeBet(input: PlaceBetInput): { bet: Bet; newBalance: number } {
  const db = getDb();

  // Validate match
  const match = matchService.getById(input.matchId);

  if (match.status !== 'scheduled') {
    throw new BetClosedError('该比赛已截止投注');
  }

  // Validate match hasn't started (date is in the future)
  const matchDate = new Date(match.match_date);
  if (matchDate <= new Date()) {
    throw new BetClosedError('比赛已开始，无法投注');
  }

  // Get current odds for the selected market
  const marketType = input.marketType || 'full_time';
  const odds = oddsService.getByMatchId(input.matchId, marketType as any);

  let oddsAtBet: number;

  // Simple markets (full_time, first_half, second_half)
  if (['full_time', 'first_half', 'second_half'].includes(marketType)) {
    switch (input.betType) {
      case 'home_win': oddsAtBet = odds.home_win_odds!; break;
      case 'draw': oddsAtBet = odds.draw_odds!; break;
      case 'away_win': oddsAtBet = odds.away_win_odds!; break;
      default: throw new AppError('无效的投注类型');
    }
  } else if (odds.odds_data) {
    // Complex markets (correct_score, penalty, corners) — find odds from JSON data
    const data = JSON.parse(odds.odds_data);
    if (marketType === 'correct_score') {
      const scoreItem = data.find((s: any) => s.score === input.betType);
      if (!scoreItem) throw new AppError('无效的比分选项');
      oddsAtBet = scoreItem.odds;
    } else {
      // penalty: yesOdds/noOdds, corners: overOdds/underOdds
      const key = input.betType === 'penalty_yes' ? 'yesOdds' : input.betType === 'penalty_no' ? 'noOdds' :
                  input.betType === 'corners_over' ? 'overOdds' : input.betType === 'corners_under' ? 'underOdds' : null;
      if (!key || !(key in data)) throw new AppError('无效的投注选项');
      oddsAtBet = data[key];
    }
  } else {
    throw new AppError('该盘口暂无赔率数据');
  }

  const potentialPayout = Math.round(input.amount * oddsAtBet * 100) / 100;

  // Validate against config limits
  const minBet = getConfigValue('min_bet_amount', 1);
  const maxBet = getConfigValue('max_bet_amount', 5000);
  if (input.amount < minBet) throw new AppError(`最小投注额为 ${minBet} 币`);
  if (input.amount > maxBet) throw new AppError(`最大投注额为 ${maxBet} 币`);

  // Atomic: create bet + deduct balance in single transaction
  const result = db.transaction(() => {
    const user = db.prepare('SELECT balance, is_frozen FROM users WHERE id = ?').get(input.userId) as { balance: number; is_frozen: number } | undefined;
    if (!user) throw new NotFoundError('用户不存在');
    if (user.is_frozen) throw new UserFrozenError();
    if (user.balance < input.amount) throw new InsufficientBalanceError(`余额不足（当前: ${user.balance.toFixed(2)}, 需要: ${input.amount.toFixed(2)}）`);

    const balanceBefore = user.balance;
    const balanceAfter = Math.round((balanceBefore - input.amount) * 100) / 100;

    db.prepare("UPDATE users SET balance = ?, updated_at = datetime('now') WHERE id = ?").run(balanceAfter, input.userId);

    // Create bet
    const betResult = db.prepare(
      'INSERT INTO bets (user_id, match_id, market_type, bet_type, amount, odds_at_bet, potential_payout) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(input.userId, input.matchId, marketType, input.betType, input.amount, oddsAtBet, potentialPayout);

    const betId = betResult.lastInsertRowid as number;

    // Record transaction with correct reference_id
    db.prepare(
      'INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, reference_id, description) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(input.userId, 'bet_placed', -input.amount, balanceBefore, balanceAfter, betId,
      `投注: ${match.homeTeam.name_zh} vs ${match.awayTeam.name_zh} (${betTypeLabel(input.betType)})`);

    return { betId, balanceAfter };
  })();

  const bet = db.prepare('SELECT * FROM bets WHERE id = ?').get(result.betId) as Bet;

  return { bet, newBalance: result.balanceAfter };
}

/**
 * Get user's bets with pagination and optional status filter.
 */
export function getUserBets(
  userId: number,
  filters: { status?: string; page?: number; limit?: number } = {}
): { bets: BetWithMatch[]; total: number } {
  const db = getDb();
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const offset = (page - 1) * limit;

  let statusCondition = '';
  const params: unknown[] = [userId];

  if (filters.status) {
    statusCondition = 'AND b.status = ?';
    params.push(filters.status);
  }

  const countResult = db.prepare(
    `SELECT COUNT(*) as count FROM bets b WHERE b.user_id = ? ${statusCondition}`
  ).get(...params) as { count: number };

  const bets = db.prepare(`
    SELECT b.*,
           m.id as m_id, m.match_date, m.venue, m.stage, m.status as match_status,
           m.home_score, m.away_score,
           ht.id as ht_id, ht.name_zh as ht_name_zh, ht.name_en as ht_name_en,
           ht.short_code as ht_short_code, ht.flag_emoji as ht_flag_emoji,
           ht.elo_rating as ht_elo_rating,
           at.id as at_id, at.name_zh as at_name_zh, at.name_en as at_name_en,
           at.short_code as at_short_code, at.flag_emoji as at_flag_emoji,
           at.elo_rating as at_elo_rating
    FROM bets b
    JOIN matches m ON b.match_id = m.id
    JOIN teams ht ON m.home_team_id = ht.id
    JOIN teams at ON m.away_team_id = at.id
    WHERE b.user_id = ? ${statusCondition}
    ORDER BY b.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as any[];

  return {
    bets: bets.map(mapBetRow),
    total: countResult.count,
  };
}

/**
 * Get a single bet by ID (with ownership check).
 */
export function getById(betId: number, userId: number): BetWithMatch {
  const db = getDb();

  const row = db.prepare(`
    SELECT b.*,
           m.id as m_id, m.match_date, m.venue, m.stage, m.status as match_status,
           m.home_score, m.away_score,
           ht.id as ht_id, ht.name_zh as ht_name_zh, ht.name_en as ht_name_en,
           ht.short_code as ht_short_code, ht.flag_emoji as ht_flag_emoji,
           ht.elo_rating as ht_elo_rating,
           at.id as at_id, at.name_zh as at_name_zh, at.name_en as at_name_en,
           at.short_code as at_short_code, at.flag_emoji as at_flag_emoji,
           at.elo_rating as at_elo_rating
    FROM bets b
    JOIN matches m ON b.match_id = m.id
    JOIN teams ht ON m.home_team_id = ht.id
    JOIN teams at ON m.away_team_id = at.id
    WHERE b.id = ? AND b.user_id = ?
  `).get(betId, userId) as any;

  if (!row) {
    throw new NotFoundError('投注记录不存在');
  }

  return mapBetRow(row);
}

/**
 * Admin: get all bets with filters.
 */
export function getAllBets(filters: {
  matchId?: number;
  userId?: number;
  status?: string;
  page?: number;
  limit?: number;
} = {}): { bets: BetWithMatch[]; total: number } {
  const db = getDb();
  const page = filters.page || 1;
  const limit = filters.limit || 50;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.matchId) { conditions.push('b.match_id = ?'); params.push(filters.matchId); }
  if (filters.userId) { conditions.push('b.user_id = ?'); params.push(filters.userId); }
  if (filters.status) { conditions.push('b.status = ?'); params.push(filters.status); }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = db.prepare(
    `SELECT COUNT(*) as count FROM bets b ${whereClause}`
  ).get(...params) as { count: number };

  const bets = db.prepare(`
    SELECT b.*,
           m.id as m_id, m.match_date, m.venue, m.stage, m.status as match_status,
           m.home_score, m.away_score,
           ht.id as ht_id, ht.name_zh as ht_name_zh, ht.name_en as ht_name_en,
           ht.short_code as ht_short_code, ht.flag_emoji as ht_flag_emoji,
           ht.elo_rating as ht_elo_rating,
           at.id as at_id, at.name_zh as at_name_zh, at.name_en as at_name_en,
           at.short_code as at_short_code, at.flag_emoji as at_flag_emoji,
           at.elo_rating as at_elo_rating,
           u.username as user_username
    FROM bets b
    JOIN matches m ON b.match_id = m.id
    JOIN teams ht ON m.home_team_id = ht.id
    JOIN teams at ON m.away_team_id = at.id
    JOIN users u ON b.user_id = u.id
    ${whereClause}
    ORDER BY b.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as any[];

  return {
    bets: bets.map(mapBetRow),
    total: countResult.count,
  };
}

// ---- Helpers ----

function betTypeLabel(type: string): string {
  switch (type) {
    case 'home_win': return '主胜';
    case 'draw': return '平局';
    case 'away_win': return '客胜';
    default: return type;
  }
}

function mapBetRow(row: any): BetWithMatch {
  return {
    id: row.id,
    user_id: row.user_id,
    match_id: row.match_id,
    market_type: row.market_type || 'full_time',
    bet_type: row.bet_type,
    amount: row.amount,
    odds_at_bet: row.odds_at_bet,
    potential_payout: row.potential_payout,
    status: row.status,
    settled_at: row.settled_at,
    created_at: row.created_at,
    match: {
      id: row.m_id,
      home_team_id: row.m_home_team_id || 0,
      away_team_id: row.m_away_team_id || 0,
      match_date: row.match_date,
      venue: row.venue,
      stage: row.stage,
      status: row.match_status,
      home_score: row.home_score,
      away_score: row.away_score,
      created_at: '',
      updated_at: '',
      homeTeam: {
        id: row.ht_id,
        name_zh: row.ht_name_zh,
        name_en: row.ht_name_en,
        short_code: row.ht_short_code,
        flag_emoji: row.ht_flag_emoji,
        elo_rating: row.ht_elo_rating,
        group_name: '',
        created_at: '',
        updated_at: '',
      },
      awayTeam: {
        id: row.at_id,
        name_zh: row.at_name_zh,
        name_en: row.at_name_en,
        short_code: row.at_short_code,
        flag_emoji: row.at_flag_emoji,
        elo_rating: row.at_elo_rating,
        group_name: '',
        created_at: '',
        updated_at: '',
      },
    },
  };
}
