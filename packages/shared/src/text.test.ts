import { describe, expect, it } from 'vitest';
import { normalizeText } from './text';

describe('normalizeText', () => {
  it('retire les accents et met en minuscules', () => {
    expect(normalizeText('Développeur Cybersécurité')).toBe('developpeur cybersecurite');
  });

  it('remplace la ponctuation et réduit les espaces', () => {
    expect(normalizeText('  Ingénieur·e   DevOps / SRE (H/F) ')).toBe('ingenieur e devops sre h f');
  });

  it('conserve les caractères utiles aux noms de technologies', () => {
    expect(normalizeText('C++ / C# developer')).toBe('c++ c# developer');
  });

  it('conserve le japonais et le coréen', () => {
    expect(normalizeText('インターン 募集')).toBe('インターン 募集');
    expect(normalizeText('ソフトウェアエンジニア')).toBe('ソフトウェアエンジニア');
    expect(normalizeText('인턴 채용')).toBe('인턴 채용');
  });

  it('renvoie une chaîne vide pour une valeur absente', () => {
    expect(normalizeText(null)).toBe('');
    expect(normalizeText(undefined)).toBe('');
  });
});
