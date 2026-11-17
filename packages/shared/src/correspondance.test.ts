import { describe, expect, it } from 'vitest';
import { correspondance } from './correspondance';
import { PROFIL_CV_VIDE } from './cv';

const PROFIL = {
  ...PROFIL_CV_VIDE,
  competences: ['PostgreSQL', 'Docker', 'Node.js'],
  resume: { en: 'I built REST APIs.' },
};

describe('correspondance', () => {
  it('compare les technologies citées par l’offre au profil', () => {
    const resultat = correspondance(PROFIL, {
      titre: 'Backend internship (Go)',
      description: 'Golang, PostgreSQL, Docker, Kubernetes and REST APIs.',
    });
    expect(resultat).toEqual({
      etat: 'ok',
      pourcent: 60,
      presentes: ['PostgreSQL', 'API REST', 'Docker'],
      absentes: ['Go', 'Kubernetes'],
    });
  });

  it('signale un profil vide', () => {
    expect(
      correspondance(PROFIL_CV_VIDE, { titre: 'Stage', description: 'Go, Docker, SQL' }),
    ).toEqual({
      etat: 'profil_vide',
    });
  });

  it('refuse de conclure sur moins de trois mots-clés', () => {
    expect(correspondance(PROFIL, { titre: 'Stage', description: 'Python et Docker.' })).toEqual({
      etat: 'trop_peu',
      nombre: 2,
    });
  });
});
