import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { loginSchema, refreshTokenSchema, changePasswordSchema } from './auth.validation';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiter for login attempts
const loginLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '300000'), // 5 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '5'),
  message: 'Trop de tentatives de connexion, veuillez réessayer plus tard',
  standardHeaders: true,
  legacyHeaders: false,
});

// Public routes
router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshTokenSchema), authController.refreshToken);

// Protected routes
router.post('/logout', authenticate, authController.logout);
router.post('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);
router.get('/me', authenticate, authController.getCurrentUser);

export default router;
