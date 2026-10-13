import { describe, expect, it } from 'vitest';
import { moisDeSejour, totalBudget } from './budget';

describe('budget', () => {
  it('compte les mois d’un séjour, arrondis au plus proche', () => {
    expect(moisDeSejour('2027-06-01', '2027-08-31')).toBe(3);
    expect(moisDeSejour('2027-06-15', '2027-08-15')).toBe(2);
    expect(moisDeSejour('2027-06-01', '2027-06-10')).toBe(1);
    expect(moisDeSejour('2027-08-31', '2027-06-01')).toBe(0);
  });

  it('sépare les dépenses mensuelles des dépenses faites une seule fois', () => {
    const lignes = [
      { libelle: 'Loyer', montant: 80000, ponctuel: false },
      { libelle: 'Nourriture', montant: 40000, ponctuel: false },
      { libelle: 'Billet', montant: 150000, ponctuel: true },
      { libelle: 'Vide', montant: Number.NaN, ponctuel: false },
    ];
    expect(totalBudget(lignes, 3)).toEqual({ mensuel: 120000, ponctuel: 150000, sejour: 510000 });
  });
});
