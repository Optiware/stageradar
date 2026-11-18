import { describe, expect, it } from 'vitest';
import { genererCv, PROFIL_CV_VIDE, type ProfilCv } from './cv';
import {
  deplacer,
  lectureRobot,
  MISE_EN_PAGE_DEFAUT,
  ordonner,
  resserrer,
  texteRobot,
  type MiseEnPageCv,
} from './cv-mise-en-page';

const PROFIL: ProfilCv = {
  ...PROFIL_CV_VIDE,
  prenom: 'Camille',
  nom: 'Martin',
  email: 'camille@example.test',
  telephone: '+33 6 12 34 56 78',
  ville: 'Lyon',
  titre: { en: 'Engineering student' },
  competences: ['React', 'PostgreSQL', 'Docker'],
  formations: [
    {
      diplome: { en: 'Engineering degree' },
      etablissement: 'École',
      lieu: 'Lyon',
      debut: '2026-09',
      fin: '',
      superieur: true,
      details: {},
    },
  ],
  projets: [{ nom: 'StageRadar', url: '', description: { en: 'Job-search web app.' } }],
};

describe('ordonner et deplacer', () => {
  it('suit l’ordre choisi, garde les autres à la suite et retire les masqués', () => {
    const cv = genererCv(PROFIL, 'JP', { langue: 'en' });
    const ids = cv.sections.map((section) => section.id);
    const miseEnPage = {
      ...MISE_EN_PAGE_DEFAUT,
      ordre: ['projets' as const],
      masques: ['competences' as const],
    };
    const resultat = ordonner(cv.sections, miseEnPage).map((section) => section.id);
    expect(resultat[0]).toBe('projets');
    expect(resultat).not.toContain('competences');
    expect(resultat.length).toBe(ids.filter((id) => id !== 'competences').length);
  });

  it('déplace un bloc à la place d’un autre', () => {
    expect(deplacer(['profil', 'formation', 'projets'], 'projets', 'profil')).toEqual([
      'projets',
      'profil',
      'formation',
    ]);
    expect(deplacer(['profil', 'formation', 'projets'], 'profil', 'projets')).toEqual([
      'formation',
      'projets',
      'profil',
    ]);
  });
});

describe('resserrer', () => {
  it('réduit l’interligne, puis la taille, puis les marges, puis s’arrête', () => {
    let miseEnPage: MiseEnPageCv = {
      ...MISE_EN_PAGE_DEFAUT,
      interligne: 1.3,
      taille: 9.5,
      marges: 'normales' as const,
    };
    const etapes = [];
    for (let suivante = resserrer(miseEnPage); suivante; suivante = resserrer(miseEnPage)) {
      etapes.push(suivante);
      miseEnPage = suivante;
    }
    expect(etapes.map((etape) => [etape.interligne, etape.taille, etape.marges])).toEqual([
      [1.2, 9.5, 'normales'],
      [1.2, 9, 'normales'],
      [1.2, 9, 'etroites'],
    ]);
  });
});

describe('lecture par un logiciel de tri', () => {
  it('retrouve nom, e-mail, téléphone, intitulés et compétences, et signale une date sans année', () => {
    const cv = genererCv(PROFIL, 'JP', { langue: 'en' });
    const texte = texteRobot(cv, cv.sections);
    expect(texte.split('\n')[0]).toBe('Camille MARTIN');
    expect(texte).toContain('camille@example.test');
    const champs = Object.fromEntries(
      lectureRobot(cv, cv.sections).map((champ) => [champ.libelle, champ]),
    );
    expect(champs['E-mail']?.ok).toBe(true);
    expect(champs['Téléphone']?.valeur).toBe('+33 6 12 34 56 78');
    expect(champs['Compétences']?.valeur).toBe('3 trouvées');
    expect(champs['Dates']?.ok).toBe(true);

    const sansAnnee = {
      ...cv,
      sections: cv.sections.map((section) =>
        section.id === 'formation'
          ? { ...section, elements: [{ titre: 'École', dates: 'Sept. – [ANNÉE]' }] }
          : section,
      ),
    };
    expect(
      lectureRobot(sansAnnee, sansAnnee.sections).find((champ) => champ.libelle === 'Dates'),
    ).toMatchObject({ ok: false });
  });
});
