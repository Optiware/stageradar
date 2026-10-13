import { describe, expect, it } from 'vitest';
import { jourDe, trierEcheances, versIcs, type Echeance } from './agenda';

const MAINTENANT = new Date('2026-10-13T08:00:00Z');

const ENTRETIEN: Echeance = {
  id: 'entretien-1',
  type: 'entretien',
  titre: 'Entretien : Kumo Labs, Tokyo',
  date: '2026-10-20T12:00:00.000Z',
  heure: true,
  details: 'Visio ; préparer le projet\nNotes',
  lien: 'https://visio.example.test/salle',
};
const RELANCE: Echeance = {
  id: 'relance-1',
  type: 'relance',
  titre: 'Relancer Orbitane',
  date: '2026-10-15',
  heure: false,
};

describe('agenda', () => {
  it('trie par date, la journée entière avant l’heure précise', () => {
    const jour = jourDe(ENTRETIEN);
    const memeJour: Echeance = { ...RELANCE, id: 'relance-2', date: jour };
    expect(trierEcheances([ENTRETIEN, memeJour, RELANCE]).map((e) => e.id)).toEqual([
      'relance-1',
      'relance-2',
      'entretien-1',
    ]);
  });

  it('exporte un entretien avec son heure, sa durée et ses deux rappels', () => {
    const ics = versIcs([ENTRETIEN], MAINTENANT);
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('UID:entretien-1@stageradar\r\n');
    expect(ics).toContain('DTSTAMP:20261013T080000Z\r\n');
    expect(ics).toContain('DTSTART:20261020T120000Z\r\n');
    expect(ics).toContain('DTEND:20261020T130000Z\r\n');
    expect(ics).toContain('SUMMARY:Entretien : Kumo Labs\\, Tokyo\r\n');
    expect(ics).toContain('DESCRIPTION:Visio \\; préparer le projet\\nNotes\r\n');
    expect(ics).toContain('URL:https://visio.example.test/salle\r\n');
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(2);
    expect(ics).toContain('TRIGGER:-P1D');
    expect(ics).toContain('TRIGGER:-PT1H');
  });

  it('exporte une relance sur la journée, sans rappel', () => {
    const ics = versIcs([RELANCE], MAINTENANT);
    expect(ics).toContain('DTSTART;VALUE=DATE:20261015\r\n');
    expect(ics).toContain('DTEND;VALUE=DATE:20261016\r\n');
    expect(ics).not.toContain('VALARM');
  });

  it('plie les lignes de plus de 75 octets sans couper un caractère', () => {
    const ics = versIcs([{ ...RELANCE, titre: 'Échéance très éloignée '.repeat(6) }], MAINTENANT);
    const encodeur = new TextEncoder();
    for (const ligne of ics.split('\r\n')) {
      expect(encodeur.encode(ligne).length).toBeLessThanOrEqual(75);
    }
    const deplie = ics.replace(/\r\n /g, '');
    expect(deplie).toContain(`SUMMARY:${'Échéance très éloignée '.repeat(6)}`);
  });
});
