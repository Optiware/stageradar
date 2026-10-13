import { useState } from 'react';
import { ChangePassword } from '../components/ChangePassword';
import { useAuth } from '../lib/auth-context';
import { choisirTheme, themeEnregistre, type Theme } from '../lib/theme';
import { BADGE, BOUTON_SECONDAIRE, CARTE, pilule, SECONDAIRE } from '../lib/ui';

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

export function More() {
  const { session, signOut } = useAuth();
  const [theme, setTheme] = useState<Theme>(themeEnregistre);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-extrabold tracking-tight">Plus</h1>
      <ul className="mt-6 grid gap-3 md:grid-cols-2">
        {SECTIONS.map((section) => (
          <li key={section.title} className={CARTE}>
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-bold">{section.title}</h2>
              <span className={`shrink-0 ${BADGE.neutre}`}>lot {section.lot}</span>
            </div>
            <p className={`mt-1 text-sm ${SECONDAIRE}`}>{section.text}</p>
          </li>
        ))}
      </ul>

      <section className={`mt-8 ${CARTE}`}>
        <h2 className="font-bold">Apparence</h2>
        <p className={`mt-1 text-sm ${SECONDAIRE}`}>Le choix est enregistré sur cet appareil.</p>
        <div role="group" aria-label="Thème" className="mt-3 flex gap-2">
          {THEMES.map(({ id, libelle }) => (
            <button
              key={id}
              type="button"
              aria-pressed={theme === id}
              onClick={() => {
                choisirTheme(id);
                setTheme(id);
              }}
              className={pilule(theme === id)}
            >
              {libelle}
            </button>
          ))}
        </div>
      </section>

      <section className={`mt-4 ${CARTE}`}>
        <h2 className="font-bold">Compte</h2>
        <p className={`mt-1 text-sm break-all ${SECONDAIRE}`}>{session?.user.email}</p>
        <button
          type="button"
          onClick={() => void signOut()}
          className={`mt-4 ${BOUTON_SECONDAIRE}`}
        >
          Se déconnecter
        </button>
        <ChangePassword />
      </section>
    </div>
  );
}
