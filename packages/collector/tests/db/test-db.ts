import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';

const MIGRATIONS_DIR = join(import.meta.dirname, '../../../../supabase/migrations');
const SHIM = readFileSync(join(import.meta.dirname, 'supabase-shim.sql'), 'utf8');

/** Postgres en mémoire (PGlite) avec les migrations du dépôt appliquées dans l'ordre. */
export async function createTestDb(): Promise<PGlite> {
  const db = await PGlite.create({ extensions: { pg_trgm } });
  await db.exec(SHIM);
  for (const file of readdirSync(MIGRATIONS_DIR).sort()) {
    if (file.endsWith('.sql')) {
      await db.exec(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'));
    }
  }
  return db;
}

type Role = 'anon' | 'authenticated' | 'service_role';

/**
 * Exécute `fn` comme le ferait l'API Supabase pour ce rôle et cet e-mail,
 * puis annule la transaction : chaque test repart d'une base propre.
 */
export async function asRole<T>(
  db: PGlite,
  role: Role,
  email: string | null,
  fn: (query: PGlite['query']) => Promise<T>,
): Promise<T> {
  await db.exec('begin');
  try {
    const claims = JSON.stringify(email ? { role, email } : { role });
    await db.query("select set_config('request.jwt.claims', $1, true)", [claims]);
    await db.exec(`set local role ${role}`);
    return await fn(db.query.bind(db));
  } finally {
    await db.exec('rollback');
  }
}
