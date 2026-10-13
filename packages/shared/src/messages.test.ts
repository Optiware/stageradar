import { describe, expect, it } from 'vitest';
import { aCompleter, composerMessage, lienMessagerie, periodeEnClair } from './messages';

const BASE = {
  entreprise: 'Exemple',
  contact: 'Aiko Tanaka',
  presentation: 'I am a second-year computer science student in Lyon.',
  debut: '2027-06-01',
  fin: '2027-08-31',
} as const;

describe('periodeEnClair', () => {
  it('écrit la période dans la langue du message', () => {
    expect(periodeEnClair('2027-06-01', '2027-08-31', 'en')).toBe('from June to August 2027');
    expect(periodeEnClair('2027-06-01', '2027-08-31', 'fr')).toBe('de juin à août 2027');
  });
});

describe('composerMessage', () => {
  it('rédige un premier contact en anglais avec le prénom, la présentation et la période', () => {
    const message = composerMessage({ ...BASE, langue: 'en', type: 'premier_contact' });
    expect(message.objet).toBe('Software engineering internship from June to August 2027');
    expect(message.corps).toContain('Hello Aiko,');
    expect(message.corps).toContain(BASE.presentation);
    expect(message.corps).toContain('I have been following Exemple');
    expect(aCompleter(message.corps)).toBe(true);
  });

  it('laisse un passage à remplir quand la présentation est vide ou le contact inconnu', () => {
    const message = composerMessage({
      ...BASE,
      contact: null,
      presentation: '  ',
      langue: 'fr',
      type: 'premier_contact',
    });
    expect(message.corps.startsWith('Bonjour,\n\n[Deux phrases pour te présenter')).toBe(true);
    expect(message.corps).toContain('en stage de juin à août 2027');
  });

  it('rédige une relance plus courte', () => {
    const message = composerMessage({ ...BASE, langue: 'en', type: 'relance' });
    expect(message.objet).toContain('following up');
    expect(message.corps).not.toContain(BASE.presentation);
  });
});

describe('lienMessagerie', () => {
  const message = { objet: 'Stage & été', corps: 'Bonjour,\n\nÀ bientôt ?' };

  it('encode l’objet et le corps', () => {
    expect(lienMessagerie(' jobs@exemple.test ', message)).toBe(
      'mailto:jobs@exemple.test?subject=Stage%20%26%20%C3%A9t%C3%A9&body=Bonjour%2C%0A%0A%C3%80%20bient%C3%B4t%20%3F',
    );
  });

  it('refuse une adresse absente ou mal formée', () => {
    expect(lienMessagerie(null, message)).toBeNull();
    expect(lienMessagerie('pas une adresse', message)).toBeNull();
    expect(lienMessagerie('a@b.c?bcc=x@y.z', message)).toBeNull();
  });
});
