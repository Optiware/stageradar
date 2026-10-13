import {
  DEFAULT_KEYWORDS,
  DEFAULT_POIDS,
  DEFAULT_PROFIL,
  type Connector,
  type Offer,
} from '@stageradar/shared';
import { describe, expect, it } from 'vitest';
import { collect } from '../src/pipeline/collect';
import type { OffreEnrichie } from '../src/pipeline/enrich';
import type { Store } from '../src/pipeline/store';

function offre(overrides: Partial<Offer> = {}): Offer {
  return {
    source: 'test',
    source_id: '1',
    url: 'https://example.test/1',
    url_canonique: 'https://example.test/1',
    titre: 'Software Engineer Intern',
    entreprise: 'Exemple',
    pays: 'JP',
    ville: 'Tokyo',
    teletravail: null,
    type: 'autre',
    contrat: null,
    domaines: [],
    date_debut: null,
    duree_semaines: null,
    remuneration_texte: null,
    remuneration_montant: null,
    remuneration_devise: null,
    langues_requises: [],
    niveau_etudes: null,
    description: null,
    competences: [],
    date_publication: '2026-10-13T00:00:00Z',
    date_expiration: null,
    attribution: null,
    ...overrides,
  };
}

function connecteur(id: string, offres: Offer[] | Error): Connector {
  return {
    id,
    fetch: () =>
      offres instanceof Error
        ? Promise.reject(offres)
        : Promise.resolve(offres.map((o) => ({ ...o, source: id }))),
    normalize: (brute) => brute as unknown as Offer,
  };
}

/** Double de la base : retient ce qu'on lui confie. */
function fauxStore() {
  const enregistrees: OffreEnrichie[] = [];
  const closes: string[] = [];
  const journal: { source: string; statut: string; nb_offres: number; nouvelles: number }[] = [];
  const store: Store = {
    lireReglages: () =>
      Promise.resolve({ profil: DEFAULT_PROFIL, poids: DEFAULT_POIDS, motsCles: DEFAULT_KEYWORDS }),
    enregistrer(o) {
      if (o.titre.includes('KO')) return Promise.reject(new Error('refus de la base'));
      enregistrees.push(o);
      return Promise.resolve({ id: `id-${enregistrees.length}`, nouvelle: true });
    },
    importer: () => Promise.resolve({ id: 'manuel', nouvelle: true }),
    lireSitesCarrieres: () => Promise.resolve([]),
    cloreSource(source) {
      closes.push(source);
      return Promise.resolve(0);
    },
    journaliser(_runId, resultat, nouvelles) {
      journal.push({
        source: resultat.source,
        statut: resultat.statut,
        nb_offres: resultat.offers.length,
        nouvelles,
      });
      return Promise.resolve();
    },
  };
  return { store, enregistrees, closes, journal };
}

const OPTIONS = { runId: 'run-1', maintenant: new Date('2026-10-13T12:00:00Z') };

describe('collect', () => {
  it('ne garde que les stages dans un pays visé et les alternances en France', async () => {
    const { store, enregistrees } = fauxStore();
    const [bilan] = await collect(
      [
        connecteur('a', [
          offre({ source_id: '1' }),
          offre({ source_id: '2', titre: 'Senior Software Engineer' }),
          offre({ source_id: '3', pays: 'US', ville: 'New York' }),
          offre({ source_id: '4', pays: null, ville: null }),
          offre({ source_id: '5', titre: 'Alternance développeur web', pays: 'FR', ville: 'Lyon' }),
          offre({ source_id: '6', titre: 'Alternance développeur web', pays: 'CA' }),
        ]),
      ],
      store,
      OPTIONS,
    );
    expect(bilan).toMatchObject({ lues: 6, retenues: 2, nouvelles: 2, statut: 'ok' });
    expect(enregistrees.map((o) => [o.source_id, o.type])).toEqual([
      ['1', 'stage'],
      ['5', 'alternance'],
    ]);
  });

  it('classe, note et normalise avant d’enregistrer', async () => {
    const { store, enregistrees } = fauxStore();
    await collect(
      [connecteur('a', [offre({ titre: 'Stagiaire Développeur Sécurité (Été 2027)' })])],
      store,
      OPTIONS,
    );
    expect(enregistrees[0]).toMatchObject({
      type: 'stage',
      domaines: ['dev'],
      titre_norm: 'stagiaire developpeur securite ete 2027',
      entreprise_norm: 'exemple',
      periode_compatible: true,
      exclue_raison: null,
    });
    expect(enregistrees[0]!.score).toBeGreaterThan(80);
    expect(enregistrees[0]!.score_details).toHaveLength(6);
  });

  it('garde une offre hors cible mais la marque comme masquée', async () => {
    const { store, enregistrees } = fauxStore();
    await collect([connecteur('a', [offre({ titre: 'Marketing Intern' })])], store, OPTIONS);
    expect(enregistrees[0]).toMatchObject({ exclue_raison: 'Hors domaine', domaines: [] });
  });

  it('isole une source en échec et ne compte alors aucune absence', async () => {
    const { store, closes, journal } = fauxStore();
    const bilans = await collect(
      [connecteur('en-panne', new Error('HTTP 503')), connecteur('saine', [offre()])],
      store,
      OPTIONS,
    );
    expect(bilans.map((b) => [b.source, b.statut])).toEqual([
      ['en-panne', 'erreur'],
      ['saine', 'ok'],
    ]);
    expect(bilans[0]!.erreurs).toEqual(['HTTP 503']);
    expect(closes).toEqual(['saine']);
    expect(journal).toEqual([
      { source: 'en-panne', statut: 'erreur', nb_offres: 0, nouvelles: 0 },
      { source: 'saine', statut: 'ok', nb_offres: 1, nouvelles: 1 },
    ]);
  });

  it('poursuit quand la base refuse une offre, et le signale', async () => {
    const { store, enregistrees, journal } = fauxStore();
    const [bilan] = await collect(
      [
        connecteur('a', [
          offre({ source_id: '1', titre: 'Software Engineer Intern KO' }),
          offre({ source_id: '2' }),
        ]),
      ],
      store,
      OPTIONS,
    );
    expect(enregistrees).toHaveLength(1);
    expect(bilan).toMatchObject({ statut: 'partiel', retenues: 2, nouvelles: 1 });
    expect(bilan!.erreurs).toEqual(['refus de la base']);
    expect(journal[0]!.statut).toBe('partiel');
  });

  it('n’écrit rien à blanc', async () => {
    const { store, enregistrees, closes, journal } = fauxStore();
    const vues: string[] = [];
    const [bilan] = await collect([connecteur('a', [offre()])], store, {
      ...OPTIONS,
      aBlanc: true,
      surOffre: (o) => vues.push(o.titre),
    });
    expect(bilan).toMatchObject({ retenues: 1, nouvelles: 0 });
    expect(vues).toEqual(['Software Engineer Intern']);
    expect([enregistrees, closes, journal]).toEqual([[], [], []]);
  });
});
