import { NavLink, Outlet } from 'react-router';

const NAV = [
  {
    to: '/',
    label: 'Fil',
    // Radar
    icon: 'M12 12 19 5M12 3a9 9 0 1 0 9 9M12 7a5 5 0 1 0 5 5',
  },
  {
    to: '/suivi',
    label: 'Suivi',
    // Colonnes du Kanban
    icon: 'M4 5h4v14H4zM10 5h4v9h-4zM16 5h4v11h-4z',
  },
  {
    to: '/calendrier',
    label: 'Calendrier',
    icon: 'M5 6h14v14H5zM5 10h14M9 3v4M15 3v4',
  },
  {
    to: '/pays',
    label: 'Pays',
    // Globe
    icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  },
  {
    to: '/plus',
    label: 'Plus',
    icon: 'M5 7h14M5 12h14M5 17h14',
  },
] as const;

function linkClass({ isActive }: { isActive: boolean }): string {
  const base =
    'flex flex-1 flex-col items-center gap-1 px-2 py-2 text-xs font-medium md:flex-none md:flex-row md:gap-3 md:rounded-lg md:px-3 md:py-2.5 md:text-sm';
  return isActive
    ? `${base} text-accent-700 md:bg-accent-50 dark:text-accent-300 md:dark:bg-accent-900/40`
    : `${base} text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100`;
}

/** Cadre de l'application : barre d'onglets en bas sur mobile, barre latérale sur grand écran. */
export function Shell() {
  return (
    <div className="min-h-dvh md:flex md:items-start">
      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-10 flex border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:sticky md:top-0 md:h-dvh md:w-52 md:shrink-0 md:flex-col md:gap-1 md:border-t-0 md:border-r md:p-3 dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="hidden items-center gap-2 px-3 pt-2 pb-4 md:flex">
          <img src="/logo.svg" alt="" width={28} height={28} className="rounded-lg" />
          <span className="font-semibold">StageRadar</span>
        </div>
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className={linkClass}>
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-6 md:size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={item.icon} />
            </svg>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <main className="mx-auto w-full max-w-7xl min-w-0 px-4 pt-6 pb-24 md:px-8 md:pb-8">
        <Outlet />
      </main>
    </div>
  );
}
