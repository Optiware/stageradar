/** Une ligne de budget saisie par l'utilisateur. */
export interface LigneBudget {
  libelle: string;
  montant: number;
  /** Dépense faite une seule fois (billet d'avion, visa, caution) plutôt que chaque mois. */
  ponctuel: boolean;
}

/** Lignes proposées pour un nouveau budget : les montants restent à saisir. */
export const LIGNES_BUDGET_DEFAUT: LigneBudget[] = [
  { libelle: 'Loyer', montant: 0, ponctuel: false },
  { libelle: 'Nourriture', montant: 0, ponctuel: false },
  { libelle: 'Transports sur place', montant: 0, ponctuel: false },
  { libelle: 'Téléphone et internet', montant: 0, ponctuel: false },
  { libelle: 'Sorties', montant: 0, ponctuel: false },
  { libelle: "Billet d'avion aller-retour", montant: 0, ponctuel: true },
  { libelle: 'Visa et assurance', montant: 0, ponctuel: true },
];

/** Nombre de mois d'un séjour, arrondi au mois le plus proche (un au minimum). */
export function moisDeSejour(debut: string, fin: string): number {
  const jours =
    (new Date(`${fin}T00:00:00Z`).getTime() - new Date(`${debut}T00:00:00Z`).getTime()) /
      86_400_000 +
    1;
  // 30,44 : durée moyenne d'un mois.
  return Number.isFinite(jours) && jours > 0 ? Math.max(1, Math.round(jours / 30.44)) : 0;
}

export interface TotalBudget {
  mensuel: number;
  ponctuel: number;
  /** Coût du séjour entier : dépenses mensuelles × nombre de mois, plus les dépenses ponctuelles. */
  sejour: number;
}

export function totalBudget(lignes: LigneBudget[], mois: number): TotalBudget {
  const somme = (ponctuel: boolean) =>
    lignes
      .filter((ligne) => ligne.ponctuel === ponctuel)
      .reduce((total, ligne) => total + (Number.isFinite(ligne.montant) ? ligne.montant : 0), 0);
  const mensuel = somme(false);
  const ponctuel = somme(true);
  return { mensuel, ponctuel, sejour: mensuel * mois + ponctuel };
}
