import { creerServeur, verificateur } from '../api/serveur';
import { buildConnectors } from '../connectors/index';
import { createStore } from '../pipeline/store';

// Point d'entrée du service appelé par l'application (import d'une offre, collecte à la demande).
// Sur le serveur : conteneur `api` de deploy/serveur/docker-compose.yml.

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont nécessaires.');
  process.exit(1);
}

const port = Number(process.env.PORT ?? 3000);
creerServeur({
  store: createStore(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY),
  // Relue à chaque collecte : la liste des entreprises peut avoir été mise à jour entre-temps.
  connecteurs: buildConnectors,
  estProprietaire: verificateur(SUPABASE_URL),
}).listen(port, '0.0.0.0', () => {
  console.log(`${new Date().toISOString()} Service StageRadar à l'écoute sur le port ${port}`);
});
