import { describe, expect, it } from 'vitest';
import { parSemaine, parStatut, taux, tauxPar, type CandidatureComptee } from './stats';

function candidature(overrides: Partial<CandidatureComptee>): CandidatureComptee {
  return {
    statut: 'postule',
    date_candidature: '2026-10-13',
    pays: 'JP',
    spontanee: false,
    ...overrides,
  };
}

const TOUTES = [
  candidature({ statut: 'a_etudier', date_candidature: null }),
  candidature({ statut: 'postule' }),
  candidature({ statut: 'relance', date_candidature: '2026-10-05' }),
  candidature({ statut: 'entretien', pays: 'KR', date_candidature: '2026-09-29' }),
  candidature({ statut: 'offre', pays: 'KR', spontanee: true, date_candidature: '2026-09-01' }),
  candidature({ statut: 'refus', date_candidature: '2026-10-12' }),
];

describe('statistiques', () => {
  it('calcule le taux de réponse sur les candidatures envoyées', () => {
    expect(taux(TOUTES)).toEqual({
      envoyees: 5,
      reponses: 3,
      entretiens: 2,
      offres: 1,
      taux_reponse: 0.6,
    });
  });

  it('ne donne pas de taux tant que rien n’est envoyé', () => {
    expect(taux([candidature({ statut: 'a_postuler' })]).taux_reponse).toBeNull();
  });

  it('compte chaque colonne dans l’ordre du suivi', () => {
    expect(parStatut(TOUTES).map(({ nombre }) => nombre)).toEqual([1, 0, 1, 1, 1, 1, 1]);
  });

  it('compare les pays, le plus sollicité d’abord, sans ceux où rien n’est parti', () => {
    const lignes = tauxPar(TOUTES, (c) => c.pays ?? 'inconnu');
    expect(lignes.map((ligne) => [ligne.groupe, ligne.taux.envoyees, ligne.taux.reponses])).toEqual(
      [
        ['JP', 3, 1],
        ['KR', 2, 2],
      ],
    );
    expect(tauxPar([candidature({ statut: 'a_etudier' })], (c) => c.pays ?? '')).toEqual([]);
  });

  it('range les envois par semaine, du lundi au dimanche', () => {
    // Le 13 octobre 2026 est un mardi.
    expect(parSemaine(TOUTES, '2026-10-13', 3)).toEqual([
      { lundi: '2026-09-28', envoyees: 1 },
      { lundi: '2026-10-05', envoyees: 1 },
      { lundi: '2026-10-12', envoyees: 2 },
    ]);
  });
});
