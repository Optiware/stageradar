// Pages écrites pour les tests : positions et textes inventés, sur le modèle d'un CV en deux
// colonnes avec un en-tête au-dessus.
import { describe, expect, it } from 'vitest';
import { PROFIL_CV_VIDE } from './cv';
import { fusionnerProfil, lireCv, type MorceauPdf, type PagePdf } from './cv-pdf';

function m(texte: string, x: number, y: number, hauteur = 10): MorceauPdf {
  return { texte, x, y, largeur: texte.length * hauteur * 0.5, hauteur };
}

const PAGE: PagePdf = {
  largeur: 596,
  morceaux: [
    // Désordre volontaire : pdf.js ne rend pas toujours les morceaux dans l'ordre de lecture.
    m('EXPÉRIENCES PROFESSIONNELLES', 300, 600, 14),
    m('CAMILLE', 32, 780, 36),
    m('MARTIN', 32, 740, 36),
    m('DÉVELOPPEUSE WEB', 32, 705, 14),
    m('CONTACT', 32, 600, 14),
    m('06 12 34 56 78', 32, 575),
    m('camille@example.test', 32, 560),
    m('12 rue des Lilas, 69003', 32, 545),
    m('LYON', 32, 532),
    m('github.com/camille', 32, 518),
    m('COMPÉTENCES', 32, 470, 14),
    m('React, TypeScript', 32, 450),
    m('PostgreSQL', 32, 437),
    m('LANGUES', 32, 380, 14),
    m('Français (langue maternelle)', 32, 360),
    m('Anglais (B2)', 32, 347),
    m('2025', 300, 572),
    m('Stage développeuse', 340, 572),
    m('Orbitane, Lyon', 340, 558),
    m('• Développement d’une API', 340, 544),
    m('• Tests et revue de code avec', 340, 531),
    m('l’équipe plateforme', 350, 518),
    m('FORMATION', 300, 470, 14),
    m('BTS SIO - Les Chartreux', 300, 450),
    m('2024 - 2026', 470, 450),
    m('Baccalauréat général - Lycée Ampère', 300, 432),
    m('2021 - 2024', 470, 432),
  ],
};

describe('lireCv', () => {
  const lu = lireCv([PAGE]);
  const p = lu.profil;

  it('remet les deux colonnes et l’en-tête dans l’ordre, et détecte la langue', () => {
    expect(lu.langue).toBe('fr');
    expect([p.prenom, p.nom]).toEqual(['Camille', 'Martin']);
    expect(p.titre).toEqual({ fr: 'Développeuse web' });
  });

  it('range les coordonnées', () => {
    expect(p.email).toBe('camille@example.test');
    expect(p.telephone).toBe('06 12 34 56 78');
    expect(p.adresse).toBe('12 rue des Lilas, 69003 Lyon');
    expect(p.ville).toBe('Lyon');
    expect(p.liens).toEqual([{ libelle: 'GitHub', url: 'https://github.com/camille' }]);
  });

  it('découpe les expériences et recolle les lignes coupées', () => {
    expect(p.experiences).toEqual([
      {
        poste: { fr: 'Stage développeuse' },
        entreprise: 'Orbitane',
        lieu: 'Lyon',
        debut: '2025',
        fin: '2025',
        points: {
          fr: ['Développement d’une API', 'Tests et revue de code avec l’équipe plateforme'],
        },
      },
    ]);
  });

  it('sépare diplôme et établissement, et repère le supérieur', () => {
    expect(
      p.formations.map((f) => [f.diplome.fr, f.etablissement, f.debut, f.fin, f.superieur]),
    ).toEqual([
      ['BTS SIO', 'Les Chartreux', '2024', '2026', true],
      ['Baccalauréat général', 'Lycée Ampère', '2021', '2024', false],
    ]);
  });

  it('range compétences et langues', () => {
    expect(p.competences).toEqual(['React', 'TypeScript', 'PostgreSQL']);
    expect(p.langues).toEqual({ fr: ['Français (langue maternelle)', 'Anglais (B2)'] });
  });
});

describe('fusionnerProfil', () => {
  const lu = lireCv([PAGE]);
  const actuel = {
    ...PROFIL_CV_VIDE,
    prenom: 'Cam',
    titre: { en: 'Web developer', fr: 'Ancien titre' },
    competences: ['Docker'],
  };

  it('complète seulement ce qui est vide', () => {
    const resultat = fusionnerProfil(actuel, lu, 'completer');
    expect(resultat.prenom).toBe('Cam');
    expect(resultat.titre).toEqual({ en: 'Web developer', fr: 'Ancien titre' });
    expect(resultat.email).toBe('camille@example.test');
    expect(resultat.competences).toEqual(['Docker', 'React', 'TypeScript', 'PostgreSQL']);
    expect(resultat.experiences).toHaveLength(1);
  });

  it('remplace dans la langue du CV et garde les autres langues', () => {
    const resultat = fusionnerProfil(actuel, lu, 'remplacer');
    expect(resultat.prenom).toBe('Camille');
    expect(resultat.titre).toEqual({ en: 'Web developer', fr: 'Développeuse web' });
    expect(resultat.competences).toEqual(['React', 'TypeScript', 'PostgreSQL']);
  });
});
