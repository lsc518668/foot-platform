import { Router, Request, Response, NextFunction } from 'express';
import { getDb } from '../db/connection';
import { auth } from '../middleware/auth';
import { adminAuth } from '../middleware/adminAuth';

const router = Router();

// Public: list news
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const offset = (page - 1) * limit;

    const total = (db.prepare('SELECT COUNT(*) as c FROM news').get() as { c: number }).c;
    const news = db.prepare(`
      SELECT id, title_zh, title_en, summary_zh, summary_en, source, is_pinned, view_count, created_at
      FROM news ORDER BY is_pinned DESC, created_at DESC LIMIT ? OFFSET ?
    `).all(limit, offset);

    res.json({ news, total, page, limit });
  } catch (err) { next(err); }
});

// Public: single news
router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    db.prepare("UPDATE news SET view_count = view_count + 1 WHERE id = ?").run(id);
    const article = db.prepare('SELECT * FROM news WHERE id = ?').get(id);
    if (!article) return res.status(404).json({ error: '新闻不存在' });
    res.json({ article });
  } catch (err) { next(err); }
});

// Admin: create
router.post('/', auth, adminAuth, (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const { titleZh, titleEn, contentZh, contentEn, summaryZh, summaryEn, source, isPinned } = req.body;
    const r = db.prepare(
      'INSERT INTO news (title_zh, title_en, content_zh, content_en, summary_zh, summary_en, source, is_pinned) VALUES (?,?,?,?,?,?,?,?)'
    ).run(titleZh, titleEn || '', contentZh, contentEn || '', summaryZh || '', summaryEn || '', source || '官方', isPinned ? 1 : 0);
    res.status(201).json({ message: '新闻发布成功', id: r.lastInsertRowid });
  } catch (err) { next(err); }
});

// Admin: update
router.put('/:id', auth, adminAuth, (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const { titleZh, titleEn, contentZh, contentEn, summaryZh, summaryEn, source, isPinned } = req.body;
    db.prepare(`UPDATE news SET title_zh=?, title_en=?, content_zh=?, content_en=?, summary_zh=?, summary_en=?, source=?, is_pinned=?, updated_at=datetime('now') WHERE id=?`)
      .run(titleZh, titleEn || '', contentZh, contentEn || '', summaryZh || '', summaryEn || '', source || '官方', isPinned ? 1 : 0, Number(req.params.id));
    res.json({ message: '新闻更新成功' });
  } catch (err) { next(err); }
});

// Admin: delete
router.delete('/:id', auth, adminAuth, (req: Request, res: Response, next: NextFunction) => {
  try {
    getDb().prepare('DELETE FROM news WHERE id = ?').run(Number(req.params.id));
    res.json({ message: '新闻已删除' });
  } catch (err) { next(err); }
});

export default router;
