import { Request, Response, NextFunction } from 'express';
import { getDb } from '../db/connection';
import * as teamService from '../services/team.service';
import * as matchService from '../services/match.service';
import * as oddsService from '../services/odds.service';
import * as betService from '../services/bet.service';
import * as settlementService from '../services/settlement.service';
import * as bracketService from '../services/bracket.service';
import * as walletService from '../services/wallet.service';
import { auditLog } from '../utils/audit';
import { DashboardStats } from '../types';

// ==================== Teams ====================

export async function getTeams(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const teams = teamService.getAll();
    res.json({ teams });
  } catch (err) { next(err); }
}

export async function createTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const team = teamService.create(req.body);
    auditLog(req.user!.id, 'create', 'team', team.id, `创建球队: ${team.name_zh}`);
    res.status(201).json({ message: '球队创建成功', team });
  } catch (err) { next(err); }
}

export async function updateTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const team = teamService.update(Number(req.params.id), req.body);
    res.json({ message: '球队更新成功', team });
  } catch (err) { next(err); }
}

export async function deleteTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    teamService.remove(Number(req.params.id));
    res.json({ message: '球队删除成功' });
  } catch (err) { next(err); }
}

// ==================== Matches ====================

export async function getMatches(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, stage, date, page, limit } = req.query;
    const result = matchService.getAll({
      status: status as string,
      stage: stage as string,
      date: date as string,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
    res.json({ matches: result.matches, total: result.total });
  } catch (err) { next(err); }
}

export async function createMatch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const match = matchService.create(req.body);
    res.status(201).json({ message: '比赛创建成功', match });
  } catch (err) { next(err); }
}

export async function updateMatch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const match = matchService.update(Number(req.params.id), req.body);
    res.json({ message: '比赛更新成功', match });
  } catch (err) { next(err); }
}

export async function deleteMatch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    matchService.remove(Number(req.params.id));
    res.json({ message: '比赛删除成功' });
  } catch (err) { next(err); }
}

export async function updateMatchStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, homeScore, awayScore } = req.body;
    const match = matchService.updateStatus(Number(req.params.id), status, homeScore, awayScore);
    res.json({ message: '比赛状态更新成功', match });
  } catch (err) { next(err); }
}

// ==================== Odds ====================

export async function getOdds(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const db = getDb();
    const odds = db.prepare(`
      SELECT o.*, m.id as match_id, ht.name_zh as home_name, at.name_zh as away_name, m.match_date, m.status
      FROM odds o
      JOIN matches m ON o.match_id = m.id
      JOIN teams ht ON m.home_team_id = ht.id
      JOIN teams at ON m.away_team_id = at.id
      ORDER BY m.match_date ASC
    `).all();
    res.json({ odds });
  } catch (err) { next(err); }
}

export async function manualOverride(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const marketType = (req.query.market as any) || 'full_time';
    const odds = oddsService.manualOverride(Number(req.params.matchId), marketType, req.body);
    res.json({ message: '赔率手动调整成功', odds });
  } catch (err) { next(err); }
}

export async function removeOverride(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    oddsService.removeOverride(Number(req.params.matchId), (req.query.market as any) || 'full_time');
    res.json({ message: '已恢复自动赔率计算' });
  } catch (err) { next(err); }
}

// ==================== Settlement ====================

export async function settleMatch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { homeScore, awayScore } = req.body;
    const result = settlementService.settleMatch(Number(req.params.matchId), homeScore, awayScore);
    auditLog(req.user!.id, 'settle', 'match', Number(req.params.matchId), `结算: ${homeScore}-${awayScore}, 赢${result.wonBets}/输${result.lostBets}/赔${result.totalPaidOut.toFixed(2)}`);
    res.json({
      message: `结算完成！${result.wonBets} 注获胜，${result.lostBets} 注失利，共赔付 ${result.totalPaidOut.toFixed(2)} 币`,
      result,
    });
  } catch (err) { next(err); }
}

// ==================== Users ====================

