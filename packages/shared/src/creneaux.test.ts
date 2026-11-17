import { describe, expect, it } from 'vitest';
import { enPleineNuit, repererCreneaux } from './creneaux';

const REFERENCE = new Date('2026-11-11T13:20:00Z');

describe('repererCreneaux', () => {
  it('lit deux créneaux en anglais avec leur fuseau', () => {
    const creneaux = repererCreneaux(
      'Could you do a 30-minute video call next week? Tuesday 17 Nov at 10:00 JST or Wednesday 18 Nov at 16:00 JST.',
      REFERENCE,
    );
    expect(creneaux.map((creneau) => creneau.debut)).toEqual([
      '2026-11-17T01:00:00.000Z',
      '2026-11-18T07:00:00.000Z',
    ]);
  });

  it('comprend le français, « h » et le fuseau du pays quand rien n’est écrit', () => {
    expect(repererCreneaux('Disponible le 3 décembre à 14h ?', REFERENCE)[0]?.debut).toBe(
      '2026-12-03T13:00:00.000Z',
    );
    expect(repererCreneaux('Nov 20, 4pm works', REFERENCE, 'Asia/Seoul')[0]?.debut).toBe(
      '2026-11-20T07:00:00.000Z',
    );
  });

  it('passe à l’année suivante pour une date déjà passée', () => {
    expect(repererCreneaux('January 12 at 09:30 UTC', REFERENCE)[0]?.debut).toBe(
      '2027-01-12T09:30:00.000Z',
    );
  });

  it('ignore une date sans heure et ne répète pas un créneau', () => {
    expect(repererCreneaux('Internship from 1 June 2027 to 31 August 2027.', REFERENCE)).toEqual(
      [],
    );
    expect(repererCreneaux('17 Nov at 10:00 JST, so 17 Nov at 10:00 JST', REFERENCE)).toHaveLength(
      1,
    );
  });
});

describe('enPleineNuit', () => {
  it('compare à l’heure de Paris', () => {
    expect(enPleineNuit(new Date('2026-11-17T01:00:00Z'))).toBe(true);
    expect(enPleineNuit(new Date('2026-11-18T07:00:00Z'))).toBe(false);
  });
});
