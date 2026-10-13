import type { AddressInfo } from 'node:net';
import { DEFAULT_KEYWORDS, DEFAULT_POIDS, DEFAULT_PROFIL } from '@stageradar/shared';
import { afterEach, describe, expect, it } from 'vitest';
import { DemandeInvalide, importerOffre } from '../src/api/importer';
import { creerServeur } from '../src/api/serveur';
import { adressePrivee, lirePage, PageIllisible } from '../src/api/telecharger';
import type { OffreEnrichie } from '../src/pipeline/enrich';
import type { Store } from '../src/pipeline/store';

// Page fabriquée pour le test, à la forme décrite par https://schema.org/JobPosting.
const PAGE = `<html><head><script type="application/ld+json">${JSON.stringify({
  '@type': 'JobPosting',
  title: 'Software Engineer Intern',
  description: '<p>Summer 2027 internship in our backend team.</p>',
  hiringOrganization: { name: 'Exemple' },
  jobLocation: { address: { addressLocality: 'Berlin', addressCountry: 'DE' } },
  employmentType: 'INTERN',
})}</script></head></html>`;

function fauxStore() {
  const importees: OffreEnrichie[] = [];
  const store: Store = {
    lireReglages: () =>
      Promise.resolve({ profil: DEFAULT_PROFIL, poids: DEFAULT_POIDS, motsCles: DEFAULT_KEYWORDS }),
    enregistrer: () => Promise.resolve(true),
    importer(offre) {
      importees.push(offre);
      return Promise.resolve({ id: 'id-importe', nouvelle: true });
    },
    cloreSource: () => Promise.resolve(0),
    journaliser: () => Promise.resolve(),
  };
  return { store, importees };
}

const MAINTENANT = new Date('2026-10-13T12:00:00Z');
const publique = () => Promise.resolve(['93.184.216.34']);

function reponse(corps: string, init: ResponseInit = {}): Response {
  return new Response(corps, { headers: { 'content-type': 'text/html' }, ...init });
}

describe('lecture d’une page', () => {
  it('reconnaît les adresses locales et privées', () => {
    for (const ip of ['127.0.0.1', '10.1.2.3', '172.20.0.5', '192.168.1.1', '169.254.169.254']) {
      expect(adressePrivee(ip), ip).toBe(true);
    }
    for (const ip of ['::1', 'fd00::1', 'fe80::1', '::ffff:10.0.0.1']) {
      expect(adressePrivee(ip), ip).toBe(true);
    }
    expect(adressePrivee('93.184.216.34')).toBe(false);
    expect(adressePrivee('2606:2800:220:1:248:1893:25c8:1946')).toBe(false);
  });

  it('refuse une adresse qui mène au serveur lui-même ou à un réseau privé', async () => {
    const jamais = () => Promise.reject(new Error('ne doit pas être appelé'));
    for (const url of [
      'http://127.0.0.1:54332/offers',
      'http://rest:3000/offers',
      'ftp://exemple.test/fichier',
      'https://utilisateur:secret@exemple.test/',
    ]) {
      await expect(
        lirePage(url, { fetchImpl: jamais, resoudre: () => Promise.resolve(['172.18.0.3']) }),
      ).rejects.toBeInstanceOf(PageIllisible);
    }
  });

  it('suit une redirection publique mais pas une redirection vers un réseau privé', async () => {
    const versPublic: typeof fetch = (url) =>
      Promise.resolve(
        String(url).endsWith('/depart')
          ? new Response(null, { status: 302, headers: { location: '/arrivee' } })
          : reponse(PAGE),
      );
    expect(
      await lirePage('https://exemple.test/depart', { fetchImpl: versPublic, resoudre: publique }),
    ).toBe(PAGE);

    const versPrive: typeof fetch = () =>
      Promise.resolve(
        new Response(null, { status: 302, headers: { location: 'http://169.254.169.254/' } }),
      );
    await expect(
      lirePage('https://exemple.test/depart', { fetchImpl: versPrive, resoudre: publique }),
    ).rejects.toThrow(/site public/);
  });

  it('refuse ce qui n’est pas une page web', async () => {
    const pdf: typeof fetch = () =>
      Promise.resolve(new Response('%PDF', { headers: { 'content-type': 'application/pdf' } }));
    await expect(
      lirePage('https://exemple.test/cv.pdf', { fetchImpl: pdf, resoudre: publique }),
    ).rejects.toThrow(/pas une page web/);
  });
});

