import { getDb } from '../db/connection';
import { Transaction, User } from '../types';
import { NotFoundError, InsufficientBalanceError } from '../utils/errors';

/**
 * Get user wallet info: balance + stats.
 */
export function getBalance(userId: number): { balance: number; totalWon: number; totalBetCount: number; wonBetCount: number; winRate: number } {
  const db = getDb();

  const user = db.prepare(
    'SELECT balance, total_won, total_bet_count, won_bet_count FROM users WHERE id = ?'
  ).get(userId) as Pick<User, 'balance' | 'total_won' | 'total_bet_count' | 'won_bet_count'> | undefined;

  if (!user) {
    throw new NotFoundError('用户不存在');
  }

  return {
    balance: user.balance,
    totalWon: user.total_won,
    totalBetCount: user.total_bet_count,
    wonBetCount: user.won_bet_count,
    winRate: user.total_bet_count > 0 ? Math.round((user.won_bet_count / user.total_bet_count) * 10000) / 100 : 0,
  };
}

/**
 * Deduct amount from user balance (for placing a bet).
 * Uses a transaction to ensure atomicity.
 */
export function deduct(
  userId: number,
  amount: number,
  referenceId: number,
  description: string
): { balanceBefore: number; balanceAfter: number } {
  const db = getDb();

  const result = db.transaction(() => {
    // Lock the user row for update
    const user = db.prepare('SELECT balance, is_frozen FROM users WHERE id = ?').get(userId) as { balance: number; is_frozen: number } | undefined;
    if (!user) throw new NotFoundError('用户不存在');
    if (user.is_frozen) throw new Error('账户已被冻结');
    if (user.balance < amount) throw new InsufficientBalanceError(`余额不足（当前: ${user.balance.toFixed(2)}, 需要: ${amount.toFixed(2)}）`);

    const balanceBefore = user.balance;
    const balanceAfter = Math.round((balanceBefore - amount) * 100) / 100;

    db.prepare("UPDATE users SET balance = ?, updated_at = datetime('now') WHERE id = ?")
      .run(balanceAfter, userId);

    db.prepare(
      'INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, reference_id, description) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(userId, 'bet_placed', -amount, balanceBefore, balanceAfter, referenceId, description);

    return { balanceBefore, balanceAfter };
  })();

  return result;
}

/**
 * Credit amount to user balance (for winning bets, refunds, etc.).
 */
export function credit(
  userId: number,
  amount: number,
  referenceId: number | null,
  type: 'bet_won' | 'bet_refunded' | 'admin_adjust' | 'deposit',
  description: string
): { balanceBefore: number; balanceAfter: number } {
  const db = getDb();

  const result = db.transaction(() => {
    const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId) as { balance: number } | undefined;
    if (!user) throw new NotFoundError('用户不存在');

    const balanceBefore = user.balance;
    const balanceAfter = Math.round((balanceBefore + amount) * 100) / 100;

    db.prepare("UPDATE users SET balance = ?, updated_at = datetime('now') WHERE id = ?")
      .run(balanceAfter, userId);

    db.prepare(
      'INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, reference_id, description) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(userId, type, amount, balanceBefore, balanceAfter, referenceId, description);

    return { balanceBefore, balanceAfter };
  })();

  return result;
}

/**
 * Get paginated transaction history for a user.
 */
export function getTransactions(
  userId: number,
  page: number = 1,
  limit: number = 20
): { transactions: Transaction[]; total: number } {
  const db = getDb();
  const offset = (page - 1) * limit;

  const countResult = db.prepare(
    'SELECT COUNT(*) as count FROM transactions WHERE user_id = ?'
  ).get(userId) as { count: number };

  const transactions = db.prepare(
    'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).all(userId, limit, offset) as Transaction[];

  return { transactions, total: countResult.count };
}

/**
 * Update user stats (called after bet settlement).
 */
export function updateUserStats(
  userId: number,
  isWin: boolean,
  wonAmount: number
): void {
  const db = getDb();

  if (isWin) {
    db.prepare(`
      UPDATE users
      SET total_won = total_won + ?,
          total_bet_count = total_bet_count + 1,
          won_bet_count = won_bet_count + 1,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(wonAmount, userId);
  } else {
    db.prepare(`
      UPDATE users
      SET total_bet_count = total_bet_count + 1,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(userId);
  }
}
