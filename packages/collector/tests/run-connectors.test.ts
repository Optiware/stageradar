import type { Connector, Offer } from '@stageradar/shared';
import { describe, expect, it } from 'vitest';
import { runConnectors } from '../src/pipeline/run-connectors';

function offer(source: string, id: string): Offer {
  return {
    source,
    source_id: id,
    url: `https://example.test/${id}`,
    url_canonique: null,
    titre: `Offre ${id}`,
    entreprise: null,
    pays: null,
    ville: null,
    teletravail: null,
    type: 'stage',
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
    date_publication: null,
    date_expiration: null,
    attribution: null,
  };
}

const sain: Connector = {
  id: 'sain',
  fetch: async () => [{ id: 'a' }, { id: 'b' }],
  normalize: (raw) => offer('sain', String(raw.id)),
};

const enPanne: Connector = {
  id: 'en-panne',
  fetch: async () => {
    throw new Error('HTTP 503');
  },
  normalize: () => {
    throw new Error('jamais appelé');
  },
};

const partiel: Connector = {
  id: 'partiel',
  fetch: async () => [{ id: 'ok' }, { id: 'casse' }],
  normalize: (raw) => {
    if (raw.id === 'casse') throw new Error('titre manquant');
    return offer('partiel', String(raw.id));
  },
};

describe('runConnectors', () => {
  it("n'interrompt pas les autres connecteurs quand l'un échoue", async () => {
    const results = await runConnectors([enPanne, sain]);

    expect(results.map((r) => [r.source, r.statut])).toEqual([
      ['en-panne', 'erreur'],
      ['sain', 'ok'],
    ]);
    expect(results[0]?.erreurs).toEqual(['HTTP 503']);
    expect(results[1]?.offers.map((o) => o.source_id)).toEqual(['a', 'b']);
  });

  it('conserve les offres valides quand une offre ne peut pas être normalisée', async () => {
    const [result] = await runConnectors([partiel]);

    expect(result?.statut).toBe('partiel');
    expect(result?.offers.map((o) => o.source_id)).toEqual(['ok']);
    expect(result?.erreurs).toEqual(['normalisation : titre manquant']);
  });

  it('renvoie une liste vide sans connecteur', async () => {
    expect(await runConnectors([])).toEqual([]);
  });
});
