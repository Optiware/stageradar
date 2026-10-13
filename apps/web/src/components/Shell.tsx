import { CalendarDays, Globe, Kanban, Menu, Radar } from 'lucide-react';
import { NavLink, Outlet } from 'react-router';

const NAV = [
  { to: '/', label: 'Fil', Icone: Radar },
  { to: '/suivi', label: 'Suivi', Icone: Kanban },
  { to: '/calendrier', label: 'Calendrier', Icone: CalendarDays },
  { to: '/pays', label: 'Pays', Icone: Globe },
  { to: '/plus', label: 'Plus', Icone: Menu },
] as const;

function linkClass({ isActive }: { isActive: boolean }): string {
  const base =
    'flex flex-1 flex-col items-center gap-1 px-2 py-2 text-xs font-bold transition md:flex-none md:flex-row md:gap-3 md:rounded-2xl md:px-4 md:py-2.5 md:text-sm';
  return isActive
    ? `${base} text-primary-700 md:bg-primary-50 dark:text-primary-400 md:dark:bg-primary-900/30`
    : `${base} text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white`;
}

/** Cadre de l'application : barre d'onglets en bas sur mobile, barre latérale sur grand écran. */
export function Shell() {
  return (
    <div className="min-h-dvh md:flex md:items-start">
      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-10 flex border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-md md:sticky md:top-0 md:h-dvh md:w-52 md:shrink-0 md:flex-col md:gap-1 md:border-t-0 md:border-r md:p-3 md:shadow-none dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="hidden items-center gap-2 px-3 pt-2 pb-4 md:flex">
          <img src="/logo.svg" alt="" width={28} height={28} className="rounded-xl" />
          <span className="font-extrabold tracking-tight">StageRadar</span>
        </div>
        {NAV.map(({ to, label, Icone }) => (
          <NavLink key={to} to={to} end={to === '/'} className={linkClass}>
            <Icone aria-hidden="true" className="size-6 md:size-5" strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>
      <main className="mx-auto w-full max-w-7xl min-w-0 px-4 pt-6 pb-24 md:px-8 md:pb-8">
        <Outlet />
      </main>
    </div>
  );
}
