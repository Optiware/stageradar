import { useState } from 'react';
import { ChangePassword } from '../components/ChangePassword';
import { useAuth } from '../lib/auth-context';
import { choisirTheme, themeEnregistre, type Theme } from '../lib/theme';

const SECTIONS = [
  { title: 'Sources', lot: 3, text: 'État des connecteurs et liens de recherche pré-remplis.' },
  { title: 'Entreprises cibles', lot: 1, text: 'Candidatures spontanées et watchlist.' },
  { title: 'Documents', lot: 6, text: 'CV et lettres, avec leurs versions.' },
  { title: 'Statistiques', lot: 6, text: 'Candidatures par semaine, taux de réponse, entonnoir.' },
  { title: 'Réglages', lot: 2, text: 'Profil, mots-clés, poids du score, notifications.' },
];

const THEMES: { id: Theme; libelle: string }[] = [
  { id: 'clair', libelle: 'Clair' },
  { id: 'sombre', libelle: 'Sombre' },
];

const CARTE =
  'rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900';

export function More() {
  const { session, signOut } = useAuth();
  const [theme, setTheme] = useState<Theme>(themeEnregistre);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold">Plus</h1>
      <ul className="mt-6 grid gap-3 md:grid-cols-2">
        {SECTIONS.map((section) => (
          <li key={section.title} className={CARTE}>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-medium">{section.title}</h2>
              <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                lot {section.lot}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{section.text}</p>
          </li>
        ))}
      </ul>

      <section className={`mt-8 ${CARTE}`}>
        <h2 className="font-medium">Apparence</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Le choix est enregistré sur cet appareil.
        </p>
        <div role="group" aria-label="Thème" className="mt-3 flex gap-2 text-sm font-medium">
          {THEMES.map(({ id, libelle }) => (
            <button
              key={id}
              type="button"
              aria-pressed={theme === id}
              onClick={() => {
                choisirTheme(id);
                setTheme(id);
              }}
              className={`rounded-full border px-4 py-2 ${
                theme === id
                  ? 'border-accent-700 bg-accent-50 text-accent-900 dark:bg-accent-900/40 dark:text-accent-100'
                  : 'border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
              }`}
            >
              {libelle}
            </button>
          ))}
        </div>
      </section>

      <section className={`mt-4 ${CARTE}`}>
        <h2 className="font-medium">Compte</h2>
        <p className="mt-1 text-sm break-all text-slate-600 dark:text-slate-300">
          {session?.user.email}
        </p>
        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-4 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          Se déconnecter
        </button>
        <ChangePassword />
      </section>
    </div>
  );
}
