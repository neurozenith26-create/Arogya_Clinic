import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { auditLogMiddleware } from './middleware/auditLog.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { generalLimiter } from './middleware/rateLimit.js';
import publicRoutes from './modules/public/publicRoutes.js';
import authRoutes from './modules/auth/authRoutes.js';
import phase2Routes from './modules/phase2/phase2Routes.js';
import branchAdminsRoutes from './modules/phase2/branchAdminsRoutes.js';
import uploadRoutes from './modules/uploads/uploadRoutes.js';
import invoiceRoutes from './modules/invoices/invoiceRoutes.js';

const app: Express = express();

// Security + parsing
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);
app.use(
  cors({
    origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()),
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(pinoHttp({ logger }));
app.use(generalLimiter);
// Audit-log middleware registers an `res.on('finish')` listener on every
// request. The listener inspects req.user (populated by requireAuth on
// individual routes) and inserts an audit_log row for every successful
// authenticated mutating call. Public/unauthenticated requests are silently
// skipped. See middleware/auditLog.ts for the action-name derivation.
app.use(auditLogMiddleware);

// Serve uploaded files (local storage driver only — S3 serves directly)
if (env.STORAGE_DRIVER === 'local') {
  app.use('/uploads', express.static(path.resolve(env.STORAGE_LOCAL_PATH)));
}

// Health check
app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', service: 'arogya-api', timestamp: new Date().toISOString() });
});

// Custom auth (signup, login, OTP, me, change-password)
app.use('/api/v1', authRoutes);
// Public Phase 1 catalog routes
app.use('/api/v1', publicRoutes);
// Phase 2: bookings, slots, payments, admin
app.use('/api/v1', phase2Routes);
// Multi-branch: public branches list + super-admin branch+admin CRUD
app.use('/api/v1', branchAdminsRoutes);
// File uploads + downloads
app.use('/api/v1', uploadRoutes);
// Invoice PDF generation
app.use('/api/v1', invoiceRoutes);

// 404 + error handling (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, env: env.NODE_ENV, tz: env.TZ, storage: env.STORAGE_DRIVER },
    `Arogya backend listening on http://localhost:${env.PORT}`,
  );
});

function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down...');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  setTimeout(() => {
    logger.error('Forced shutdown after 10s');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export default app;
