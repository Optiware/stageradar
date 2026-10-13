import { Globe, Kanban, Layers, Menu, Moon, Radar, Sun, Zap } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { NavLink, Outlet } from 'react-router';
import { choisirTheme, useTheme } from '../lib/theme';

const NAV = [
  { to: '/', label: 'Fil', Icone: Layers },
  { to: '/suivi', label: 'Suivi', Icone: Kanban },
  { to: '/important', label: 'Important', Icone: Zap },
  { to: '/pays', label: 'Pays', Icone: Globe },
  { to: '/plus', label: 'Plus', Icone: Menu },
] as const;

function linkClass({ isActive }: { isActive: boolean }): string {
  const base =
    'flex flex-1 flex-col items-center gap-0.5 px-1 py-1 text-[0.6875rem] font-bold transition md:flex-none md:flex-row md:gap-3 md:rounded-2xl md:px-4 md:py-3 md:text-sm';
  return isActive
    ? `${base} text-primary-700 md:bg-primary-50 dark:text-primary-400 md:dark:bg-primary-900/20`
    : `${base} text-gray-500 hover:text-gray-900 md:hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-100 md:dark:hover:bg-gray-800`;
}

function Marque() {
  return (
    <div className="flex items-center gap-2">
      <span className="rounded-xl bg-primary-100 p-1.5 text-primary-600 md:p-2 dark:bg-primary-900/40 dark:text-primary-400">
        <Radar aria-hidden="true" className="size-5 md:size-6" />
      </span>
      <span className="text-lg font-extrabold tracking-tight md:text-xl">StageRadar</span>
    </div>
  );
}

/** Bascule entre thème clair et thème sombre ; le choix est gardé sur l'appareil. */
function BoutonTheme({ compact = false }: { compact?: boolean }) {
  const versSombre = useTheme() === 'clair';
  const Icone = versSombre ? Moon : Sun;
  const libelle = versSombre ? 'Mode sombre' : 'Mode clair';
  return (
    <button
      type="button"
      onClick={() => choisirTheme(versSombre ? 'sombre' : 'clair')}
      aria-label={compact ? libelle : undefined}
      className={
        compact
          ? 'rounded-full bg-gray-100 p-2 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
          : 'mt-auto hidden items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-500 transition hover:bg-gray-50 hover:text-gray-900 md:flex dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
      }
    >
      <Icone aria-hidden="true" className="size-5" />
      {!compact && libelle}
    </button>
  );
}

function ecouterReseau(prevenir: () => void): () => void {
  window.addEventListener('online', prevenir);
  window.addEventListener('offline', prevenir);
  return () => {
    window.removeEventListener('online', prevenir);
    window.removeEventListener('offline', prevenir);
  };
}

/**
 * Cadre de l'application. Sur téléphone : bandeau en haut, barre d'onglets flottante en bas.
 * Sur grand écran : barre latérale.
 */
export function Shell() {
  const enLigne = useSyncExternalStore(ecouterReseau, () => navigator.onLine);
  return (
    <div className="min-h-dvh md:flex md:items-start">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 md:hidden dark:border-gray-800 dark:bg-gray-900">
        <Marque />
        <BoutonTheme compact />
      </header>
      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-10 flex justify-around rounded-t-[2rem] border-t border-gray-200 bg-white/90 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] backdrop-blur-lg md:sticky md:top-0 md:h-dvh md:w-60 md:shrink-0 md:flex-col md:justify-start md:gap-2 md:rounded-none md:border-t-0 md:border-r md:bg-white md:p-5 md:shadow-none md:backdrop-blur-none dark:border-gray-800 dark:bg-gray-900/90 dark:shadow-[0_-10px_40px_rgba(0,0,0,0.5)] md:dark:bg-gray-900 md:dark:shadow-none"
      >
        <div className="mb-6 hidden md:block">
          <Marque />
        </div>
        {NAV.map(({ to, label, Icone }) => (
          <NavLink key={to} to={to} end={to === '/'} className={linkClass}>
            {({ isActive }) => (
              <>
                <span
                  className={`rounded-xl p-1 md:p-0 ${
                    isActive
                      ? 'bg-primary-50 md:bg-transparent dark:bg-primary-900/30 md:dark:bg-transparent'
                      : ''
                  }`}
                >
                  <Icone aria-hidden="true" className="size-6 md:size-5" strokeWidth={2} />
                </span>
                {label}
              </>
            )}
          </NavLink>
        ))}
        <BoutonTheme />
      </nav>
      <main className="mx-auto w-full max-w-7xl min-w-0 px-4 pt-6 pb-28 md:px-8 md:pb-8">
        {!enLigne && (
          <p
            role="status"
            className="mb-4 rounded-2xl bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          >
            Hors ligne : tu vois les dernières données gardées sur cet appareil. Les modifications
            attendront le retour du réseau.
          </p>
        )}
        <Outlet />
      </main>
    </div>
  );
}
