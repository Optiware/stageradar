import { Globe, Kanban, Layers, Menu, Moon, Radar, Sun, Zap } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { NavLink, Outlet } from 'react-router';
import { choisirTheme, useTheme } from '../lib/theme';

/** Onglets dans l'ordre de la barre du bas du téléphone ; sur grand écran, rangés par groupe. */
const NAV = [
  { to: '/', label: 'Fil', Icone: Layers, groupe: 'Recherche' },
  { to: '/suivi', label: 'Suivi', Icone: Kanban, groupe: 'Candidatures' },
  { to: '/important', label: 'Important', Icone: Zap, groupe: 'Candidatures' },
  { to: '/pays', label: 'Pays', Icone: Globe, groupe: 'Recherche' },
  { to: '/plus', label: 'Plus', Icone: Menu, groupe: 'Autres' },
] as const;

const GROUPES = ['Recherche', 'Candidatures', 'Autres'] as const;

function linkClass({ isActive }: { isActive: boolean }): string {
  const base =
    'flex flex-1 flex-col items-center gap-1 px-1 py-1 text-[0.625rem] font-bold whitespace-nowrap transition md:flex-none md:flex-row md:gap-3 md:rounded-2xl md:px-3.5 md:py-3 md:text-sm';
  return isActive
    ? `${base} text-primary-700 md:bg-gray-950 md:text-white dark:text-primary-400 md:dark:bg-gray-50 md:dark:text-gray-950`
    : `${base} text-gray-600 hover:text-gray-950 md:hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-50 md:dark:hover:bg-gray-850`;
}

function Lien({ to, label, Icone }: (typeof NAV)[number]) {
  return (
    <NavLink to={to} end={to === '/'} className={linkClass}>
      {({ isActive }) => (
        <>
          {/* Sur téléphone, l'icône de l'onglet actif est posée dans une pastille cyan. */}
          <span
            className={`flex h-8 w-12 items-center justify-center rounded-xl md:h-auto md:w-auto ${
              isActive
                ? 'bg-primary-50 md:bg-transparent dark:bg-primary-400/15 md:dark:bg-transparent'
                : ''
            }`}
          >
            <Icone aria-hidden="true" className="size-[1.375rem] md:size-5" strokeWidth={1.75} />
          </span>
          {label}
        </>
      )}
    </NavLink>
  );
}

function Marque() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-[2.125rem] items-center justify-center rounded-xl bg-primary-600 text-white md:size-10 md:rounded-[0.875rem] dark:bg-primary-400 dark:text-primary-ink">
        <Radar aria-hidden="true" className="size-5 md:size-[1.375rem]" strokeWidth={1.75} />
      </span>
      <span className="text-[1.0625rem] font-extrabold tracking-tight md:text-[1.1875rem]">
        StageRadar
      </span>
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
          ? 'flex size-[2.625rem] items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300'
          : 'mt-auto flex items-center gap-3 rounded-2xl border border-gray-200 px-3.5 py-3 text-sm font-bold text-gray-600 transition hover:bg-gray-100 hover:text-gray-950 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-850 dark:hover:text-gray-50'
      }
    >
      <Icone aria-hidden="true" className="size-5" strokeWidth={1.75} />
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
 * Cadre de l'application. Sur téléphone : bandeau en haut, barre d'onglets en bas.
 * Sur grand écran : barre latérale de 256 px, onglets rangés par groupe.
 */
export function Shell() {
  const enLigne = useSyncExternalStore(ecouterReseau, () => navigator.onLine);
  return (
    <div className="min-h-dvh md:flex md:items-start">
      <header className="flex items-center justify-between px-[1.125rem] pt-3 pb-2 md:hidden">
        <Marque />
        <BoutonTheme compact />
      </header>

      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-10 flex justify-around rounded-t-[2rem] border-t border-gray-200 bg-white/[0.82] px-2 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] shadow-[0_-8px_32px_rgba(9,9,11,0.06)] backdrop-blur-[16px] md:hidden dark:border-gray-800 dark:bg-gray-900/[0.82] dark:shadow-[0_-8px_32px_rgba(0,0,0,0.5)]"
      >
        {NAV.map((lien) => (
          <Lien key={lien.to} {...lien} />
        ))}
      </nav>

      <nav
        aria-label="Navigation principale"
        className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col overflow-y-auto border-r border-gray-200 bg-white px-[1.125rem] pt-7 pb-[1.375rem] md:flex dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="mb-8 px-1.5">
          <Marque />
        </div>
        {GROUPES.map((groupe) => (
          <div key={groupe} className="mb-6">
            <p className="mb-2 px-3.5 text-[0.6875rem] font-extrabold tracking-[0.08em] text-gray-400 uppercase dark:text-gray-500">
              {groupe}
            </p>
            <div className="flex flex-col gap-1">
              {NAV.filter((lien) => lien.groupe === groupe).map((lien) => (
                <Lien key={lien.to} {...lien} />
              ))}
            </div>
          </div>
        ))}
        <BoutonTheme />
      </nav>

      <main className="mx-auto w-full max-w-7xl min-w-0 px-[1.125rem] pt-2 pb-30 md:px-12 md:pt-10 md:pb-10">
        {!enLigne && (
          <p
            role="status"
            className="mb-4 rounded-2xl bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
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
