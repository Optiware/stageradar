import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { asRole, createTestDb } from './test-db';

let db: PGlite;

beforeAll(async () => {
  db = await createTestDb();
  await db.query("insert into public.app_owner (email) values ('proprietaire@example.test')");
});

type Query = PGlite['query'];

const BASE = {
  source: 'greenhouse:exemple',
  source_id: '1',
  url: 'https://job-boards.greenhouse.io/exemple/jobs/1',
  url_canonique: 'https://job-boards.greenhouse.io/exemple/jobs/1',
  titre: 'Software Engineer Intern',
  titre_norm: 'software engineer intern',
  entreprise: 'Exemple',
  entreprise_norm: 'exemple',
  pays: 'JP',
  ville: 'Tokyo',
  type: 'stage',
  domaines: ['dev'],
  langues_requises: [],
  competences: [],
  description: 'Build backend services.',
  date_publication: '2026-10-13T00:00:00Z',
  score: 80,
  score_details: [{ critere: 'domaine', points: 30, max: 30, libelle: 'développement' }],
  periode_compatible: true,
  exclue_raison: null,
  attribution: null,
};

async function ingest(query: Query, offre: Record<string, unknown>, run = 'run-1') {
  const { rows } = await query<{ offer_id: string; nouvelle: boolean }>(
    'select * from public.ingest_offer($1::jsonb, $2)',
    [JSON.stringify({ ...BASE, ...offre }), run],
  );
  return rows[0]!;
}

const serviceRole = <T>(fn: (query: Query) => Promise<T>) => asRole(db, 'service_role', null, fn);

describe('ingest_offer', () => {
  it('crée l’offre, son lien source et son empreinte', async () => {
    await serviceRole(async (query) => {
      const { offer_id, nouvelle } = await ingest(query, {});
      expect(nouvelle).toBe(true);

      const offres = await query<Record<string, unknown>>(
        'select titre, pays, domaines, score, score_details, hash_dedup, actif, masquee from public.offers where id = $1',
        [offer_id],
      );
      expect(offres.rows[0]).toMatchObject({
        titre: 'Software Engineer Intern',
        pays: 'JP',
        domaines: ['dev'],
        score: 80,
        actif: true,
        masquee: false,
      });
      expect(offres.rows[0]!.hash_dedup).toMatch(/^[0-9a-f]{32}$/);
      expect(offres.rows[0]!.score_details).toEqual(BASE.score_details);

      const liens = await query<Record<string, unknown>>(
        'select source, source_id, dernier_run, absences_consecutives from public.offer_sources where offer_id = $1',
        [offer_id],
      );
      expect(liens.rows).toEqual([
        {
          source: 'greenhouse:exemple',
          source_id: '1',
          dernier_run: 'run-1',
          absences_consecutives: 0,
        },
      ]);
    });
  });

  it('met à jour une offre déjà connue sans toucher à l’état de l’utilisateur', async () => {
    await serviceRole(async (query) => {
      const premier = await ingest(query, {});
      await query("update public.offers set masquee = true, notes = 'à revoir' where id = $1", [
        premier.offer_id,
      ]);

      const second = await ingest(query, { titre: 'Software Engineer Intern (Tokyo)', score: 90 });
      expect(second).toEqual({ offer_id: premier.offer_id, nouvelle: false });

      const { rows } = await query<Record<string, unknown>>(
        'select titre, score, masquee, notes from public.offers',
      );
      expect(rows).toEqual([
        { titre: 'Software Engineer Intern (Tokyo)', score: 90, masquee: true, notes: 'à revoir' },
      ]);
    });
  });

  it('fusionne la même offre vue sur une autre source (même URL canonique)', async () => {
    await serviceRole(async (query) => {
      const premier = await ingest(query, {});
      const second = await ingest(query, { source: 'adzuna', source_id: 'A-9', score: 10 });
      expect(second).toEqual({ offer_id: premier.offer_id, nouvelle: false });

      const offres = await query<{ source: string; score: number }>(
        'select source, score from public.offers',
      );
      // La première source fait foi : ni l'origine ni la note ne changent.
      expect(offres.rows).toEqual([{ source: 'greenhouse:exemple', score: 80 }]);
      const liens = await query<{ source: string }>(
        'select source from public.offer_sources order by source',
      );
      expect(liens.rows.map((lien) => lien.source)).toEqual(['adzuna', 'greenhouse:exemple']);
    });
  });

  it('fusionne par empreinte entreprise + titre + ville, à travers les accents et la casse', async () => {
    await serviceRole(async (query) => {
      const premier = await ingest(query, {});
      const second = await ingest(query, {
        source: 'adzuna',
        source_id: 'A-1',
        url: 'https://adzuna.example/1',
        url_canonique: 'https://adzuna.example/1',
        titre: 'SOFTWARE ENGINEER INTERN',
        ville: 'tokyo',
      });
      expect(second.offer_id).toBe(premier.offer_id);
    });
  });

  it('fusionne deux titres très proches de la même entreprise dans la même ville', async () => {
    await serviceRole(async (query) => {
      const premier = await ingest(query, {
        titre_norm: 'software engineer intern summer 2027',
      });
      const second = await ingest(query, {
        source: 'adzuna',
        source_id: 'A-2',
        url: 'https://adzuna.example/2',
        url_canonique: 'https://adzuna.example/2',
        titre_norm: 'software engineer intern summer 2027 tokyo',
        entreprise_norm: 'exemple inc',
      });
      expect(second).toEqual({ offer_id: premier.offer_id, nouvelle: false });
    });
  });

  it.each([
    ['une autre ville', { ville: 'Osaka' }],
    ['un autre pays', { pays: 'KR', ville: 'Séoul' }],
    ['une autre entreprise', { entreprise: 'Autre', entreprise_norm: 'autre' }],
    [
      'un autre poste',
      { titre: 'Security Engineer Intern', titre_norm: 'security engineer intern' },
    ],
  ])('ne fusionne pas avec %s', async (_cas, difference) => {
    await serviceRole(async (query) => {
      const premier = await ingest(query, {});
      const second = await ingest(query, {
        source: 'adzuna',
        source_id: 'A-3',
        url: 'https://adzuna.example/3',
        url_canonique: 'https://adzuna.example/3',
        ...difference,
      });
      expect(second.nouvelle).toBe(true);
      expect(second.offer_id).not.toBe(premier.offer_id);
    });
  });

  it('garde distinctes deux annonces identiques d’une même source', async () => {
    await serviceRole(async (query) => {
      const premier = await ingest(query, {});
      const second = await ingest(query, {
        source_id: '2',
        url: 'https://job-boards.greenhouse.io/exemple/jobs/2',
        url_canonique: 'https://job-boards.greenhouse.io/exemple/jobs/2',
      });
      expect(second.nouvelle).toBe(true);
      expect(second.offer_id).not.toBe(premier.offer_id);
    });
  });

  it('refuse une offre incomplète', async () => {
    await serviceRole(async (query) => {
      await expect(ingest(query, { titre: null })).rejects.toThrow(/offre incomplète/);
    });
  });
});

