import { describe, expect, it } from 'vitest';
import {
  aTraduire,
  decouperPourTraduction,
  lienGoogleTraductionPage,
  lienGoogleTraductionTexte,
} from './traduction';

describe('aTraduire', () => {
  it('ne propose rien pour le français, l’anglais ou une langue inconnue', () => {
    expect(aTraduire('fr')).toBe(false);
    expect(aTraduire('en')).toBe(false);
    expect(aTraduire(null)).toBe(false);
  });

  it('propose la traduction pour les autres langues', () => {
    expect(aTraduire('ja')).toBe(true);
    expect(aTraduire('ko')).toBe(true);
    expect(aTraduire('es')).toBe(true);
  });
});

describe('decouperPourTraduction', () => {
  it('garde les puces et les lignes vides, et ne traduit que le japonais', () => {
    const texte = '募集要項\n\n• バックエンド開発\n• Python, Go\nWe are hiring.';
    expect(decouperPourTraduction(texte, 'ja')).toEqual([
      { prefixe: '', texte: '募集要項', traduire: true },
      { prefixe: '', texte: '', traduire: false },
      { prefixe: '• ', texte: 'バックエンド開発', traduire: true },
      { prefixe: '• ', texte: 'Python, Go', traduire: false },
      { prefixe: '', texte: 'We are hiring.', traduire: false },
    ]);
  });

  it('ne traduit que le coréen dans une annonce coréenne', () => {
    const segments = decouperPourTraduction('백엔드 개발 인턴\nBackend Intern', 'ko');
    expect(segments.map((segment) => segment.traduire)).toEqual([true, false]);
  });

  it('traduit toute ligne de texte pour une langue en alphabet latin', () => {
    const segments = decouperPourTraduction('- Desarrollo de APIs\n2027\n', 'es');
    expect(segments).toEqual([
      { prefixe: '- ', texte: 'Desarrollo de APIs', traduire: true },
      { prefixe: '', texte: '2027', traduire: false },
      { prefixe: '', texte: '', traduire: false },
    ]);
  });
});

describe('liens Google Traduction', () => {
  it('construit le lien d’une page traduite en français', () => {
    const lien = new URL(lienGoogleTraductionPage('https://example.test/offre?id=1&x=é'));
    expect(lien.origin + lien.pathname).toBe('https://translate.google.com/translate');
    expect(lien.searchParams.get('tl')).toBe('fr');
    expect(lien.searchParams.get('sl')).toBe('auto');
    expect(lien.searchParams.get('u')).toBe('https://example.test/offre?id=1&x=é');
  });

  it('remplit le traducteur avec un texte court en entier', () => {
    const { url, complet } = lienGoogleTraductionTexte('こんにちは\n世界');
    expect(complet).toBe(true);
    expect(new URL(url).searchParams.get('text')).toBe('こんにちは\n世界');
    expect(new URL(url).searchParams.get('op')).toBe('translate');
  });

  it('coupe un texte trop long pour une adresse, sans trancher un caractère', () => {
    const { url, complet } = lienGoogleTraductionTexte('日本語'.repeat(2000));
    expect(complet).toBe(false);
    expect(url.length).toBeLessThan(6100);
    const texte = new URL(url).searchParams.get('text')!;
    expect(texte.length).toBeGreaterThan(500);
    expect('日本語'.repeat(2000).startsWith(texte)).toBe(true);
  });
});