export async function getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const db = getDb();
    const search = req.query.search as string || '';
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const offset = (page - 1) * limit;

    let whereClause = "WHERE role = 'user'";
    const params: unknown[] = [];

    if (search) {
      whereClause += ' AND (username LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const countResult = db.prepare(`SELECT COUNT(*) as count FROM users ${whereClause}`).get(...params) as { count: number };

    const users = db.prepare(`
      SELECT id, username, email, role, balance, is_frozen, total_won, total_bet_count, won_bet_count, created_at
      FROM users ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    res.json({ users, total: countResult.count, page, limit });
  } catch (err) { next(err); }
}

export async function toggleFreeze(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const db = getDb();
    const userId = Number(req.params.id);
    const user = db.prepare('SELECT id, is_frozen FROM users WHERE id = ? AND role = ?').get(userId, 'user');
    if (!user) return next(new Error('用户不存在'));

    const { is_frozen } = user as { id: number; is_frozen: number };
    const newFrozen = is_frozen ? 0 : 1;

    db.prepare("UPDATE users SET is_frozen = ?, updated_at = datetime('now') WHERE id = ?").run(newFrozen, userId);

    auditLog(req.user!.id, newFrozen ? 'freeze' : 'unfreeze', 'user', userId, `用户ID ${userId} ${newFrozen ? '冻结' : '解冻'}`);
    res.json({ message: newFrozen ? '用户已冻结' : '用户已解冻', isFrozen: !!newFrozen });
  } catch (err) { next(err); }
}

export async function adjustBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = Number(req.params.id);
    const { amount, description } = req.body;
    walletService.credit(userId, amount, null, 'admin_adjust', description || '管理员调整余额');

    auditLog(req.user!.id, 'adjust_balance', 'user', userId, `调整余额: ${amount >= 0 ? '+' : ''}${amount}, 原因: ${description || '无'}`);
    const wallet = walletService.getBalance(userId);
    res.json({ message: `余额已调整 ${amount >= 0 ? '+' : ''}${amount}`, balance: wallet.balance });
  } catch (err) { next(err); }
}

// ==================== Bets (Admin) ====================

export async function getBets(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { matchId, userId, status, page, limit } = req.query;
    const result = betService.getAllBets({
      matchId: matchId ? Number(matchId) : undefined,
      userId: userId ? Number(userId) : undefined,
      status: status as string,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
    res.json({ bets: result.bets, total: result.total });
  } catch (err) { next(err); }
}

// ==================== Config ====================

export async function getConfig(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const db = getDb();
    const configs = db.prepare('SELECT * FROM system_config ORDER BY id ASC').all();
    res.json({ configs });
  } catch (err) { next(err); }
}

export async function updateConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const db = getDb();
    const updates = req.body as Record<string, string>;

    for (const [key, value] of Object.entries(updates)) {
      db.prepare("UPDATE system_config SET value = ?, updated_at = datetime('now') WHERE key = ?")
        .run(String(value), key);
    }

    const configs = db.prepare('SELECT * FROM system_config ORDER BY id ASC').all();
    res.json({ message: '系统配置已更新', configs });
  } catch (err) { next(err); }
}

// ==================== Dashboard ====================

export async function getDashboard(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const db = getDb();

    const totalUsers = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'user'").get() as { count: number }).count;
    const totalBets = (db.prepare('SELECT COUNT(*) as count FROM bets').get() as { count: number }).count;
    const totalBetsToday = (db.prepare("SELECT COUNT(*) as count FROM bets WHERE date(created_at) = date('now')").get() as { count: number }).count;
    const totalRevenue = (db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'bet_placed'").get() as { total: number }).total;
    const totalPaidOut = (db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'bet_won'").get() as { total: number }).total;
    const pendingSettlements = (db.prepare("SELECT COUNT(DISTINCT match_id) as count FROM bets WHERE status = 'pending'").get() as { count: number }).count;
    const activeUsers = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'user' AND is_frozen = 0").get() as { count: number }).count;

    const stats: DashboardStats = {
      totalUsers,
      totalBets,
      totalBetsToday,
      totalRevenue,
      totalPaidOut,
      pendingSettlements,
      activeUsers,
    };

    // Chart data: daily bets for last 7 days
    const dailyBets = db.prepare(`
      SELECT date(created_at) as day, COUNT(*) as count
      FROM bets WHERE created_at >= datetime('now', '-7 days')
      GROUP BY day ORDER BY day
    `).all() as any[];

    const dailyRevenue = db.prepare(`
      SELECT date(created_at) as day, SUM(CASE WHEN type='bet_placed' THEN ABS(amount) ELSE 0 END) as revenue,
             SUM(CASE WHEN type='bet_won' THEN amount ELSE 0 END) as paid
      FROM transactions WHERE created_at >= datetime('now', '-7 days')
      GROUP BY day ORDER BY day
    `).all() as any[];

    // Match distribution by stage
    const stageDist = db.prepare(`
      SELECT stage, COUNT(*) as count FROM matches GROUP BY stage
    `).all() as any[];

    res.json({ stats, charts: { dailyBets, dailyRevenue, stageDist } });
  } catch (err) { next(err); }
}

// ==================== Generate Schedule ====================

export async function generateSchedule(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const db = getDb();

    // Get all teams grouped
    const teams = db.prepare('SELECT * FROM teams ORDER BY group_name, id').all() as any[];
    const groupMap = new Map<string, any[]>();
    for (const t of teams) {
      if (!t.group_name) continue;
      if (!groupMap.has(t.group_name)) groupMap.set(t.group_name, []);
      groupMap.get(t.group_name)!.push(t);
    }

    // Round-robin: each pair plays once
    const pairings = [
      [0, 1, 2, 3], // Round 1: 0v1, 2v3
      [0, 2, 1, 3], // Round 2: 0v2, 1v3
      [0, 3, 1, 2], // Round 3: 0v3, 1v2
    ];

    const baseDate = new Date('2026-06-15T17:00:00Z');
    let dayOffset = 0;
    let matchCount = 0;

    for (const [groupName, groupTeams] of groupMap.entries()) {
      for (let round = 0; round < 3; round++) {
        const [a, b, c, d] = pairings[round];
        const matches = [
          { home: groupTeams[a], away: groupTeams[b], time: '17:00' },
          { home: groupTeams[c], away: groupTeams[d], time: '20:00' },
        ];

        for (const { home, away, time } of matches) {
          const matchDate = new Date(baseDate);
          matchDate.setDate(matchDate.getDate() + dayOffset);
          const [h, m] = time.split(':').map(Number);
          matchDate.setUTCHours(h, m, 0, 0);

          const result = db.prepare(
            'INSERT INTO matches (home_team_id, away_team_id, match_date, venue, stage) VALUES (?, ?, ?, ?, ?)'
          ).run(home.id, away.id, matchDate.toISOString(), '世界杯场馆', 'group');

          const matchId = result.lastInsertRowid as number;

          // Calculate odds
          const { calculateOdds } = require('../utils/odds');
          const odds = calculateOdds(home.elo_rating, away.elo_rating);
          db.prepare(
            'INSERT INTO odds (match_id, home_win_odds, draw_odds, away_win_odds) VALUES (?, ?, ?, ?)'
          ).run(matchId, odds.homeWinOdds, odds.drawOdds, odds.awayWinOdds);

          matchCount++;
        }
        dayOffset++;
      }
    }

    res.json({ message: `成功生成 ${matchCount} 场小组赛（${groupMap.size} 个组）`, matchCount });
  } catch (err) { next(err); }
}

// ==================== Bracket Generation ====================

export async function generateKnockout(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = bracketService.generateKnockoutBracket();
    res.json(result);
  } catch (err) { next(err); }
}

// ==================== Audit Logs ====================

export async function getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const db = getDb();
    const limit = req.query.limit ? Number(req.query.limit) : 100;
    const logs = db.prepare(`
      SELECT a.*, u.username as admin_username
      FROM audit_log a JOIN users u ON a.admin_id = u.id
      ORDER BY a.created_at DESC LIMIT ?
    `).all(limit) as any[];
    res.json({ logs });
  } catch (err) { next(err); }
}

// ==================== Export Bets CSV ====================

export async function exportBets(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const db = getDb();

    const bets = db.prepare(`
      SELECT b.id, u.username, u.email,
             ht.name_zh as home_team, at.name_zh as away_team,
             b.bet_type, b.amount, b.odds_at_bet, b.potential_payout, b.status,
             b.created_at, b.settled_at
      FROM bets b
      JOIN users u ON b.user_id = u.id
      JOIN matches m ON b.match_id = m.id
      JOIN teams ht ON m.home_team_id = ht.id
      JOIN teams at ON m.away_team_id = at.id
      ORDER BY b.created_at DESC
    `).all() as any[];

    const typeLabels: Record<string, string> = { home_win: '主胜', draw: '平局', away_win: '客胜' };
    const statusLabels: Record<string, string> = { pending: '进行中', won: '已赢', lost: '已输', cancelled: '已取消', refunded: '已退款' };

    // Build CSV
    const header = 'ID,用户名,邮箱,主队,客队,投注类型,金额,赔率,潜在回报,状态,投注时间,结算时间';
    const rows = bets.map(b =>
      `${b.id},"${b.username}","${b.email}","${b.home_team}","${b.away_team}",${typeLabels[b.bet_type] || b.bet_type},${b.amount},${b.odds_at_bet},${b.potential_payout},${statusLabels[b.status] || b.status},"${b.created_at}","${b.settled_at || ''}"`
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=bets-export.csv');
    // BOM for Excel UTF-8
    res.send('﻿' + [header, ...rows].join('\n'));
  } catch (err) { next(err); }
}
