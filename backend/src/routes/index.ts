import { Router } from 'express';
import authRouter from './auth.routes';
import classRouter from './class.routes';
import sessionRouter from './session.routes';
import attendanceRouter from './attendance.routes';

const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/classes', classRouter);
apiRouter.use('/sessions', sessionRouter);
apiRouter.use('/attendance', attendanceRouter);

export default apiRouter;
