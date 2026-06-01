import { Request, Response, NextFunction } from 'express';
import * as forumService from '../services/forum.service';

export async function getCategories(_req: Request, res: Response, next: NextFunction) {
  try { res.json({ categories: forumService.getCategories() }); } catch (e) { next(e); }
}

export async function getPosts(req: Request, res: Response, next: NextFunction) {
  try {
    const { categoryId, page, limit } = req.query;
    const r = forumService.getPosts(categoryId ? Number(categoryId) : undefined, Number(page) || 1, Number(limit) || 20);
    res.json(r);
  } catch (e) { next(e); }
}

export async function getPost(req: Request, res: Response, next: NextFunction) {
  try { res.json({ post: forumService.getPost(Number(req.params.id)) }); } catch (e) { next(e); }
}

export async function createPost(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, content, categoryId } = req.body;
    res.status(201).json({ message: '发帖成功', post: forumService.createPost(req.user!.id, title, content, categoryId) });
  } catch (e) { next(e); }
}

export async function deletePost(req: Request, res: Response, next: NextFunction) {
  try {
    forumService.deletePost(Number(req.params.id), req.user!.id, req.user!.role === 'admin');
    res.json({ message: '帖子已删除' });
  } catch (e) { next(e); }
}

export async function getComments(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit } = req.query;
    res.json(forumService.getComments(Number(req.params.postId), Number(page) || 1, Number(limit) || 50));
  } catch (e) { next(e); }
}

export async function createComment(req: Request, res: Response, next: NextFunction) {
  try {
    const { content } = req.body;
    res.status(201).json({ message: '评论成功', comment: forumService.createComment(req.user!.id, Number(req.params.postId), content) });
  } catch (e) { next(e); }
}

export async function deleteComment(req: Request, res: Response, next: NextFunction) {
  try {
    forumService.deleteComment(Number(req.params.id), req.user!.id, req.user!.role === 'admin');
    res.json({ message: '评论已删除' });
  } catch (e) { next(e); }
}
