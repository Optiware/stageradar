import { randomUUID } from 'node:crypto';
import { buildConnectors } from '../connectors/index';
import { clesVapid, creerNotifieur } from '../notifications/envoi';
import { collect } from '../pipeline/collect';
import { createDryStore, createStore } from '../pipeline/store';

// Point d'entrée de la collecte : `npm run collect`.
//   --a-blanc           classe et note sans rien enregistrer, et affiche les offres retenues
//   --source <motif>    ne lance que les connecteurs dont l'identifiant contient ce texte
//   --notifier          ne collecte rien : envoie les notifications en attente et, s'il est
//                       l'heure, le résumé du jour (lancé chaque heure par cron)

const args = process.argv.slice(2);
const aBlanc = args.includes('--a-blanc');
const filtre = args.includes('--source') ? args[args.indexOf('--source') + 1] : undefined;

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
const store =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createStore(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;
if (!store && !aBlanc) {
  console.error(
    'SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont nécessaires (voir .env.example), ou lancer avec --a-blanc.',
  );
  process.exit(1);
}

// Sans clés VAPID (voir installer.sh), la collecte tourne sans rien signaler.
const cles = clesVapid();
const notifieur =
  cles && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? creerNotifieur(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, cles)
    : null;

if (args.includes('--notifier')) {
  if (!notifieur) {
    console.log('Notifications non configurées : rien à envoyer.');
  } else {
    const joints = await notifieur.passage(new Date());
    console.log(`${new Date().toISOString()} Notifications : ${joints} envoi(s)`);
  }
  process.exit(0);
}

const connectors = buildConnectors(store ? await store.lireSitesCarrieres() : []).filter(
  (c) => !filtre || c.id.includes(filtre),
);
if (connectors.length === 0) {
  console.error('Aucun connecteur ne correspond.');
  process.exit(1);
}

// Délai global : une source qui ne répond plus ne bloque pas la collecte suivante.
// À blanc et sans base : les réglages par défaut suffisent.
const bilans = await collect(connectors, store ?? createDryStore(), {
  runId: randomUUID(),
  maintenant: new Date(),
  aBlanc,
  signal: AbortSignal.timeout(15 * 60_000),
  surOffre: aBlanc
    ? (offre) =>
        console.log(
          `  ${String(offre.score).padStart(3)}  ${offre.pays} ${offre.entreprise} — ${offre.titre}` +
            (offre.exclue_raison ? `  [masquée : ${offre.exclue_raison}]` : ''),
        )
    : undefined,
});

for (const bilan of bilans) {
  console.log(
    `[${bilan.statut}] ${bilan.source} : ${bilan.lues} lue(s), ${bilan.retenues} retenue(s), ` +
      `${bilan.nouvelles} nouvelle(s), ${bilan.desactivees} désactivée(s)`,
  );
  for (const erreur of bilan.erreurs.slice(0, 5)) console.error(`  - ${erreur}`);
}
const total = (cle: 'lues' | 'retenues' | 'nouvelles') =>
  bilans.reduce((somme, bilan) => somme + bilan[cle], 0);
console.log(
  `\n${bilans.length} source(s) : ${total('lues')} annonce(s) lue(s), ` +
    `${total('retenues')} retenue(s), ${total('nouvelles')} nouvelle(s)${aBlanc ? ' (à blanc)' : ''}`,
);

if (notifieur && !aBlanc) {
  try {
    const joints = await notifieur.nouvelles(
      bilans.flatMap((bilan) => bilan.nouvellesOffres),
      new Date(),
    );
    if (joints > 0) console.log(`Notifications : ${joints} envoi(s)`);
  } catch (erreur) {
    // Une notification manquée ne doit pas faire échouer la collecte.
    console.error('Notifications :', erreur instanceof Error ? erreur.message : erreur);
  }
}

// La collecte n'échoue que si toutes les sources ont échoué.
if (bilans.every((bilan) => bilan.statut === 'erreur')) process.exitCode = 1;
