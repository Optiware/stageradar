import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { atsConnector, type WatchlistEntry } from '../src/connectors/ats';
import { loadWatchlist } from '../src/connectors/index';
import { HttpError } from '../src/http';

// Réponses réelles des API publiques, relevées le 2026-10-13 et réduites à quelques annonces.
const fixture = (nom: string) =>
  readFileSync(join(import.meta.dirname, 'fixtures', `${nom}.json`), 'utf8');

/** Faux `fetch` : sert la fixture et note l'adresse demandée. */
function serveur(corps: string, status = 200) {
  const appels: string[] = [];
  const fetchImpl: typeof fetch = (url) => {
    appels.push(String(url));
    return Promise.resolve(new Response(corps, { status }));
  };
  return { appels, fetchImpl };
}

const entree = (ats: WatchlistEntry['ats'], slug: string, nom: string): WatchlistEntry => ({
  nom,
  pays: ['KR'],
  ats,
  slug,
  url_carriere: 'https://example.test',
  verifie_le: '2026-10-13',
});

const PAYS = ['JP', 'KR', 'CO', 'CA'];

async function lire(ats: WatchlistEntry['ats'], slug: string, nom: string) {
  const { appels, fetchImpl } = serveur(fixture(`${ats}-${slug}`));
  const connecteur = atsConnector(entree(ats, slug, nom), { fetchImpl });
  const brutes = await connecteur.fetch({ pays: PAYS });
  return { appels, connecteur, offres: brutes.map((brute) => connecteur.normalize(brute)) };
}

describe('Greenhouse', () => {
  it('interroge l’API publique du site carrière', async () => {
    const { appels, connecteur } = await lire('greenhouse', 'moloco', 'Moloco');
    expect(connecteur.id).toBe('greenhouse:moloco');
    expect(appels).toEqual(['https://boards-api.greenhouse.io/v1/boards/moloco/jobs?content=true']);
  });

  it('normalise une annonce de stage à Séoul', async () => {
    const { offres } = await lire('greenhouse', 'moloco', 'Moloco');
    expect(offres).toHaveLength(3);
    expect(offres[0]).toMatchObject({
      source: 'greenhouse:moloco',
      source_id: '8007407003',
      url: 'https://job-boards.greenhouse.io/moloco/jobs/8007407003',
      url_canonique: 'https://job-boards.greenhouse.io/moloco/jobs/8007407003',
      titre: 'Software Engineer Intern (3 months)',
      entreprise: 'Moloco',
      pays: 'KR',
      ville: 'Séoul',
      date_publication: '2026-09-29T00:56:51.000Z',
    });
  });

  it('rend la description en texte, sans balises ni entités', async () => {
    const { offres } = await lire('greenhouse', 'moloco', 'Moloco');
    const description = offres[0]!.description!;
    expect(description.length).toBeGreaterThan(200);
    expect(description).not.toMatch(/<[a-z/]|&lt;|&amp;|&quot;/);
  });

  it('laisse sans pays une annonce située ailleurs', async () => {
    const { offres } = await lire('greenhouse', 'moloco', 'Moloco');
    expect(offres[2]).toMatchObject({ pays: null, ville: null });
  });
});

describe('Lever', () => {
  it('interroge l’API publique des annonces', async () => {
    const { appels } = await lire('lever', 'waabi', 'Waabi');
    expect(appels).toEqual(['https://api.lever.co/v0/postings/waabi?mode=json']);
  });

  it('reconnaît un stage grâce au champ « commitment » et situe l’annonce', async () => {
    const { offres } = await lire('lever', 'waabi', 'Waabi');
    expect(offres).toHaveLength(4);
    expect(offres[1]).toMatchObject({
      source: 'lever:waabi',
      titre: 'Research Internship/Co-op',
      type: 'stage',
      pays: 'CA',
      ville: 'Toronto',
      teletravail: 'hybride',
    });
    expect(offres[1]!.url).toMatch(/^https:\/\/jobs\.lever\.co\/waabi\//);
    expect(offres[1]!.date_publication).toMatch(/^20\d\d-/);
    // Poste classique à Toronto, puis poste aux États-Unis.
    expect(offres[2]).toMatchObject({ type: 'autre', pays: 'CA' });
    expect(offres[3]).toMatchObject({ type: 'autre', pays: 'US' });
  });
});

describe('Ashby', () => {
  it('interroge l’API publique du site carrière', async () => {
    const { appels } = await lire('ashby', 'addi', 'Addi');
    expect(appels).toEqual([
      'https://api.ashbyhq.com/posting-api/job-board/addi?includeCompensation=true',
    ]);
  });

  it('reconnaît un stage grâce au type de contrat, même si le titre ne le dit pas', async () => {
    const { offres } = await lire('ashby', 'addi', 'Addi');
    expect(offres[0]).toMatchObject({
      source: 'ashby:addi',
      titre: 'Addi Gateway Program | Class of 2027',
      type: 'stage',
      pays: 'CO',
      ville: 'Bogota',
      teletravail: 'remote',
      date_publication: '2026-09-25T01:06:51.960Z',
    });
    expect(offres[1]).toMatchObject({ type: 'autre', pays: 'CO' });
  });

  it('écarte les annonces non listées', async () => {
    const corps = JSON.parse(fixture('ashby-addi')) as { jobs: { isListed: boolean }[] };
    corps.jobs[1]!.isListed = false;
    const { fetchImpl } = serveur(JSON.stringify(corps));
    const connecteur = atsConnector(entree('ashby', 'addi', 'Addi'), { fetchImpl });
    expect(await connecteur.fetch({ pays: PAYS })).toHaveLength(1);
  });
});

describe('erreurs HTTP', () => {
  it('échoue sans réessayer sur un 404 (site carrière disparu)', async () => {
    const { appels, fetchImpl } = serveur('{}', 404);
    const connecteur = atsConnector(entree('lever', 'disparu', 'Disparu'), { fetchImpl });
    await expect(connecteur.fetch({ pays: PAYS })).rejects.toBeInstanceOf(HttpError);
    expect(appels).toHaveLength(1);
  });
});

describe('watchlist', () => {
  it('est valide et sans doublon', () => {
    const entrees = loadWatchlist();
    expect(entrees.length).toBeGreaterThanOrEqual(30);
    for (const pays of PAYS) {
      expect(
        entrees.filter((e) => e.pays.includes(pays)).length,
        `entreprises pour ${pays}`,
      ).toBeGreaterThanOrEqual(5);
    }
    for (const e of entrees) {
      expect(e.verifie_le).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(e.url_carriere).toMatch(/^https:\/\//);
    }
  });
});