describe('import d’une offre', () => {
  it('lit la page et garde l’offre même hors des pays visés', async () => {
    const { store, importees } = fauxStore();
    const resultat = await importerOffre(
      { url: 'https://carrieres.exemple.test/postes/42' },
      { store, lire: () => Promise.resolve(PAGE), maintenant: MAINTENANT },
    );
    expect(resultat).toEqual({
      id: 'id-importe',
      nouvelle: true,
      origine: 'page',
      titre: 'Software Engineer Intern',
    });
    expect(importees[0]).toMatchObject({
      source: 'manuel',
      entreprise: 'Exemple',
      pays: 'DE',
      type: 'stage',
      domaines: ['dev'],
    });
    expect(importees[0]!.score).toBeGreaterThan(0);
  });

  it('ne lit jamais un site qui l’interdit : seul ce qui est partagé est repris', async () => {
    const { store, importees } = fauxStore();
    const resultat = await importerOffre(
      { texte: 'Backend Intern chez Exemple https://www.linkedin.com/jobs/view/123' },
      {
        store,
        lire: () => Promise.reject(new Error('ne doit pas être appelé')),
        maintenant: MAINTENANT,
      },
    );
    expect(resultat.origine).toBe('partage');
    expect(importees[0]).toMatchObject({
      url: 'https://www.linkedin.com/jobs/view/123',
      titre: 'Backend Intern chez Exemple https://www.linkedin.com/jobs/view/123',
    });
  });

  it('crée quand même l’offre si la page ne peut pas être lue', async () => {
    const { store, importees } = fauxStore();
    const resultat = await importerOffre(
      { url: 'https://exemple.test/poste', titre: 'Stage DevOps' },
      { store, lire: () => Promise.reject(new PageIllisible('503')), maintenant: MAINTENANT },
    );
    expect(resultat).toMatchObject({ origine: 'illisible', titre: 'Stage DevOps' });
    expect(importees).toHaveLength(1);
  });

  it('refuse une demande sans adresse', async () => {
    const { store } = fauxStore();
    await expect(
      importerOffre(
        { titre: 'sans lien' },
        { store, lire: () => Promise.resolve(''), maintenant: MAINTENANT },
      ),
    ).rejects.toBeInstanceOf(DemandeInvalide);
  });
});

describe('service', () => {
  let fermer: (() => void) | undefined;
  afterEach(() => fermer?.());

  async function demarrer(proprietaire: boolean) {
    const { store, importees } = fauxStore();
    const serveur = creerServeur({
      store,
      connecteurs: () => [],
      estProprietaire: () => Promise.resolve(proprietaire),
      lire: () => Promise.resolve(PAGE),
    });
    await new Promise<void>((resolve) => serveur.listen(0, '127.0.0.1', resolve));
    fermer = () => serveur.close();
    const base = `http://127.0.0.1:${(serveur.address() as AddressInfo).port}`;
    const appeler = (chemin: string, corps: unknown, jeton: string | null = 'Bearer jeton') =>
      fetch(base + chemin, {
        method: 'POST',
        headers: jeton ? { Authorization: jeton } : {},
        body: JSON.stringify(corps),
      });
    return { appeler, base, importees };
  }

  it('ne répond qu’au propriétaire', async () => {
    const intrus = await demarrer(false);
    expect((await intrus.appeler('/importer', { url: 'https://exemple.test/a' })).status).toBe(401);
    expect(intrus.importees).toHaveLength(0);
    fermer?.();

    const proprio = await demarrer(true);
    expect(
      (await proprio.appeler('/importer', { url: 'https://exemple.test/a' }, null)).status,
    ).toBe(401);
    expect((await fetch(`${proprio.base}/sante`)).status).toBe(200);
  });

  it('importe une offre et signale une demande invalide', async () => {
    const { appeler, importees } = await demarrer(true);
    const reponseImport = await appeler('/importer', { url: 'https://exemple.test/postes/42' });
    expect(reponseImport.status).toBe(200);
    expect(await reponseImport.json()).toMatchObject({ id: 'id-importe', origine: 'page' });
    expect(importees).toHaveLength(1);

    const invalide = await appeler('/importer', { titre: 'sans adresse' });
    expect(invalide.status).toBe(400);
    expect(await invalide.json()).toEqual({
      message: "Aucune adresse web valide n'a été fournie.",
    });
    expect((await appeler('/inconnu', {})).status).toBe(404);
  });

  it('lance une collecte et en rend le bilan', async () => {
    const { appeler } = await demarrer(true);
    const reponseCollecte = await appeler('/collecter', {});
    expect(await reponseCollecte.json()).toEqual({
      sources: 0,
      en_erreur: 0,
      lues: 0,
      retenues: 0,
      nouvelles: 0,
    });
  });
});
