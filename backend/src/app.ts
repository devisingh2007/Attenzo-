import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors, { CorsOptions } from 'cors';
import { env } from './config/env';
import { globalLimiter } from './middleware/rateLimiters';
import apiRouter from './routes';
import { notFoundHandler } from './middleware/notFound';
import { errorHandler } from './middleware/errorHandler';
import { ApiError } from './utils/ApiError';

const app = express();

// 1. Helmet default security headers
app.use(helmet());

// 2. CORS allow-list from CORS_ORIGINS
const allowedOrigins = env.CORS_ORIGINS.split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no Origin header (e.g. native mobile app, curl, server-to-server)
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new ApiError(403, 'FORBIDDEN', `Origin '${origin}' not allowed by CORS`));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));

// 3. Request body size limit (10kb)
app.use(express.json({ limit: '10kb' }));

// 4. Health check endpoint (outside /api and bypasses rate limiting per API.md §6)
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// 5. Global rate limiter (100 req / 15 min / IP)
app.use(globalLimiter);

// 6. Mount API routes
app.use('/api', apiRouter);

// 7. 404 handler for unknown routes
app.use(notFoundHandler);

// 8. Central error handler (must be last)
app.use(errorHandler);

export { app };
export default app;
