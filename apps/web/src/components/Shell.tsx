import { jourIso, relanceDue } from '@stageradar/shared';
import {
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Globe,
  SquareKanban,
  Menu,
  MessageSquare,
  Moon,
  Sun,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { useNonLus } from '../lib/messages';
import { entretienDe, useCandidatures } from '../lib/suivi';
import { choisirTheme, useTheme } from '../lib/theme';

interface Onglet {
  to: string;
  label: string;
  /** Libellé plus court, sous l'icône de la barre du bas. */
  court?: string;
  Icone: LucideIcon;
  /** Affiché dans la barre du bas du téléphone. */
  mobile: boolean;
  /** Affiché dans le bandeau du grand écran. */
  bureau: boolean;
  /** Reçoit la pastille orange du nombre de réponses non lues. */
  compteur?: boolean;
}

const NAV: Onglet[] = [
  { to: '/', label: 'Offres', Icone: BriefcaseBusiness, mobile: true, bureau: true },
  { to: '/suivi', label: 'Suivi', Icone: SquareKanban, mobile: true, bureau: true },
  {
    to: '/messages',
    label: 'Messages',
    Icone: MessageSquare,
    mobile: true,
    bureau: true,
    compteur: true,
  },
  {
    to: '/calendrier',
    label: 'Calendrier',
    court: 'Agenda',
    Icone: CalendarDays,
    mobile: true,
    bureau: true,
  },
  { to: '/pays', label: 'Pays', Icone: Globe, mobile: false, bureau: true },
  { to: '/demarchage', label: 'Contacts', Icone: Users, mobile: false, bureau: true },
  // « Important », d'avant la maquette, s'ouvre par la cloche du bandeau et depuis « Plus ».
  { to: '/plus', label: 'Plus', Icone: Menu, mobile: true, bureau: true },
];

/** Relances à faire et entretiens du jour : allument le point orange de la cloche. */
function useActionsDuJour(): number {
  const candidatures = useCandidatures();
  const toutes = candidatures.data ?? [];
  const aujourdhui = jourIso(new Date(candidatures.dataUpdatedAt || 0));
  const relances = toutes.filter((candidature) => relanceDue(candidature, aujourdhui)).length;
  const entretiens = toutes.filter((candidature) =>
    entretienDe(candidature)?.date.startsWith(aujourdhui),
  ).length;
  return relances + entretiens;
}

function Pastille({ nombre, className = '' }: { nombre: number; className?: string }) {
  if (nombre === 0) return null;
  return (
    <span
      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-xs font-bold text-gray-950 ${className}`}
    >
      {nombre}
      <span className="sr-only"> non lus</span>
    </span>
  );
}

function Marque() {
  return (
    <Link to="/" className="flex items-center gap-2.5 text-gray-950 dark:text-gray-50">
      <span className="flex size-8 items-center justify-center rounded-[0.5625rem] bg-primary-600 md:size-9 md:rounded-[0.625rem]">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
          className="size-5 md:size-[1.375rem]"
        >
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="4" />
          <path d="M12 12 L18 6" />
        </svg>
      </span>
      <span className="font-display text-lg font-extrabold tracking-[-0.01em] md:text-xl">
        StageRadar
      </span>
    </Link>
  );
}

/** Bascule entre thème clair et thème sombre ; le choix est gardé sur l'appareil. */
function BoutonTheme() {
  const versSombre = useTheme() === 'clair';
  const Icone = versSombre ? Moon : Sun;
  return (
    <button
      type="button"
      onClick={() => choisirTheme(versSombre ? 'sombre' : 'clair')}
      aria-label={versSombre ? 'Mode sombre' : 'Mode clair'}
      className="flex size-11 items-center justify-center rounded-full bg-gray-100 text-gray-950 transition hover:bg-gray-200 dark:bg-gray-850 dark:text-gray-50 dark:hover:bg-gray-800"
    >
      <Icone aria-hidden="true" className="size-5" strokeWidth={1.8} />
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
 * Cadre de l'application, d'après la maquette du 11 novembre 2026. Sur grand écran : bandeau blanc
 * avec la navigation en pilules. Sur téléphone : bandeau réduit en haut, barre d'onglets en bas.
 */
export function Shell() {
  const enLigne = useSyncExternalStore(ecouterReseau, () => navigator.onLine);
  const actions = useActionsDuJour();
  const nonLus = useNonLus();
  // Sur téléphone, une conversation ouverte occupe tout l'écran, sans bandeau ni onglets.
  const { pathname, search } = useLocation();
  const pleinEcran = pathname === '/messages' && new URLSearchParams(search).has('c');

  return (
    <div className="min-h-dvh">
      <header
        className={`sticky top-0 z-20 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 ${
          pleinEcran ? 'max-md:hidden' : ''
        }`}
      >
        <div className="mx-auto flex min-h-16 max-w-[80rem] items-center gap-x-8 gap-y-3 px-4 py-2.5 md:min-h-[4.5rem] md:px-8">
          <Marque />
          <nav
            aria-label="Navigation principale"
            className="hidden min-w-0 flex-1 flex-wrap gap-1 md:flex"
          >
            {NAV.filter((onglet) => onglet.bureau).map(({ to, label, Icone, compteur }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex min-h-11 items-center gap-2 rounded-full px-3.5 whitespace-nowrap transition ${
                    isActive
                      ? 'bg-primary-50 font-semibold text-primary-700 dark:bg-primary-400/15 dark:text-primary-300'
                      : 'font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-950 dark:text-gray-400 dark:hover:bg-gray-850 dark:hover:text-gray-50'
                  }`
                }
              >
                <Icone aria-hidden="true" className="size-[1.125rem]" strokeWidth={1.8} />
                {label}
                {compteur && <Pastille nombre={nonLus} />}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/important"
              aria-label={actions > 0 ? `Notifications : ${actions} à faire` : 'Notifications'}
              className="relative flex size-11 items-center justify-center rounded-full bg-gray-100 text-gray-950 transition hover:bg-gray-200 dark:bg-gray-850 dark:text-gray-50 dark:hover:bg-gray-800"
            >
              <Bell aria-hidden="true" className="size-5" strokeWidth={1.8} />
              {actions > 0 && (
                <span className="absolute top-[0.5625rem] right-2.5 size-[0.5625rem] rounded-full border-2 border-gray-100 bg-orange-500 dark:border-gray-850" />
              )}
            </Link>
            <BoutonTheme />
            <Link
              to="/reglages"
              aria-label="Réglages et profil"
              className="flex size-11 items-center justify-center rounded-full bg-gray-950 text-white transition hover:bg-gray-700 dark:bg-gray-50 dark:text-gray-950 dark:hover:bg-gray-200"
            >
              <UserRound aria-hidden="true" className="size-5" strokeWidth={1.8} />
            </Link>
          </div>
        </div>
      </header>

      <nav
        aria-label="Navigation principale"
        className={`fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden dark:border-gray-800 dark:bg-gray-900 ${
          pleinEcran ? 'hidden' : ''
        }`}
      >
        {NAV.filter((onglet) => onglet.mobile).map(({ to, label, court, Icone, compteur }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `relative flex h-[4.5rem] flex-col items-center justify-center gap-0.5 text-[0.71875rem] ${
                isActive
                  ? 'font-bold text-primary-700 dark:text-primary-300'
                  : 'font-medium text-gray-700 dark:text-gray-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex h-[1.875rem] w-[3.25rem] items-center justify-center rounded-full ${
                    isActive ? 'bg-primary-50 dark:bg-primary-400/15' : ''
                  }`}
                >
                  <Icone aria-hidden="true" className="size-5" strokeWidth={1.8} />
                </span>
                {court ?? label}
                {compteur && (
                  <Pastille
                    nombre={nonLus}
                    className="absolute top-2.5 left-[calc(50%+0.25rem)] h-[1.125rem] min-w-[1.125rem] text-[0.6875rem]"
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <main
        className={`mx-auto w-full max-w-[80rem] min-w-0 px-4 pt-5 md:px-8 md:pt-10 md:pb-24 ${
          pleinEcran ? 'pb-0' : 'pb-28'
        }`}
      >
        {!enLigne && (
          <p
            role="status"
            className="mb-4 rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-200"
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
