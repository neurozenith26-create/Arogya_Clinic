import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { logger } from '../lib/logger.js';

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` },
  });
}

interface PgErrorLike {
  code?: string;
  detail?: string;
  constraint?: string;
  message?: string;
  column?: string;
  table?: string;
}

interface ErrorTranslation {
  status: number;
  message: string;
}

function pgErrorTranslation(err: PgErrorLike): ErrorTranslation | null {
  // 23505 unique_violation — surface which column collided when we can tell.
  if (err.code === '23505') {
    const c = err.constraint ?? '';
    let message = err.detail ?? 'A unique constraint was violated.';
    if (c.includes('email')) message = 'An account with that email already exists.';
    else if (c.includes('mobile')) message = 'An account with that mobile number already exists.';
    else if (c.includes('booking_code')) message = 'Booking code collision — please retry.';
    else if (c.includes('invoice_number')) message = 'Invoice number collision — please retry.';
    return { status: 409, message };
  }
  if (err.code === '23503') {
    return { status: 400, message: err.detail ?? 'Referenced record was not found.' };
  }
  if (err.code === '23502') {
    // not_null_violation. When pg gives us the column + table names, build
    // a useful message and (where we know it) point at the missing migration.
    if (err.column && err.table) {
      if (err.table === 'reports' && err.column === 'patient_user_id') {
        return {
          status: 500,
          message:
            "Database is out of date: reports.patient_user_id is still NOT NULL. " +
            'Run `pnpm db:migrate` to apply migration 0023_reports_patient_user_id_nullable. ' +
            "This lets walk-in patients (who have no users row) receive reports.",
        };
      }
      return {
        status: 400,
        message: `Required field "${err.column}" on table "${err.table}" is missing or NULL.`,
      };
    }
    return { status: 400, message: err.detail ?? 'A required field is missing.' };
  }
  if (err.code === '23514') {
    return { status: 400, message: err.detail ?? 'A database check constraint failed.' };
  }
  // Schema-out-of-sync errors — much more useful than a blind 500.
  if (err.code === '42703') {
    return {
      status: 500,
      message:
        'Database schema is missing a column referenced by the backend. Run `pnpm db:migrate` to apply pending migrations. ' +
        (err.message ?? ''),
    };
  }
  if (err.code === '42P01') {
    return {
      status: 500,
      message:
        'Database schema is missing a table referenced by the backend. Run `pnpm db:migrate` to apply pending migrations. ' +
        (err.message ?? ''),
    };
  }
  return null;
}

interface MulterErrorLike {
  name?: string;
  code?: string;
  field?: string;
}

function multerErrorTranslation(err: MulterErrorLike): ErrorTranslation | null {
  if (err.name !== 'MulterError') return null;
  switch (err.code) {
    case 'LIMIT_FILE_SIZE':
      return { status: 413, message: 'File is too large. Photos must be ≤ 5 MB; reports ≤ 25 MB.' };
    case 'LIMIT_UNEXPECTED_FILE':
      return { status: 400, message: `Unexpected file field: ${err.field ?? 'unknown'}.` };
    case 'LIMIT_PART_COUNT':
    case 'LIMIT_FIELD_KEY':
    case 'LIMIT_FIELD_VALUE':
    case 'LIMIT_FIELD_COUNT':
    case 'LIMIT_FILE_COUNT':
      return { status: 400, message: 'Upload exceeded a multipart limit.' };
    default:
      return { status: 400, message: 'File upload failed.' };
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    // Build a human-readable summary like:  patient.email: Invalid email; items[0].quantity: ...
    const summary = err.issues
      .map((i) => {
        const path = i.path.join('.') || '(root)';
        return `${path}: ${i.message}`;
      })
      .join('; ');
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: summary || 'Request validation failed',
        details: err.flatten(),
      },
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.statusCode).json({
      error: { code: err.code ?? 'HTTP_ERROR', message: err.message, details: err.details },
    });
    return;
  }

  // Multer surfaces upload failures via `MulterError` (file-too-large etc.).
  if (err && typeof err === 'object' && (err as MulterErrorLike).name === 'MulterError') {
    const t = multerErrorTranslation(err as MulterErrorLike);
    if (t) {
      logger.warn({ err, path: req.path, method: req.method }, 'Multer upload error');
      res
        .status(t.status)
        .json({ error: { code: (err as MulterErrorLike).code ?? 'UPLOAD_ERROR', message: t.message } });
      return;
    }
  }

  // pg errors carry a `code` string in their SQLSTATE-shaped form. Translate
  // the common constraint violations into clean client messages instead of
  // hiding them behind the generic 500.
  if (err && typeof err === 'object' && 'code' in err) {
    const t = pgErrorTranslation(err as PgErrorLike);
    if (t) {
      logger.warn({ err, path: req.path, method: req.method }, 'DB error');
      res
        .status(t.status)
        .json({ error: { code: `DB_${(err as PgErrorLike).code}`, message: t.message } });
      return;
    }
  }

  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on our side' },
  });
}
