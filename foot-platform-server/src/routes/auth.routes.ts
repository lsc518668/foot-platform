import { Router } from 'express';
import { z } from 'zod';
import * as authController from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { auth } from '../middleware/auth';

const router = Router();

// ---- Validation Schemas ----
const registerSchema = z.object({
  username: z
    .string()
    .min(2, '用户名至少2个字符')
    .max(20, '用户名最多20个字符')
    .regex(/^[a-zA-Z0-9_一-龥]+$/, '用户名只能包含中英文、数字和下划线'),
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(6, '密码至少6个字符').max(50, '密码最多50个字符'),
});

const loginSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(1, '请输入密码'),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, '请输入当前密码'),
  newPassword: z.string().min(6, '新密码至少6个字符').max(50, '新密码最多50个字符'),
});

// ---- Routes ----
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/admin/login', validate(loginSchema), authController.adminLogin);
router.get('/me', auth, authController.getMe);
router.put('/change-password', auth, validate(changePasswordSchema), authController.changePassword);

export default router;
