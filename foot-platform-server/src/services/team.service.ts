import { getDb } from '../db/connection';
import { Team } from '../types';
import { NotFoundError } from '../utils/errors';

/**
 * Get all teams, optionally filtered by group.
 */
export function getAll(group?: string): Team[] {
  const db = getDb();

  if (group) {
    return db.prepare(
      'SELECT * FROM teams WHERE group_name = ? ORDER BY elo_rating DESC'
    ).all(group) as Team[];
  }

  return db.prepare(
    'SELECT * FROM teams ORDER BY group_name ASC, elo_rating DESC'
  ).all() as Team[];
}

/**
 * Get a single team by ID.
 */
export function getById(id: number): Team {
  const db = getDb();
  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(id) as Team | undefined;
  if (!team) {
    throw new NotFoundError('球队不存在');
  }
  return team;
}

/**
 * Get team by short code.
 */
export function getByShortCode(code: string): Team | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM teams WHERE short_code = ?').get(code) as Team | undefined;
}

/**
 * Create a new team (admin only).
 */
export function create(data: {
  nameZh: string;
  nameEn: string;
  shortCode: string;
  flagEmoji?: string;
  eloRating?: number;
  groupName?: string;
}): Team {
  const db = getDb();
  const result = db.prepare(
    'INSERT INTO teams (name_zh, name_en, short_code, flag_emoji, elo_rating, group_name) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(
    data.nameZh,
    data.nameEn,
    data.shortCode,
    data.flagEmoji || '',
    data.eloRating || 1500,
    data.groupName || null
  );

  return getById(result.lastInsertRowid as number);
}

/**
 * Update a team (admin only).
 */
export function update(id: number, data: {
  nameZh?: string;
  nameEn?: string;
  shortCode?: string;
  flagEmoji?: string;
  eloRating?: number;
  groupName?: string;
}): Team {
  const db = getDb();
  const existing = getById(id);

  const nameZh = data.nameZh ?? existing.name_zh;
  const nameEn = data.nameEn ?? existing.name_en;
  const shortCode = data.shortCode ?? existing.short_code;
  const flagEmoji = data.flagEmoji ?? existing.flag_emoji;
  const eloRating = data.eloRating ?? existing.elo_rating;
  const groupName = data.groupName !== undefined ? data.groupName : existing.group_name;

  db.prepare(`
    UPDATE teams
    SET name_zh = ?, name_en = ?, short_code = ?, flag_emoji = ?, elo_rating = ?, group_name = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(nameZh, nameEn, shortCode, flagEmoji, eloRating, groupName, id);

  return getById(id);
}

/**
 * Delete a team.
 */
export function remove(id: number): void {
  const db = getDb();
  getById(id); // Ensure exists

  // Check if team is used in any matches
  const matchCount = db.prepare(
    'SELECT COUNT(*) as count FROM matches WHERE home_team_id = ? OR away_team_id = ?'
  ).get(id, id) as { count: number };

  if (matchCount.count > 0) {
    throw new Error('该球队已在比赛中使用，无法删除');
  }

  db.prepare('DELETE FROM teams WHERE id = ?').run(id);
}

/**
 * Update team Elo rating directly.
 */
export function updateElo(id: number, newElo: number): void {
  const db = getDb();
  db.prepare("UPDATE teams SET elo_rating = ?, updated_at = datetime('now') WHERE id = ?")
    .run(newElo, id);
}
