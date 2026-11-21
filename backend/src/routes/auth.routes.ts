import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { authLimiter } from '../middleware/rateLimiters';
import { authenticate } from '../middleware/authenticate';
import { registerSchema, loginSchema } from '../validators/auth';

const authRouter = Router();

authRouter.post('/register', authLimiter, validate({ body: registerSchema }), (req, res, next) =>
  authController.register(req, res, next)
);

authRouter.post('/login', authLimiter, validate({ body: loginSchema }), (req, res, next) =>
  authController.login(req, res, next)
);

authRouter.get('/me', authenticate, (req, res, next) =>
  authController.me(req, res, next)
);

authRouter.post('/logout', authenticate, (req, res, next) =>
  authController.logout(req, res, next)
);

export default authRouter;
