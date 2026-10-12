import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { asRole, createTestDb } from './test-db';

const OWNER = 'proprietaire@example.test';
const INTRUS = 'intrus@example.test';

const INSERT_OFFER = `
  insert into public.offers (source, source_id, url, titre, type)
  values ('test', '1', 'https://example.test/1', 'Stagiaire DevOps', 'stage')
  returning id
`;

let db: PGlite;

beforeAll(async () => {
  db = await createTestDb();
  await db.query('insert into public.app_owner (email) values ($1)', [OWNER]);
});

describe('migrations', () => {
  it('active la RLS sur toutes les tables du schéma public', async () => {
    const { rows } = await db.query<{ relname: string }>(`
      select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
    `);
    expect(rows).toEqual([]);
  });

  it('crée la ligne de réglages avec les poids par défaut du cahier des charges', async () => {
    const { rows } = await db.query<{ poids: Record<string, number> }>(
      'select poids from public.settings',
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.poids).toEqual({
      domaine: 30,
      periode: 20,
      pays: 15,
      niveau: 15,
      langue: 10,
      fraicheur: 10,
    });
    const total = Object.values(rows[0]?.poids ?? {}).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });
});

describe('row level security', () => {
  it('laisse le propriétaire lire et écrire', async () => {
    await asRole(db, 'authenticated', OWNER, async (query) => {
      const inserted = await query<{ id: string }>(INSERT_OFFER);
      expect(inserted.rows).toHaveLength(1);

      const { rows } = await query<{ titre: string }>('select titre from public.offers');
      expect(rows).toEqual([{ titre: 'Stagiaire DevOps' }]);

      const owner = await query<{ is_owner: boolean }>('select public.is_owner()');
      expect(owner.rows[0]?.is_owner).toBe(true);
    });
  });

  it("ignore la casse de l'adresse e-mail du propriétaire", async () => {
    await asRole(db, 'authenticated', OWNER.toUpperCase(), async (query) => {
      const { rows } = await query<{ is_owner: boolean }>('select public.is_owner()');
      expect(rows[0]?.is_owner).toBe(true);
    });
  });

  it('ne montre rien à un autre compte connecté et refuse ses écritures', async () => {
    await db.query(INSERT_OFFER);
    try {
      await asRole(db, 'authenticated', INTRUS, async (query) => {
        const { rows } = await query('select id from public.offers');
        expect(rows).toEqual([]);

        const settings = await query('select id from public.settings');
        expect(settings.rows).toEqual([]);

        const owner = await query<{ is_owner: boolean }>('select public.is_owner()');
        expect(owner.rows[0]?.is_owner).toBe(false);
      });
      await asRole(db, 'authenticated', INTRUS, async (query) => {
        await expect(query(INSERT_OFFER.replace("'1'", "'2'").replace('/1', '/2'))).rejects.toThrow(
          /row-level security/,
        );
      });
    } finally {
      await db.query("delete from public.offers where source = 'test'");
    }
  });

  it('refuse tout accès au rôle anonyme', async () => {
    for (const table of ['offers', 'settings', 'applications', 'app_owner']) {
      await asRole(db, 'anon', null, async (query) => {
        await expect(query(`select * from public.${table}`)).rejects.toThrow(/permission denied/);
      });
    }
  });

  it("ne laisse pas un compte connecté lire ou modifier l'adresse du propriétaire", async () => {
    await asRole(db, 'authenticated', INTRUS, async (query) => {
      await expect(query('select email from public.app_owner')).rejects.toThrow(
        /permission denied/,
      );
    });
    await asRole(db, 'authenticated', INTRUS, async (query) => {
      await expect(query('update public.app_owner set email = $1', [INTRUS])).rejects.toThrow(
        /permission denied/,
      );
    });
  });

  it('laisse le collecteur (service_role) écrire sans être propriétaire', async () => {
    await asRole(db, 'service_role', null, async (query) => {
      const { rows } = await query<{ id: string }>(INSERT_OFFER);
      expect(rows).toHaveLength(1);
    });
  });
});

describe('contraintes', () => {
  it("met à jour updated_at lors d'une modification", async () => {
    await asRole(db, 'service_role', null, async (query) => {
      // now() est figé dans une transaction : on recule created/updated pour observer le trigger.
      const { rows } = await query<{ id: string }>(INSERT_OFFER);
      const id = rows[0]?.id;
      await query("update public.offers set updated_at = now() - interval '1 day' where id = $1", [
        id,
      ]);
      await query('update public.offers set notes = $1 where id = $2', ['vu', id]);
      const after = await query<{ recent: boolean }>(
        "select updated_at > now() - interval '1 hour' as recent from public.offers where id = $1",
        [id],
      );
      expect(after.rows[0]?.recent).toBe(true);
    });
  });

  it('rejette un domaine inconnu et un code pays mal formé', async () => {
    await asRole(db, 'service_role', null, async (query) => {
      await expect(
        query(`insert into public.offers (source, source_id, url, titre, type, domaines)
               values ('test', 'd', 'https://example.test/d', 'x', 'stage', '{marketing}')`),
      ).rejects.toThrow(/check constraint/);
    });
    await asRole(db, 'service_role', null, async (query) => {
      await expect(
        query(`insert into public.offers (source, source_id, url, titre, type, pays)
               values ('test', 'p', 'https://example.test/p', 'x', 'stage', 'jp')`),
      ).rejects.toThrow(/check constraint/);
    });
  });

  it('indexe le titre pour la recherche plein texte', async () => {
    await asRole(db, 'service_role', null, async (query) => {
      await query(INSERT_OFFER);
      const { rows } = await query(
        "select id from public.offers where recherche @@ plainto_tsquery('simple', 'devops')",
      );
      expect(rows).toHaveLength(1);
    });
  });

  it('refuse de supprimer une offre présente dans le suivi', async () => {
    await asRole(db, 'service_role', null, async (query) => {
      const { rows } = await query<{ id: string }>(INSERT_OFFER);
      const id = rows[0]?.id;
      await query('insert into public.applications (offer_id) values ($1)', [id]);
      await expect(query('delete from public.offers where id = $1', [id])).rejects.toThrow(
        /foreign key/,
      );
    });
  });
});
