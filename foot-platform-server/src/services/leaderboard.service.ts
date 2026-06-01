import { getDb } from '../db/connection';
import { LeaderboardEntry } from '../types';

/**
 * Get the top users by total winnings.
 */
export function getLeaderboard(limit: number = 100): LeaderboardEntry[] {
  const db = getDb();

  const users = db.prepare(`
    SELECT id, username, total_won, total_bet_count, won_bet_count
    FROM users
    WHERE role = 'user' AND total_bet_count > 0
    ORDER BY total_won DESC
    LIMIT ?
  `).all(limit) as Array<{
    id: number;
    username: string;
    total_won: number;
    total_bet_count: number;
    won_bet_count: number;
  }>;

  return users.map((user, index) => ({
    rank: index + 1,
    userId: user.id,
    username: user.username,
    totalWon: Math.round(user.total_won * 100) / 100,
    totalBetCount: user.total_bet_count,
    wonBetCount: user.won_bet_count,
    winRate: user.total_bet_count > 0
      ? Math.round((user.won_bet_count / user.total_bet_count) * 10000) / 100
      : 0,
  }));
}

/**
 * Get a specific user's rank on the leaderboard.
 */
export function getUserRank(userId: number): { rank: number; entry: LeaderboardEntry } | null {
  const db = getDb();

  const user = db.prepare(
    'SELECT id, username, total_won, total_bet_count, won_bet_count FROM users WHERE id = ? AND role = ?'
  ).get(userId, 'user') as { id: number; username: string; total_won: number; total_bet_count: number; won_bet_count: number } | undefined;

  if (!user) return null;

  // Count how many users have more winnings
  const higherRanked = db.prepare(
    "SELECT COUNT(*) as count FROM users WHERE role = 'user' AND total_bet_count > 0 AND total_won > ?"
  ).get(user.total_won) as { count: number };

  const rank = higherRanked.count + 1;

  return {
    rank,
    entry: {
      rank,
      userId: user.id,
      username: user.username,
      totalWon: Math.round(user.total_won * 100) / 100,
      totalBetCount: user.total_bet_count,
      wonBetCount: user.won_bet_count,
      winRate: user.total_bet_count > 0
        ? Math.round((user.won_bet_count / user.total_bet_count) * 10000) / 100
        : 0,
    },
  };
}
