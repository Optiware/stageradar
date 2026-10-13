import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import {
  PersistQueryClientProvider,
  removeOldestQuery,
} from '@tanstack/react-query-persist-client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import '@fontsource-variable/plus-jakarta-sans';
import './index.css';
import { AuthProvider } from './lib/AuthProvider';
import { supabase } from './lib/supabase';
import { appliquerTheme, themeEnregistre } from './lib/theme';

appliquerTheme(themeEnregistre());

// Mise à jour de l'application : dès qu'une nouvelle version est en ligne, elle est installée et
// la page se recharge d'elle-même. Sans cela, il fallait ouvrir l'application deux fois pour la voir.
const UNE_HEURE = 60 * 60 * 1000;
registerSW({
  immediate: true,
  onRegisteredSW(_adresse, enregistrement) {
    if (!enregistrement) return;
    // L'application installée reste souvent ouverte : on revérifie au retour et toutes les heures.
    const verifier = () => void enregistrement.update().catch(() => undefined);
    window.setInterval(verifier, UNE_HEURE);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') verifier();
    });
  },
});

// Consultation hors ligne (§5.4) : les dernières données lues sont gardées sur l'appareil pendant
// une semaine et réaffichées aussitôt, avant d'être rafraîchies dès que le réseau répond.
const UNE_SEMAINE = 7 * 24 * UNE_HEURE;
const CLE_CACHE = 'stageradar-cache';
const queryClient = new QueryClient({
  defaultOptions: { queries: { gcTime: UNE_SEMAINE } },
});

function stockage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    // Stockage interdit (navigation privée stricte) : l'application marche, sans hors-ligne.
    return undefined;
  }
}

const persister = createSyncStoragePersister({
  storage: stockage(),
  key: CLE_CACHE,
  // Stockage plein : les lectures les plus anciennes sont abandonnées.
  retry: removeOldestQuery,
});

// À la déconnexion, plus rien de personnel ne doit rester sur l'appareil.
supabase?.auth.onAuthStateChange((evenement) => {
  if (evenement !== 'SIGNED_OUT') return;
  queryClient.clear();
  stockage()?.removeItem(CLE_CACHE);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: UNE_SEMAINE,
        // À changer quand la forme des données gardées change : l'ancien cache est alors ignoré.
        buster: '1',
        dehydrateOptions: {
          // Ce que sait faire le navigateur (traduction sur l'appareil) se redemande à chaque visite.
          shouldDehydrateQuery: (requete) =>
            requete.state.status === 'success' && requete.queryKey[0] !== 'traduction',
        },
      }}
    >
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </PersistQueryClientProvider>
  </StrictMode>,
);