describe('close_source_run', () => {
  const clore = async (query: Query, run: string) => {
    const { rows } = await query<{ n: number }>(
      "select public.close_source_run('greenhouse:exemple', $1) as n",
      [run],
    );
    return rows[0]!.n;
  };

  it('désactive une offre absente trois collectes de suite, pas avant', async () => {
    await serviceRole(async (query) => {
      const { offer_id } = await ingest(query, {}, 'run-1');
      expect(await clore(query, 'run-1')).toBe(0);
      expect(await clore(query, 'run-2')).toBe(0);
      expect(await clore(query, 'run-3')).toBe(0);
      expect(await clore(query, 'run-4')).toBe(1);

      const { rows } = await query<{ actif: boolean }>(
        'select actif from public.offers where id = $1',
        [offer_id],
      );
      expect(rows[0]!.actif).toBe(false);
    });
  });

  it('remet le compteur à zéro et réactive l’offre quand elle réapparaît', async () => {
    await serviceRole(async (query) => {
      await ingest(query, {}, 'run-1');
      for (const run of ['run-2', 'run-3', 'run-4']) await clore(query, run);

      await ingest(query, {}, 'run-5');
      expect(await clore(query, 'run-5')).toBe(0);
      const { rows } = await query<{ actif: boolean; absences_consecutives: number }>(
        'select f.actif, s.absences_consecutives from public.offers f join public.offer_sources s on s.offer_id = f.id',
      );
      expect(rows).toEqual([{ actif: true, absences_consecutives: 0 }]);
    });
  });

  it('garde active une offre encore présente sur une autre source', async () => {
    await serviceRole(async (query) => {
      await ingest(query, {}, 'run-1');
      await ingest(query, { source: 'adzuna', source_id: 'A-9' }, 'run-1');
      for (const run of ['run-2', 'run-3', 'run-4']) expect(await clore(query, run)).toBe(0);
    });
  });
});

describe('droits', () => {
  it.each(['anon', 'authenticated'] as const)(
    'interdit l’enregistrement au rôle %s',
    async (role) => {
      await asRole(db, role, 'proprietaire@example.test', async (query) => {
        await expect(ingest(query, {})).rejects.toThrow(/permission denied/);
      });
    },
  );

  it.each(['anon', 'authenticated'] as const)('interdit la clôture au rôle %s', async (role) => {
    await asRole(db, role, 'proprietaire@example.test', async (query) => {
      await expect(query("select public.close_source_run('x', 'y')")).rejects.toThrow(
        /permission denied/,
      );
    });
  });
});
