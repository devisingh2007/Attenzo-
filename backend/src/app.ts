import express, { Request, Response } from 'express';

const app = express();

app.use(express.json({ limit: '10kb' }));

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

export default app;
