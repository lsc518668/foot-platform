import { getDb } from '../db/connection';
import { NotFoundError, AppError, ForbiddenError } from '../utils/errors';

// ---- Categories ----
export function getCategories() {
  return getDb().prepare('SELECT * FROM forum_categories ORDER BY sort_order').all();
}

// ---- Posts ----
export function getPosts(categoryId?: number, page = 1, limit = 20) {
  const db = getDb();
  const conditions: string[] = [];
  const params: any[] = [];
  if (categoryId) { conditions.push('p.category_id = ?'); params.push(categoryId); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const total = (db.prepare(`SELECT COUNT(*) as c FROM forum_posts p ${where}`).get(...params) as any).c;
  const posts = db.prepare(`
    SELECT p.*, u.username, c.name_zh as cat_name, c.name_en as cat_name_en,
           (SELECT COUNT(*) FROM forum_comments WHERE post_id = p.id) as comment_count
    FROM forum_posts p
    JOIN users u ON p.user_id = u.id
    JOIN forum_categories c ON p.category_id = c.id
    ${where}
    ORDER BY p.is_pinned DESC, p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);
  return { posts, total };
}

export function getPost(postId: number) {
  const db = getDb();
  const post = db.prepare(`
    SELECT p.*, u.username, c.name_zh as cat_name, c.name_en as cat_name_en,
           (SELECT COUNT(*) FROM forum_comments WHERE post_id = p.id) as comment_count
    FROM forum_posts p
    JOIN users u ON p.user_id = u.id
    JOIN forum_categories c ON p.category_id = c.id
    WHERE p.id = ?
  `).get(postId);
  if (!post) throw new NotFoundError('帖子不存在');
  db.prepare('UPDATE forum_posts SET view_count = view_count + 1 WHERE id = ?').run(postId);
  return post;
}

export function createPost(userId: number, title: string, content: string, categoryId: number) {
  const db = getDb();
  if (!title.trim()) throw new AppError('标题不能为空');
  if (!content.trim()) throw new AppError('内容不能为空');
  const cat = db.prepare('SELECT id FROM forum_categories WHERE id = ?').get(categoryId);
  if (!cat) throw new AppError('分类不存在');
  const r = db.prepare(
    'INSERT INTO forum_posts (user_id, category_id, title, content) VALUES (?, ?, ?, ?)'
  ).run(userId, categoryId, title.trim(), content.trim());
  return getPost(r.lastInsertRowid as number);
}

export function deletePost(postId: number, userId: number, isAdmin: boolean) {
  const db = getDb();
  const post = db.prepare('SELECT user_id FROM forum_posts WHERE id = ?').get(postId) as any;
  if (!post) throw new NotFoundError('帖子不存在');
  if (post.user_id !== userId && !isAdmin) throw new ForbiddenError('无权删除');
  db.prepare('DELETE FROM forum_comments WHERE post_id = ?').run(postId);
  db.prepare('DELETE FROM forum_posts WHERE id = ?').run(postId);
}

// ---- Comments ----
export function getComments(postId: number, page = 1, limit = 50) {
  const db = getDb();
  const offset = (page - 1) * limit;
  const total = (db.prepare('SELECT COUNT(*) as c FROM forum_comments WHERE post_id = ?').get(postId) as any).c;
  const comments = db.prepare(`
    SELECT c.*, u.username FROM forum_comments c JOIN users u ON c.user_id = u.id
    WHERE c.post_id = ? ORDER BY c.created_at ASC LIMIT ? OFFSET ?
  `).all(postId, limit, offset);
  return { comments, total };
}

export function createComment(userId: number, postId: number, content: string) {
  const db = getDb();
  if (!content.trim()) throw new AppError('评论不能为空');
  const post = db.prepare('SELECT id FROM forum_posts WHERE id = ?').get(postId);
  if (!post) throw new NotFoundError('帖子不存在');
  const r = db.prepare('INSERT INTO forum_comments (post_id, user_id, content) VALUES (?, ?, ?)')
    .run(postId, userId, content.trim());
  return db.prepare('SELECT c.*, u.username FROM forum_comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?').get(r.lastInsertRowid);
}

export function deleteComment(commentId: number, userId: number, isAdmin: boolean) {
  const db = getDb();
  const c = db.prepare('SELECT user_id FROM forum_comments WHERE id = ?').get(commentId) as any;
  if (!c) throw new NotFoundError('评论不存在');
  if (c.user_id !== userId && !isAdmin) throw new ForbiddenError('无权删除');
  db.prepare('DELETE FROM forum_comments WHERE id = ?').run(commentId);
}
