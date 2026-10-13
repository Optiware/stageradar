import { creerServeur, verificateur } from '../api/serveur';
import { buildConnectors } from '../connectors/index';
import { clesVapid, creerNotifieur, genererClesVapid } from '../notifications/envoi';
import { createStore } from '../pipeline/store';

// Point d'entrée du service appelé par l'application (import d'une offre, collecte à la demande).
// Sur le serveur : conteneur `api` de deploy/serveur/docker-compose.yml.

// `node api.mjs --cles-vapid` : affiche une nouvelle paire de clés de notification, au format
// du fichier .env, puis s'arrête. Appelé une seule fois par installer.sh.
if (process.argv.includes('--cles-vapid')) {
  const { publique, privee } = genererClesVapid();
  console.log(`VAPID_PUBLIC_KEY=${publique}\nVAPID_PRIVATE_KEY=${privee}`);
  process.exit(0);
}

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont nécessaires.');
  process.exit(1);
}

const cles = clesVapid();
const port = Number(process.env.PORT ?? 3000);
const store = createStore(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
creerServeur({
  store,
  // Relue à chaque collecte : la liste des entreprises peut avoir été mise à jour entre-temps.
  connecteurs: async () => buildConnectors(await store.lireSitesCarrieres()),
  estProprietaire: verificateur(SUPABASE_URL),
  notifieur: cles ? creerNotifieur(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, cles) : null,
  clePublique: cles?.publique ?? null,
}).listen(port, '0.0.0.0', () => {
  console.log(`${new Date().toISOString()} Service StageRadar à l'écoute sur le port ${port}`);
});
