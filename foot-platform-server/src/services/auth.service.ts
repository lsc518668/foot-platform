import { getDb } from '../db/connection';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { User, UserPublic, JwtPayload } from '../types';
import { AuthError, ConflictError, NotFoundError, AppError, UserFrozenError } from '../utils/errors';

/**
 * Generate a JWT token for a user.
 */
export function generateToken(user: { id: number; role: 'user' | 'admin' }): string {
  const payload: JwtPayload = { id: user.id, role: user.role };
  return jwt.sign(payload as object, config.jwtSecret, { expiresIn: config.jwtExpiresIn } as any);
}

/**
 * Strip password_hash from user object for API responses.
 */
export function toPublicUser(user: User): UserPublic {
  const { password_hash, ...publicUser } = user;
  return publicUser;
}

/**
 * Register a new user.
 */
export function register(data: { username: string; email: string; password: string }): { token: string; user: UserPublic } {
  const db = getDb();

  // Check unique constraints
  const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(data.email);
  if (existingEmail) {
    throw new ConflictError('该邮箱已被注册');
  }

  const existingUsername = db.prepare('SELECT id FROM users WHERE username = ?').get(data.username);
  if (existingUsername) {
    throw new ConflictError('该用户名已被使用');
  }

  const passwordHash = bcrypt.hashSync(data.password, config.bcryptRounds);
  const initialBalance = config.defaultBalance;

  const result = db.prepare(
    'INSERT INTO users (username, email, password_hash, role, balance) VALUES (?, ?, ?, ?, ?)'
  ).run(data.username, data.email, passwordHash, 'user', initialBalance);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid) as unknown as User;
  if (!user) {
    throw new AppError('注册失败，请重试', 500);
  }

  const token = generateToken(user);

  return { token, user: toPublicUser(user) };
}

/**
 * Login a user.
 */
export function login(data: { email: string; password: string }): { token: string; user: UserPublic } {
  const db = getDb();

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(data.email) as unknown as User | undefined;
  if (!user) {
    throw new AuthError('邮箱或密码错误');
  }

  if (user.is_frozen) {
    throw new UserFrozenError();
  }

  const valid = bcrypt.compareSync(data.password, user.password_hash);
  if (!valid) {
    throw new AuthError('邮箱或密码错误');
  }

  const token = generateToken(user);

  return { token, user: toPublicUser(user) };
}

/**
 * Admin login.
 */
export function adminLogin(data: { email: string; password: string }): { token: string; user: UserPublic } {
  const db = getDb();

  const user = db.prepare("SELECT * FROM users WHERE email = ? AND role = 'admin'").get(data.email) as unknown as User | undefined;
  if (!user) {
    throw new AuthError('管理员账号或密码错误');
  }

  const valid = bcrypt.compareSync(data.password, user.password_hash);
  if (!valid) {
    throw new AuthError('管理员账号或密码错误');
  }

  const token = generateToken(user);

  return { token, user: toPublicUser(user) };
}

/**
 * Get the current user by ID.
 */
export function getMe(userId: number): UserPublic {
  const db = getDb();

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as unknown as User | undefined;
  if (!user) {
    throw new NotFoundError('用户不存在');
  }

  return toPublicUser(user);
}

/**
 * Change user password.
 */
export function changePassword(userId: number, oldPassword: string, newPassword: string): void {
  const db = getDb();

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as unknown as User | undefined;
  if (!user) {
    throw new NotFoundError('用户不存在');
  }

  const valid = bcrypt.compareSync(oldPassword, user.password_hash);
  if (!valid) {
    throw new AuthError('当前密码错误');
  }

  const passwordHash = bcrypt.hashSync(newPassword, config.bcryptRounds);
  db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
    .run(passwordHash, userId);
}
