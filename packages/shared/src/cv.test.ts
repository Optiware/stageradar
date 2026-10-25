import { describe, expect, it } from 'vitest';
import {
  attentesOffre,
  CONVENTIONS_CV,
  genererCv,
  PAYS_CV,
  periodeCv,
  profilCvComplet,
  type ProfilCv,
} from './cv';

const PROFIL: ProfilCv = profilCvComplet({
  prenom: 'Camille',
  nom: 'Martin',
  titre: { fr: 'Développeuse web', en: 'Web developer' },
  resume: { fr: 'Étudiante en informatique.', en: 'Computer science student.' },
  email: 'camille@example.test',
  telephone: '+33 6 00 00 00 00',
  adresse: '1 rue de la Paix, 69000 Lyon',
  ville: 'Lyon',
  date_naissance: '2004-03-15',
  nationalite: { fr: 'Française', en: 'French' },
  permis: { fr: 'Permis B' },
  experiences: [
    {
      poste: { fr: 'Stage développeuse', en: 'Developer intern' },
      entreprise: 'Exemple',
      lieu: 'Lyon',
      debut: '2025-05',
      fin: '2025-06',
      points: {
        fr: ['Support client', 'Développement React'],
        en: ['Customer support', 'React development', 'Code reviews', 'A', 'B', 'C', 'D', 'E'],
      },
    },
  ],
  formations: [
    {
      diplome: { fr: 'BTS SIO', en: 'BTS in IT' },
      etablissement: 'Lycée',
      lieu: 'Lyon',
      debut: '2024',
      fin: '2026',
      superieur: true,
      details: {},
    },
    {
      diplome: { fr: 'Baccalauréat', en: 'High school diploma' },
      etablissement: 'Lycée',
      lieu: 'Lyon',
      debut: '2020',
      fin: '2022',
      superieur: false,
      details: {},
    },
  ],
  competences: ['HTML/CSS', 'TypeScript', 'React', 'MySQL'],
  langues: { fr: ['Français : langue maternelle'], en: ['French: native'] },
});

describe('générateur de CV', () => {
  it('cite une source pour chaque règle de chaque pays', () => {
    for (const pays of PAYS_CV) {
      const convention = CONVENTIONS_CV[pays];
      expect(convention.regles.length).toBeGreaterThan(0);
      for (const regle of [
        ...convention.regles,
        ...(convention.autreFormat ? [convention.autreFormat] : []),
      ]) {
        expect(regle.source.url).toMatch(/^https:\/\//);
      }
    }
  });

  it('écrit les périodes dans la langue du CV', () => {
    expect(periodeCv('2022', '2024', 'fr')).toBe('2022 – 2024');
    expect(periodeCv('2026', '2026', 'en')).toBe('2026');
    expect(periodeCv('2025-09', '', 'en')).toBe('Sep 2025 – Present');
    expect(periodeCv('2025-09', '', 'es')).toMatch(/2025 – Actualidad$/);
  });

  it('suit les usages français : adresse complète, permis, formation avant l’expérience', () => {
    const cv = genererCv(PROFIL, 'FR');
    expect(cv.langue).toBe('fr');
    expect(cv.nom).toBe('Camille MARTIN');
    expect(cv.coordonnees).toEqual([
      '1 rue de la Paix, 69000 Lyon',
      '+33 6 00 00 00 00',
      'camille@example.test',
      'Permis B',
    ]);
    expect(cv.sections.map((section) => section.id)).toEqual([
      'profil',
      'formation',
      'experience',
      'competences',
      'langues',
    ]);
  });

  it('au Japon : ville seule, études supérieures seulement, visa et GitHub signalés', () => {
    const cv = genererCv(PROFIL, 'JP');
    expect(cv.langue).toBe('en');
    expect(cv.coordonnees[0]).toBe('Lyon');
    const formation = cv.sections.find((section) => section.id === 'formation');
    expect(formation?.elements.map((element) => element.titre)).toEqual(['BTS in IT']);
    expect(cv.alertes.join(' ')).toMatch(/visa/);
    expect(cv.alertes.join(' ')).toMatch(/GitHub/);
  });

  it('en Corée : date de naissance et nationalité dans l’en-tête', () => {
    const cv = genererCv(PROFIL, 'KR');
    expect(cv.coordonnees).toContain('Date of birth : March 15, 2004');
    expect(cv.coordonnees).toContain('Nationality : French');
  });

  it('au Canada : sept points au plus par expérience', () => {
    const cv = genererCv(PROFIL, 'CA');
    const experience = cv.sections.find((section) => section.id === 'experience');
    expect(experience?.elements[0]?.points).toHaveLength(7);
    expect(cv.alertes.join(' ')).toMatch(/8 points, 7 au plus/);
  });

  it('au Royaume-Uni : références sur demande, sans date de naissance', () => {
    const cv = genererCv(PROFIL, 'GB');
    expect(cv.sections.at(-1)?.elements[0]?.texte).toBe('References available on request.');
    expect(cv.coordonnees.join(' ')).not.toMatch(/2004/);
  });

  it('signale une date de naissance gardée là où elle est déconseillée', () => {
    const cv = genererCv(PROFIL, 'GB', { dateNaissance: true });
    expect(cv.alertes.join(' ')).toMatch(/Date de naissance affichée/);
  });

  it('signale les textes sans version dans la langue choisie, sans rien inventer', () => {
    const cv = genererCv(PROFIL, 'CO');
    expect(cv.langue).toBe('es');
    expect(cv.titre).toBe('');
    expect(cv.alertes).toContain('Titre : pas de version espagnole.');
  });

  it('met en avant ce que l’offre attend, sans ajouter de compétence', () => {
    const offre = {
      titre: 'Frontend intern',
      description: 'You will build features in React and TypeScript, deployed with Docker on AWS.',
      langues_requises: ['ja'],
    };
    expect(attentesOffre(PROFIL, offre)).toEqual({
      trouvees: ['TypeScript', 'React'],
      absentes: ['docker', 'aws'],
      languesAbsentes: ['ja'],
    });
    const cv = genererCv(PROFIL, 'FR', { offre });
    const competences = cv.sections.find((section) => section.id === 'competences');
    expect(competences?.elements[0]?.texte).toBe('TypeScript · React · HTML/CSS · MySQL');
    const experience = cv.sections.find((section) => section.id === 'experience');
    expect(experience?.elements[0]?.points).toEqual(['Développement React', 'Support client']);
  });

  it('reconnaît une compétence saisie sous une forme groupée', () => {
    expect(attentesOffre(PROFIL, { titre: 'Stage', description: 'HTML et CSS' }).trouvees).toEqual([
      'HTML/CSS',
    ]);
  });
});
