/** Fait enregistrer un fichier produit par l'application (export, agenda). */
export function telecharger(nom: string, contenu: string, type: string): void {
  const adresse = URL.createObjectURL(new Blob([contenu], { type }));
  const lien = document.createElement('a');
  lien.href = adresse;
  lien.download = nom;
  document.body.append(lien);
  lien.click();
  lien.remove();
  // Le navigateur a besoin de l'adresse le temps de lancer l'enregistrement.
  window.setTimeout(() => URL.revokeObjectURL(adresse), 10_000);
}

/** Une ligne CSV (RFC 4180) : guillemets autour de chaque valeur, doublés à l'intérieur. */
export function ligneCsv(valeurs: (string | number | null | undefined)[]): string {
  return valeurs
    .map((valeur) => {
      const brut = String(valeur ?? '');
      // Un tableur exécuterait une cellule qui commence par =, +, - ou @ : on la neutralise.
      const texte = /^[=+\-@\t\r]/.test(brut) ? `'${brut}` : brut;
      return `"${texte.replaceAll('"', '""')}"`;
    })
    .join(';');
}
