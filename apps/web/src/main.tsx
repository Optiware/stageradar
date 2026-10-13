import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import '@fontsource-variable/plus-jakarta-sans';
import './index.css';
import { AuthProvider } from './lib/AuthProvider';
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

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
