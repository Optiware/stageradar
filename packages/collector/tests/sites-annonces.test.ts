import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  adressesDuPlan,
  siteAnnoncesConnector,
  SITES_ANNONCES,
  type SiteAnnonces,
} from '../src/connectors/sites-annonces';

// Fixtures : le bloc JobPosting de deux pages réelles, relevées le 14 octobre 2026.
const fixture = (nom: string) => readFileSync(join(import.meta.dirname, 'fixtures', nom), 'utf8');
// TokyoDev n'est pas collecté (ses pages refusent le serveur), mais sa page, relevée depuis un
// poste de travail, reste un bon second exemple de JobPosting pour le connecteur générique.
const TOKYODEV: SiteAnnonces = {
  id: 'tokyodev',
  nom: 'TokyoDev',
  sitemap: 'https://www.tokyodev.com/sitemap.xml',
  motif: /^https:\/\/www\.tokyodev\.com\/companies\/[^/]+\/jobs\/[^/]*intern[^/]*$/i,
  pays_defaut: 'JP',
};
const JAPAN_DEV = SITES_ANNONCES.find((site) => site.id === 'japan-dev')!;

const PLAN = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://www.tokyodev.com/jobs/intern</loc></url>
  <url><loc>https://www.tokyodev.com/companies/hennge/jobs/global-intern</loc></url>
  <url><loc>https://www.tokyodev.com/companies/exemple/jobs/backend-engineer</loc></url>
  <url><loc>https://www.tokyodev.com/articles/announcing-international-developer-survey-2021</loc></url>
  <url><loc>https://www.tokyodev.com/companies/hennge/jobs/global-intern</loc></url>
</urlset>`;

describe('sites d’annonces lus par leur plan', () => {
  it('ne collecte que les sites qui acceptent le serveur', () => {
    expect(SITES_ANNONCES.map((site) => site.id)).toEqual(['japan-dev']);
  });

  it('ne retient du plan que les pages de stage, sans doublon', () => {
    expect(adressesDuPlan(PLAN, TOKYODEV.motif)).toEqual([
      'https://www.tokyodev.com/companies/hennge/jobs/global-intern',
    ]);
    expect(
      adressesDuPlan(
        '<loc>https://japan-dev.com/jobs/hennge/hennge-global-internship-program-42q8i0</loc>' +
          '<loc>https://japan-dev.com/blog/international-schools-in-japan</loc>',
        JAPAN_DEV.motif,
      ),
    ).toEqual(['https://japan-dev.com/jobs/hennge/hennge-global-internship-program-42q8i0']);
  });

  it('lit le plan puis seulement les pages retenues', async () => {
    const lues: string[] = [];
    const fetchImpl: typeof fetch = (url) => {
      lues.push(String(url));
      return Promise.resolve(
        new Response(String(url).endsWith('sitemap.xml') ? PLAN : fixture('tokyodev-stage.html')),
      );
    };
    const pages = await siteAnnoncesConnector(TOKYODEV, { fetchImpl }).fetch({});
    expect(lues).toEqual([
      'https://www.tokyodev.com/sitemap.xml',
      'https://www.tokyodev.com/companies/hennge/jobs/global-intern',
    ]);
    expect(pages).toHaveLength(1);
  });

  it('normalise une offre de stage TokyoDev', () => {
    const offre = siteAnnoncesConnector(TOKYODEV).normalize({
      url: 'https://www.tokyodev.com/companies/hennge/jobs/global-intern',
      html: fixture('tokyodev-stage.html'),
    });
    expect(offre).toMatchObject({
      source: 'tokyodev',
      source_id: 'https://tokyodev.com/companies/hennge/jobs/global-intern',
      titre: 'Global Internship Program - Full Stack',
      entreprise: 'HENNGE',
      pays: 'JP',
      ville: 'Tokyo',
      type: 'stage',
      attribution: 'TokyoDev',
    });
    expect(offre.description!.length).toBeGreaterThan(500);
    expect(offre.description).not.toContain('<');
  });

  it('normalise une offre de stage Japan Dev', () => {
    const offre = siteAnnoncesConnector(JAPAN_DEV).normalize({
      url: 'https://japan-dev.com/jobs/hennge/hennge-global-internship-program-onsite-tokyo-japan-42q8i0',
      html: fixture('japan-dev-stage.html'),
    });
    expect(offre).toMatchObject({
      source: 'japan-dev',
      entreprise: 'HENNGE',
      pays: 'JP',
      ville: 'Tokyo',
      type: 'stage',
      date_publication: '2026-07-09T00:00:00.000Z',
      date_expiration: '2027-01-09T00:00:00.000Z',
    });
  });

  it('signale une page sans offre lisible', () => {
    expect(() =>
      siteAnnoncesConnector(TOKYODEV).normalize({ url: 'https://www.tokyodev.com/x', html: '' }),
    ).toThrow(/aucune offre lisible/);
  });
});

describe('reconnaissance d’un site carrière', () => {
  it('reconnaît une adresse de site carrière', async () => {
    const { reconnaitreAts } = await import('../src/connectors/detecter');
    expect(reconnaitreAts('https://jobs.lever.co/woven-by-toyota/84925f74')).toEqual([
      ['lever', 'woven-by-toyota'],
    ]);
    expect(reconnaitreAts('https://job-boards.greenhouse.io/datadog')).toEqual([
      ['greenhouse', 'datadog'],
    ]);
    expect(reconnaitreAts('https://exemple.test/carrieres')).toEqual([]);
  });

  it('retrouve le site carrière cité dans une page, sans les chemins techniques', async () => {
    const { reconnaitreAts } = await import('../src/connectors/detecter');
    const html =
      '<script src="https://boards.greenhouse.io/embed/job_board/js?for=exemple"></script>' +
      '<a href="https://jobs.ashbyhq.com/Exemple.Labs/123">Postes</a>' +
      '<a href="https://jobs.ashbyhq.com/exemple.labs">Tous</a>';
    expect(reconnaitreAts(html)).toEqual([['ashby', 'Exemple.Labs']]);
  });
});
