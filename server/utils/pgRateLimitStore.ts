import type { Store, Options, IncrementResponse } from 'express-rate-limit';
import { pool } from '../db';

/**
 * A Postgres-backed store for express-rate-limit.
 *
 * The default MemoryStore keeps counters in process memory, so on a multi-
 * instance deployment (e.g. Replit autoscale) each instance enforces the limit
 * independently — the effective limit becomes N× the configured value, and every
 * restart resets all counters. This store keeps the counters in a shared table so
 * a limit holds across all instances and survives restarts.
 *
 * Use one instance per limiter with a distinct `prefix` so different limiters do
 * not share a key namespace (they are usually all keyed by client IP).
 */

// Ensure the backing table exists exactly once per process. On failure the
// promise is cleared so a later request can retry rather than caching the error.
let tableReady: Promise<void> | null = null;
function ensureTable(): Promise<void> {
  if (!tableReady) {
    tableReady = pool
      .query(
        `CREATE TABLE IF NOT EXISTS rate_limit_hits (
           key text PRIMARY KEY,
           hits integer NOT NULL DEFAULT 0,
           reset_at timestamptz NOT NULL
         )`
      )
      .then(() => undefined)
      .catch((err) => {
        tableReady = null;
        throw err;
      });
  }
  return tableReady;
}

export class PgRateLimitStore implements Store {
  private windowMs = 60_000;
  readonly prefix: string;
  // Counters live in a shared table, not this process's memory.
  readonly localKeys = false;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  private namespacedKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  async increment(key: string): Promise<IncrementResponse> {
    await ensureTable();
    // Atomically bump the counter within the current window, or start a fresh
    // window if the previous one has expired.
    const { rows } = await pool.query(
      `INSERT INTO rate_limit_hits (key, hits, reset_at)
       VALUES ($1, 1, now() + ($2::bigint * interval '1 millisecond'))
       ON CONFLICT (key) DO UPDATE SET
         hits = CASE WHEN rate_limit_hits.reset_at < now() THEN 1
                     ELSE rate_limit_hits.hits + 1 END,
         reset_at = CASE WHEN rate_limit_hits.reset_at < now()
                         THEN now() + ($2::bigint * interval '1 millisecond')
                         ELSE rate_limit_hits.reset_at END
       RETURNING hits, reset_at`,
      [this.namespacedKey(key), this.windowMs]
    );
    return {
      totalHits: rows[0].hits,
      resetTime: new Date(rows[0].reset_at),
    };
  }

  async decrement(key: string): Promise<void> {
    await ensureTable();
    await pool.query(
      `UPDATE rate_limit_hits
         SET hits = GREATEST(0, hits - 1)
       WHERE key = $1 AND reset_at >= now()`,
      [this.namespacedKey(key)]
    );
  }

  async resetKey(key: string): Promise<void> {
    await ensureTable();
    await pool.query(`DELETE FROM rate_limit_hits WHERE key = $1`, [
      this.namespacedKey(key),
    ]);
  }
}

/**
 * Returns a Postgres-backed store when the app is running against Postgres
 * (production or USE_POSTGRES=true), otherwise `undefined` so express-rate-limit
 * falls back to its in-memory store — fine for single-instance development.
 */
export function makeRateLimitStore(prefix: string): Store | undefined {
  const usePostgres =
    process.env.USE_POSTGRES === 'true' || process.env.NODE_ENV === 'production';
  return usePostgres ? new PgRateLimitStore(prefix) : undefined;
}
