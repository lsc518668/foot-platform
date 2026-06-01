import { Router } from 'express';
import * as forumController from '../controllers/forum.controller';
import { auth } from '../middleware/auth';

const router = Router();

router.get('/categories', forumController.getCategories);
router.get('/posts', forumController.getPosts);
router.get('/posts/:id', forumController.getPost);
router.post('/posts', auth, forumController.createPost);
router.delete('/posts/:id', auth, forumController.deletePost);
router.get('/posts/:postId/comments', forumController.getComments);
router.post('/posts/:postId/comments', auth, forumController.createComment);
router.delete('/comments/:id', auth, forumController.deleteComment);

export default router;
