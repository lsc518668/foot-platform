import { Router, Request, Response, NextFunction } from 'express';
import { getDb } from '../db/connection';
import { auth } from '../middleware/auth';
import * as oddsService from '../services/odds.service';
import * as matchService from '../services/match.service';
import { AppError, NotFoundError, InsufficientBalanceError, UserFrozenError, BetClosedError } from '../utils/errors';

const router = Router();

// Place a parlay bet (multi-leg)
router.post('/', auth, (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const userId = req.user!.id;
    const { legs, amount } = req.body;

    // Validate input
    if (!Array.isArray(legs) || legs.length < 2) throw new AppError('串关至少需要2场比赛');
    if (legs.length > 8) throw new AppError('串关最多支持8场比赛');
    if (!amount || amount <= 0) throw new AppError('投注金额必须大于0');

    // Check user
    const user = db.prepare('SELECT balance, is_frozen FROM users WHERE id = ?').get(userId) as any;
    if (!user) throw new NotFoundError('用户不存在');
    if (user.is_frozen) throw new UserFrozenError();
    if (user.balance < amount) throw new InsufficientBalanceError('余额不足');

    // Validate config limits
    const minBet = Number((db.prepare("SELECT value FROM system_config WHERE key='min_bet_amount'").get() as any)?.value || 1);
    const maxBet = Number((db.prepare("SELECT value FROM system_config WHERE key='max_bet_amount'").get() as any)?.value || 5000);
    if (amount < minBet) throw new AppError(`最小投注额为 ${minBet} 币`);
    if (amount > maxBet) throw new AppError(`最大投注额为 ${maxBet} 币`);

    // Validate each leg and calculate total odds
    const legDetails: { matchId: number; marketType: string; betType: string; odds: number; matchName: string }[] = [];

    for (const leg of legs) {
      const match = matchService.getById(leg.matchId);
      if (match.status !== 'scheduled') throw new BetClosedError(`比赛已截止: ${match.homeTeam?.name_zh} vs ${match.awayTeam?.name_zh}`);

      const marketType = leg.marketType || 'full_time';
      const odds = oddsService.getByMatchId(leg.matchId, marketType as any);

      let legOdds: number;
      if (['full_time', 'first_half', 'second_half'].includes(marketType)) {
        switch (leg.betType) {
          case 'home_win': legOdds = odds.home_win_odds!; break;
          case 'draw': legOdds = odds.draw_odds!; break;
          case 'away_win': legOdds = odds.away_win_odds!; break;
          default: throw new AppError(`无效投注类型: ${leg.betType}`);
        }
      } else if (odds.odds_data) {
        const data = JSON.parse(odds.odds_data);
        if (marketType === 'correct_score') {
          const si = data.find((s: any) => s.score === leg.betType);
          if (!si) throw new AppError('无效比分选项');
          legOdds = si.odds;
        } else {
          const key = leg.betType === 'penalty_yes' ? 'yesOdds' : leg.betType === 'penalty_no' ? 'noOdds' :
                      leg.betType === 'corners_over' ? 'overOdds' : leg.betType === 'corners_under' ? 'underOdds' : null;
          if (!key || !(key in data)) throw new AppError('无效选项');
          legOdds = data[key];
        }
      } else {
        throw new AppError('无赔率数据');
      }

      legDetails.push({
        matchId: leg.matchId, marketType, betType: leg.betType, odds: legOdds,
        matchName: `${match.homeTeam?.name_zh} vs ${match.awayTeam?.name_zh}`,
      });
    }

    // Calculate total odds and payout
    const totalOdds = Math.round(legDetails.reduce((acc, l) => acc * l.odds, 1) * 100) / 100;
    const potentialPayout = Math.round(amount * totalOdds * 100) / 100;

    // Atomic transaction
    db.transaction(() => {
      // Deduct balance
      const balanceAfter = Math.round((user.balance - amount) * 100) / 100;
      db.prepare("UPDATE users SET balance = ?, updated_at = datetime('now') WHERE id = ?").run(balanceAfter, userId);

      // Create parlay ticket
      const ticket = db.prepare(
        'INSERT INTO parlay_tickets (user_id, stake, total_odds, potential_payout, legs_count) VALUES (?, ?, ?, ?, ?)'
      ).run(userId, amount, totalOdds, potentialPayout, legs.length);
      const ticketId = ticket.lastInsertRowid as number;

      // Create individual bets
      for (const leg of legDetails) {
        db.prepare(
          'INSERT INTO bets (user_id, match_id, market_type, bet_type, amount, odds_at_bet, potential_payout, parlay_id) VALUES (?, ?, ?, ?, 0, ?, ?, ?)'
        ).run(userId, leg.matchId, leg.marketType, leg.betType, leg.odds, leg.odds * amount, ticketId);
      }

      // Record transaction
      db.prepare(
        'INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, reference_id, description) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(userId, 'bet_placed', -amount, user.balance, balanceAfter, ticketId, `串关${legs.length}串1: ${legDetails.map(l => l.matchName).join(' | ')}`);

      return { ticketId, balanceAfter };
    })();

    res.status(201).json({
      message: `${legs.length}串1 投注成功`,
      ticket: { id: (db.prepare('SELECT last_insert_rowid() as id').get() as any)?.id, legs: legs.length, stake: amount, totalOdds, potentialPayout },
      legs: legDetails,
    });
  } catch (err) { next(err); }
});

// Get user's parlay tickets
router.get('/my', auth, (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const tickets = db.prepare(`
      SELECT pt.*, COUNT(b.id) as leg_count,
        SUM(CASE WHEN b.status='won' THEN 1 ELSE 0 END) as won_count,
        SUM(CASE WHEN b.status='lost' THEN 1 ELSE 0 END) as lost_count
      FROM parlay_tickets pt
      LEFT JOIN bets b ON b.parlay_id = pt.id
      WHERE pt.user_id = ?
      GROUP BY pt.id
      ORDER BY pt.created_at DESC
      LIMIT 50
    `).all(req.user!.id);

    res.json({ tickets });
  } catch (err) { next(err); }
});

export default router;
