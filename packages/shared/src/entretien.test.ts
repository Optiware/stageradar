import { describe, expect, it } from 'vitest';
import { compteARebours, SOURCES_QUESTIONS, sourcesPourPays } from './entretien';

describe('sourcesPourPays', () => {
  it('choisit les questions selon le pays', () => {
    expect(sourcesPourPays('JP').map((source) => source.id)).toEqual(['japan-dev', 'umbc']);
    expect(sourcesPourPays('FR').map((source) => source.id)).toEqual(['cidj']);
    expect(sourcesPourPays('KR').map((source) => source.id)).toEqual(['umbc']);
  });

  it('cite une page web et une date pour chaque source, et des identifiants uniques', () => {
    for (const source of SOURCES_QUESTIONS) {
      expect(source.url).toMatch(/^https:\/\//);
      expect(source.verifiee).not.toBe('');
    }
    const ids = SOURCES_QUESTIONS.flatMap((source) =>
      source.questions.map((question) => question.id),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('compteARebours', () => {
  const maintenant = new Date('2026-11-17T22:40:00Z');
  it('affiche les heures et minutes, puis les jours', () => {
    expect(compteARebours(new Date('2026-11-18T08:00:00Z'), maintenant)).toBe('dans 9 h 20');
    expect(compteARebours(new Date('2026-11-17T23:00:00Z'), maintenant)).toBe('dans 20 min');
    expect(compteARebours(new Date('2026-11-21T08:00:00Z'), maintenant)).toBe('dans 3 jours');
    expect(compteARebours(new Date('2026-11-17T22:00:00Z'), maintenant)).toBe('maintenant');
    expect(compteARebours(new Date('2026-11-17T20:00:00Z'), maintenant)).toBe('passé');
  });
});
