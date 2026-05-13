import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { logger } from './logger.js';

export interface StoredFile {
  key: string; // relative storage key, e.g. "reports/abc-123.pdf"
  url: string; // publicly resolvable URL
  size: number;
  mime: string;
  filename: string;
}

export interface SignedUrlOptions {
  expiresInSeconds?: number;
}

/**
 * Pluggable storage adapter. Implementations: local filesystem (dev),
 * S3 / R2 / GCS / Supabase Storage (production — add later by implementing
 * this interface).
 */
export interface StorageAdapter {
  /** Persist a buffer to the given folder; returns metadata. */
  upload(folder: string, file: { buffer: Buffer; filename: string; mime: string }): Promise<StoredFile>;
  /** Generate a (possibly time-limited) URL to download a previously stored file. */
  getSignedUrl(key: string, options?: SignedUrlOptions): Promise<string>;
  /** Permanently delete a stored file. No-op if it doesn't exist. */
  delete(key: string): Promise<void>;
}

class LocalStorageAdapter implements StorageAdapter {
  constructor(
    private readonly basePath: string,
    private readonly publicBaseUrl: string,
  ) {}

  private safePath(key: string): string {
    // prevent path-traversal
    const normalized = path.posix.normalize(key).replace(/^(\.\.[/\\])+/, '');
    return path.join(this.basePath, normalized);
  }

  async upload(
    folder: string,
    file: { buffer: Buffer; filename: string; mime: string },
  ): Promise<StoredFile> {
    const ext = path.extname(file.filename) || '';
    const id = crypto.randomUUID();
    const safeFolder = folder.replace(/[^a-zA-Z0-9_\-/]/g, '');
    const key = path.posix.join(safeFolder, `${id}${ext}`);
    const target = this.safePath(key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, file.buffer);
    return {
      key,
      url: `${this.publicBaseUrl.replace(/\/$/, '')}/${key}`,
      size: file.buffer.byteLength,
      mime: file.mime,
      filename: file.filename,
    };
  }

  async getSignedUrl(key: string): Promise<string> {
    // Local files don't need signing — return the public URL.
    // (In production, the S3 adapter returns a proper presigned URL.)
    return `${this.publicBaseUrl.replace(/\/$/, '')}/${key}`;
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(this.safePath(key));
    } catch (err: unknown) {
      const e = err as NodeJS.ErrnoException;
      if (e.code !== 'ENOENT') throw err;
    }
  }
}

/* ── Wiring ──────────────────────────────────────────────────────────── */

function buildStorage(): StorageAdapter {
  if (env.STORAGE_DRIVER === 'local') {
    return new LocalStorageAdapter(
      path.resolve(env.STORAGE_LOCAL_PATH),
      env.STORAGE_PUBLIC_BASE_URL,
    );
  }
  // 's3' adapter (and similar) — add when needed.
  logger.warn(
    { driver: env.STORAGE_DRIVER },
    'Requested storage driver not yet implemented — falling back to local',
  );
  return new LocalStorageAdapter(
    path.resolve(env.STORAGE_LOCAL_PATH),
    env.STORAGE_PUBLIC_BASE_URL,
  );
}

export const storage: StorageAdapter = buildStorage();
