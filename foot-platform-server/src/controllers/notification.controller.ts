import { Request, Response, NextFunction } from 'express';
import { getDb } from '../db/connection';

export async function getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const db = getDb();
    const userId = req.user!.id;

    const notifications = db.prepare(`
      SELECT b.id, b.status as bet_status, b.amount, b.odds_at_bet, b.potential_payout, b.bet_type,
             b.settled_at, b.created_at,
             m.id as match_id, m.home_score, m.away_score,
             ht.name_zh as home_name, ht.flag_emoji as home_flag,
             at.name_zh as away_name, at.flag_emoji as away_flag
      FROM bets b
      JOIN matches m ON b.match_id = m.id
      JOIN teams ht ON m.home_team_id = ht.id
      JOIN teams at ON m.away_team_id = at.id
      WHERE b.user_id = ? AND b.status IN ('won', 'lost')
      ORDER BY b.settled_at DESC
      LIMIT 30
    `).all(userId) as any[];

    // Count unread (recent settlements in last hour = unread)
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const unreadCount = notifications.filter(n => n.settled_at && n.settled_at > oneHourAgo).length;

    res.json({
      notifications: notifications.map(n => ({
        id: n.id,
        type: n.bet_status === 'won' ? 'win' : 'loss',
        title: n.bet_status === 'won' ? '🎉 投注获胜！' : '😞 投注失利',
        message: `${n.home_flag} ${n.home_name} ${n.home_score ?? '?'}-${n.away_score ?? '?'} ${n.away_name} ${n.away_flag}`,
        detail: n.bet_status === 'won'
          ? `+${n.potential_payout.toFixed(2)} 币 (${n.amount} × ${n.odds_at_bet})`
          : `-${n.amount.toFixed(2)} 币`,
        time: n.settled_at,
      })),
      unreadCount,
    });
  } catch (err) {
    next(err);
  }
}
