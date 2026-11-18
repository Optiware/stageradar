import { describe, expect, it } from 'vitest';
import {
  composerLettre,
  passagesAEcrire,
  periodeLettre,
  texteLettre,
  texteRelance,
  type DonneesLettre,
} from './lettres';
import { aCompleter } from './messages';
import { apresRelance } from './suivi';

const BASE: DonneesLettre = {
  format: 'email',
  langue: 'en',
  modele: 'offre',
  entreprise: 'Hoshi Labs',
  poste: 'Backend internship (Go)',
  contact: 'Aiko T.',
  debut: '2027-06-01',
  fin: '2027-08-31',
  semaines: 12,
  presentation: null,
  projets: [{ titre: 'StageRadar', technologies: ['React', 'TypeScript', 'PostgreSQL', 'Docker'] }],
  nom: 'Camille Martin',
};

describe('periodeLettre', () => {
  it('écrit la période dans chaque langue', () => {
    expect(periodeLettre('2027-06-01', '2027-08-31', 12, 'en')).toBe(
      'from June to August 2027 (12 weeks)',
    );
    expect(periodeLettre('2027-06-01', '2027-08-31', null, 'fr')).toBe('de juin à août 2027');
    expect(periodeLettre('2027-06-01', '2027-08-31', 10, 'es')).toBe(
      'de junio a agosto de 2027 (10 semanas)',
    );
    expect(periodeLettre(null, null, null, 'en')).toBeNull();
  });
});

describe('composerLettre', () => {
  it('remplit l’offre, le contact, les projets et la signature', () => {
    const trame = composerLettre(BASE);
    const { objet, corps } = texteLettre(trame, {});
    expect(objet).toBe('Application: Backend internship (Go), from June to August 2027 (12 weeks)');
    expect(corps).toContain('Hello Aiko,');
    expect(corps).toContain(
      "I'm applying for the Backend internship (Go) position at Hoshi Labs, from June to August 2027 (12 weeks).",
    );
    expect(corps).toContain('Recently I built StageRadar (React, TypeScript, PostgreSQL).');
    expect(corps).toContain('Best regards,\nCamille Martin');
  });

  it('laisse à écrire ce qui est personnel et bloque l’envoi tant que c’est vide', () => {
    const trame = composerLettre(BASE);
    expect(passagesAEcrire(trame).map((passage) => passage.id)).toEqual([
      'presentation',
      'pourquoi',
      'apprendre',
    ]);
    expect(aCompleter(texteLettre(trame, {}).corps)).toBe(true);
    const rempli = texteLettre(trame, {
      presentation: 'I study engineering in Lyon.',
      pourquoi: 'Your platform team ships fast.',
      apprendre: 'I want to learn Go in production.',
    });
    expect(aCompleter(rempli.corps)).toBe(false);
  });

  it('écrit un message LinkedIn court, sans objet', () => {
    const trame = composerLettre({
      ...BASE,
      format: 'linkedin',
      langue: 'fr',
      presentation: 'Étudiant en école d’ingénieur.',
    });
    expect(trame.objet).toBeNull();
    expect(texteLettre(trame, {}).corps).toContain(
      'Étudiant en école d’ingénieur. Je souhaite postuler au poste « Backend internship (Go) » chez Hoshi Labs, de juin à août 2027 (12 semaines).',
    );
  });

  it('propose une prise de contact spontanée en espagnol', () => {
    const corps = texteLettre(
      composerLettre({ ...BASE, langue: 'es', modele: 'spontanee', contact: null, projets: [] }),
      {},
    ).corps;
    expect(corps).toContain('Hola,');
    expect(corps).toContain(
      'Me encantaría unirme a Hoshi Labs como practicante de junio a agosto de 2027 (12 semanas).',
    );
    expect(corps).toContain('[Un projet dont tu es fier, en une phrase (en espagnol)]');
  });
});

describe('texteRelance', () => {
  it('relance dans la langue du contact avec la date d’envoi', () => {
    const texte = texteRelance({
      langue: 'en',
      contact: 'Min-jun K.',
      poste: 'DevOps / SRE internship',
      entreprise: 'Hanul Cloud',
      envoi: '2026-11-04',
      rang: 1,
      nom: null,
    });
    expect(texte).toContain('Hi Min-jun,');
    expect(texte).toContain('the DevOps / SRE internship position, sent on 4 November');
    expect(aCompleter(texte)).toBe(true);
  });
});

describe('apresRelance', () => {
  it('planifie J+14 après la première relance, puis plus rien', () => {
    const premiere = apresRelance(
      { statut: 'postule', date_candidature: '2026-11-04', prochaine_relance: '2026-11-11' },
      '2026-11-11',
    );
    expect(premiere).toEqual({
      statut: 'relance',
      date_candidature: '2026-11-04',
      prochaine_relance: '2026-11-18',
    });
    expect(apresRelance(premiere, '2026-11-18').prochaine_relance).toBeNull();
  });
});
