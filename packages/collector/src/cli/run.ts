import { connectors } from '../connectors/index';
import { runConnectors } from '../pipeline/run-connectors';

// Point d'entrée de la collecte : `npm run collect`.
// Au Lot 0, il se contente d'exécuter le registre (vide) et d'afficher un bilan.
// L'écriture en base, le dédoublonnage et la notation arrivent au Lot 3.

const results = await runConnectors(connectors);

if (results.length === 0) {
  console.log('Aucun connecteur enregistré pour le moment.');
}

for (const result of results) {
  const duree = result.fin.getTime() - result.debut.getTime();
  console.log(
    `[${result.statut}] ${result.source} : ${result.offers.length} offre(s) en ${duree} ms`,
  );
  for (const erreur of result.erreurs) {
    console.error(`  - ${erreur}`);
  }
}

// La collecte n'échoue que si toutes les sources ont échoué.
if (results.length > 0 && results.every((result) => result.statut === 'erreur')) {
  process.exitCode = 1;
}
