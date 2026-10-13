import type { Session } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { Navigate, Route, Routes } from 'react-router';
import { Shell } from './components/Shell';
import { StatusScreen } from './components/StatusScreen';
import { useAuth } from './lib/auth-context';
import { BOUTON_PRINCIPAL } from './lib/ui';
import { supabase } from './lib/supabase';
import { Logement } from './pages/Logement';
import { Login } from './pages/Login';
import { More } from './pages/More';
import { Feed } from './pages/Feed';
import { Calendrier } from './pages/Calendrier';
import { Demarchage } from './pages/Demarchage';
import { Documents } from './pages/Documents';
import { Donnees } from './pages/Donnees';
import { Statistiques } from './pages/Statistiques';
import { Important } from './pages/Important';
import { Importer } from './pages/Importer';
import { Pays } from './pages/Pays';
import { Reglages } from './pages/Reglages';
import { Sources } from './pages/Sources';
import { Suivi } from './pages/Suivi';

export function App() {
  const { session } = useAuth();

  if (!supabase) {
    return (
      <StatusScreen title="Configuration manquante">
        <p>
          Les variables <code>VITE_SUPABASE_URL</code> et <code>VITE_SUPABASE_KEY</code> ne sont pas
          définies. Copie <code>.env.example</code> en <code>.env</code> à la racine du dépôt,
          remplis-les, puis relance l'application.
        </p>
      </StatusScreen>
    );
  }
  if (session === undefined) return <StatusScreen title="Chargement…" />;
  if (session === null) return <Login />;
  return <OwnerGate session={session} />;
}

/** Vérifie côté serveur que le compte connecté est bien le propriétaire avant d'afficher l'app. */
function OwnerGate({ session }: { session: Session }) {
  const { signOut } = useAuth();
  const owner = useQuery({
    queryKey: ['is_owner', session.user.id],
    queryFn: async () => {
      const { data, error } = await supabase!.rpc('is_owner');
      if (error) throw error;
      return data === true;
    },
    staleTime: Infinity,
    retry: 1,
  });

  if (owner.isPending) return <StatusScreen title="Chargement…" />;

  // Seul un « non » explicite du serveur bloque l'accès. Sans réseau, l'app reste
  // consultable : les données restent de toute façon protégées par la RLS.
  if (owner.data === false) {
    return (
      <StatusScreen title="Compte non autorisé">
        <p>
          <strong>{session.user.email}</strong> n'est pas le compte propriétaire de cette
          application.
        </p>
        <button type="button" onClick={() => void signOut()} className={`mt-4 ${BOUTON_PRINCIPAL}`}>
          Se déconnecter
        </button>
      </StatusScreen>
    );
  }

  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Feed />} />
        <Route path="suivi" element={<Suivi />} />
        <Route path="important" element={<Important />} />
        <Route path="calendrier" element={<Calendrier />} />
        <Route path="statistiques" element={<Statistiques />} />
        <Route path="documents" element={<Documents />} />
        <Route path="donnees" element={<Donnees />} />
        <Route path="pays" element={<Pays />} />
        <Route path="demarchage" element={<Demarchage />} />
        <Route path="importer" element={<Importer />} />
        <Route path="logement" element={<Logement />} />
        <Route path="sources" element={<Sources />} />
        <Route path="reglages" element={<Reglages />} />
        <Route path="plus" element={<More />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
