import { describe, expect, it } from 'vitest';
import {
  enHeuresCalmes,
  messageResume,
  messagesNouvelles,
  minutesAvantFin,
  momentLocal,
} from '../src/notifications/messages';
import type { OffreNouvelle } from '../src/pipeline/collect';

function offre(overrides: Partial<OffreNouvelle>): OffreNouvelle {
  return {
    id: 'id-1',
    titre: 'Software Engineer Intern',
    entreprise: 'Exemple',
    pays: 'JP',
    score: 80,
    exclue_raison: null,
    ...overrides,
  };
}

describe('moment des notifications', () => {
  it('donne le jour et l’heure de Paris, été comme hiver', () => {
    expect(momentLocal(new Date('2026-10-13T21:30:00Z'), 'Europe/Paris')).toEqual({
      jour: '2026-10-13',
      heure: '23:30',
    });
    expect(momentLocal(new Date('2026-12-31T23:30:00Z'), 'Europe/Paris')).toEqual({
      jour: '2027-01-01',
      heure: '00:30',
    });
  });

  it('reconnaît des heures calmes qui passent minuit', () => {
    const calmes = { debut: '22:00', fin: '08:00' };
    expect(enHeuresCalmes('23:15', calmes)).toBe(true);
    expect(enHeuresCalmes('07:59', calmes)).toBe(true);
    expect(enHeuresCalmes('08:00', calmes)).toBe(false);
    expect(enHeuresCalmes('21:59', calmes)).toBe(false);
    expect(enHeuresCalmes('13:00', { debut: '12:00', fin: '14:00' })).toBe(true);
    expect(enHeuresCalmes('03:00', { debut: '00:00', fin: '00:00' })).toBe(false);
  });

  it('calcule l’attente jusqu’à la fin des heures calmes', () => {
    expect(minutesAvantFin('23:30', '08:00')).toBe(510);
    expect(minutesAvantFin('07:45', '08:00')).toBe(15);
  });
});

describe('contenu des notifications', () => {
  it('signale chaque offre au score suffisant, la mieux notée d’abord', () => {
    const messages = messagesNouvelles(
      [
        offre({ id: 'a', score: 76 }),
        offre({ id: 'b', score: 92, titre: 'Stage backend', pays: 'KR' }),
        offre({ id: 'c', score: 60 }),
        offre({ id: 'd', score: 95, exclue_raison: 'Hors domaine' }),
      ],
      75,
    );
    expect(messages).toEqual([
      {
        titre: 'Nouvelle offre notée 92',
        corps: 'Stage backend · Exemple · Corée du Sud',
        url: '/?offre=b',
        etiquette: 'offre-b',
      },
      {
        titre: 'Nouvelle offre notée 76',
        corps: 'Software Engineer Intern · Exemple · Japon',
        url: '/?offre=a',
        etiquette: 'offre-a',
      },
    ]);
  });

  it('regroupe les offres quand il y en a beaucoup', () => {
    const offres = [80, 85, 99, 90].map((score, rang) => offre({ id: `o${rang}`, score }));
    expect(messagesNouvelles(offres, 75)).toEqual([
      {
        titre: '4 nouvelles offres bien notées',
        corps: 'La mieux notée (99) : Software Engineer Intern, Exemple.',
        url: '/',
        etiquette: 'nouvelles-offres',
      },
    ]);
  });

  it('ne dit rien quand aucune offre n’atteint le seuil', () => {
    expect(messagesNouvelles([offre({ score: 50 })], 75)).toEqual([]);
  });

  it('résume la journée, ou se tait s’il n’y a rien', () => {
    expect(
      messageResume({ nouvelles: 3, relances: 1, echeances: ['Canada, Ouverture (20/01)'] }),
    ).toMatchObject({
      corps: '3 nouvelles offres · 1 relance à faire · Échéance : Canada, Ouverture (20/01)',
      url: '/important',
    });
    expect(messageResume({ nouvelles: 0, relances: 0, echeances: [] })).toBeNull();
  });
});
