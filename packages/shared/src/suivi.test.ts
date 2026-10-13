import { describe, expect, it } from 'vitest';
import {
  ajouterJours,
  changerStatut,
  envoyeesCetteSemaine,
  joursEntre,
  jourIso,
  lundiDe,
  relanceDue,
  type EtatSuivi,
} from './suivi';

const NEUVE: EtatSuivi = { statut: 'a_etudier', date_candidature: null, prochaine_relance: null };

describe('dates du suivi', () => {
  it('donne le jour dans le fuseau de l’appareil', () => {
    expect(jourIso(new Date(2026, 9, 3, 23, 30))).toBe('2026-10-03');
  });

  it('ajoute des jours en passant les fins de mois et d’année', () => {
    expect(ajouterJours('2026-10-28', 7)).toBe('2026-11-04');
    expect(ajouterJours('2026-12-31', 1)).toBe('2027-01-01');
    expect(ajouterJours('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('trouve le lundi de la semaine, y compris un dimanche', () => {
    // Le 13 octobre 2026 est un mardi.
    expect(lundiDe('2026-10-13')).toBe('2026-10-12');
    expect(lundiDe('2026-10-12')).toBe('2026-10-12');
    expect(lundiDe('2026-10-18')).toBe('2026-10-12');
  });

  it('compte les jours entre deux dates', () => {
    expect(joursEntre('2026-10-13', '2026-10-20')).toBe(7);
    expect(joursEntre('2026-10-13', '2026-10-10')).toBe(-3);
  });
});

describe('changerStatut', () => {
  it('date la candidature et propose une relance à J+7 en passant à « Postulé »', () => {
    expect(changerStatut(NEUVE, 'postule', '2026-10-13')).toEqual({
      statut: 'postule',
      date_candidature: '2026-10-13',
      prochaine_relance: '2026-10-20',
    });
  });

  it('garde la date de candidature et repousse la relance en passant à « Relance »', () => {
    const postule = changerStatut(NEUVE, 'postule', '2026-10-13');
    expect(changerStatut(postule, 'relance', '2026-10-20')).toEqual({
      statut: 'relance',
      date_candidature: '2026-10-13',
      prochaine_relance: '2026-10-27',
    });
  });

  it('retire la relance dès qu’il y a une réponse', () => {
    const postule = changerStatut(NEUVE, 'postule', '2026-10-13');
    for (const statut of ['entretien', 'offre', 'refus'] as const) {
      expect(changerStatut(postule, statut, '2026-10-15')).toEqual({
        statut,
        date_candidature: '2026-10-13',
        prochaine_relance: null,
      });
    }
  });

  it('ne compte plus la candidature comme envoyée si elle revient avant « Postulé »', () => {
    const postule = changerStatut(NEUVE, 'postule', '2026-10-13');
    expect(changerStatut(postule, 'a_postuler', '2026-10-14')).toEqual({
      statut: 'a_postuler',
      date_candidature: null,
      prochaine_relance: null,
    });
  });

  it('ne change rien si la colonne est la même', () => {
    const postule = changerStatut(NEUVE, 'postule', '2026-10-13');
    expect(changerStatut(postule, 'postule', '2026-11-01')).toBe(postule);
  });
});

describe('relances et objectif', () => {
  it('signale une relance le jour prévu et après, pas avant', () => {
    const postule = changerStatut(NEUVE, 'postule', '2026-10-13');
    expect(relanceDue(postule, '2026-10-19')).toBe(false);
    expect(relanceDue(postule, '2026-10-20')).toBe(true);
    expect(relanceDue(postule, '2026-10-25')).toBe(true);
  });

  it('ne relance pas une candidature qui a déjà une réponse', () => {
    expect(
      relanceDue(
        { statut: 'entretien', date_candidature: '2026-10-01', prochaine_relance: '2026-10-08' },
        '2026-10-13',
      ),
    ).toBe(false);
  });

  it('compte les candidatures envoyées du lundi au dimanche', () => {
    const jours = ['2026-10-11', '2026-10-12', '2026-10-13', '2026-10-18', '2026-10-19', null];
    expect(
      envoyeesCetteSemaine(
        jours.map((date_candidature) => ({ date_candidature })),
        '2026-10-14',
      ),
    ).toBe(3);
  });
});
