import type { Session } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { Navigate, Route, Routes } from 'react-router';
import { Shell } from './components/Shell';
import { StatusScreen } from './components/StatusScreen';
import { useAuth } from './lib/auth-context';
import { supabase } from './lib/supabase';
import { Login } from './pages/Login';
import { More } from './pages/More';
import { ComingSoon } from './pages/ComingSoon';

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
        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-4 rounded-lg bg-accent-700 px-4 py-2.5 font-medium text-white hover:bg-accent-600"
        >
          Se déconnecter
        </button>
      </StatusScreen>
    );
  }

  return (
    <Routes>
      <Route element={<Shell />}>
        <Route
          index
          element={
            <ComingSoon title="Fil" lot={2}>
              Les offres collectées, triées par score, avec les onglets Alternance, Stage été et
              Tout.
            </ComingSoon>
          }
        />
        <Route
          path="suivi"
          element={
            <ComingSoon title="Suivi" lot={2}>
              Le tableau Kanban de tes candidatures, de « À étudier » à « Offre ».
            </ComingSoon>
          }
        />
        <Route
          path="calendrier"
          element={
            <ComingSoon title="Calendrier" lot={5}>
              Dates limites, entretiens, relances et échéances administratives par pays.
            </ComingSoon>
          }
        />
        <Route
          path="pays"
          element={
            <ComingSoon title="Fiches pays" lot={3}>
              Visa, liens officiels et échéances pour le Japon, la Corée du Sud, la Colombie et le
              Canada.
            </ComingSoon>
          }
        />
        <Route path="plus" element={<More />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
