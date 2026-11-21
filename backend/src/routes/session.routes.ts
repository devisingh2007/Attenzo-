import { Router } from 'express';
import { sessionController } from '../controllers/session.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import {
  startSessionSchema,
  sessionQuerySchema,
  sessionIdParamSchema,
} from '../validators/session';

const sessionRouter = Router();

// All session routes require authentication
sessionRouter.use(authenticate);

// 4.1 Start session (Teacher owner only)
sessionRouter.post(
  '/start',
  authorize('teacher'),
  validate({ body: startSessionSchema }),
  (req, res, next) => sessionController.start(req, res, next)
);

// 4.2 List sessions for a class (Teacher or Student)
sessionRouter.get(
  '/',
  validate({ query: sessionQuerySchema }),
  (req, res, next) => sessionController.list(req, res, next)
);

// 4.4 End session manually (Teacher owner only)
sessionRouter.post(
  '/:id/end',
  authorize('teacher'),
  validate({ params: sessionIdParamSchema }),
  (req, res, next) => sessionController.end(req, res, next)
);

// 4.3 Get session by ID (Teacher owner or Student member)
sessionRouter.get(
  '/:id',
  validate({ params: sessionIdParamSchema }),
  (req, res, next) => sessionController.getById(req, res, next)
);

export default sessionRouter;
