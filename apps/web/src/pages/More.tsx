import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { ChangePassword } from '../components/ChangePassword';
import { useAuth } from '../lib/auth-context';
import { choisirTheme, useTheme, type Theme } from '../lib/theme';
import { BADGE, BOUTON_SECONDAIRE, CARTE, CARTE_SURVOL, pilule, SECONDAIRE } from '../lib/ui';

// Écrans ouverts depuis « Plus ». Ceux qui ne sont pas encore réalisés annoncent leur lot.
const SECTIONS: { title: string; text: string; vers?: string; lot?: number }[] = [
  {
    title: 'Démarchage',
    vers: '/demarchage',
    text: 'Startups à contacter, personnes à joindre, messages prêts à envoyer.',
  },
  {
    title: 'Sources',
    vers: '/sources',
    text: 'État de la collecte et sites à consulter à la main.',
  },
  { title: 'Réglages', vers: '/reglages', text: 'Dates, pays, langues, poids du score, objectif.' },
  {
    title: 'Calendrier',
    vers: '/calendrier',
    text: 'Entretiens, relances, échéances par pays, export vers ton agenda.',
  },
  { title: 'Statistiques', vers: '/statistiques', text: 'Envois, réponses, ce qui fonctionne.' },
  { title: 'Documents', vers: '/documents', text: 'Versions de CV et de lettres envoyées.' },
  { title: 'Mes données', vers: '/donnees', text: 'Sauvegarde, export tableur, réimport.' },
];

const THEMES: { id: Theme; libelle: string }[] = [
  { id: 'clair', libelle: 'Clair' },
  { id: 'sombre', libelle: 'Sombre' },
];

export function More() {
  const { session, signOut } = useAuth();
  const theme = useTheme();

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-extrabold tracking-tight">Plus</h1>
      <ul className="mt-6 grid gap-3 md:grid-cols-2">
        {SECTIONS.map((section) =>
          section.vers ? (
            <li key={section.title}>
              <Link to={section.vers} className={`block h-full ${CARTE} ${CARTE_SURVOL}`}>
                <span className="flex items-start justify-between gap-3">
                  <span className="font-bold">{section.title}</span>
                  <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-gray-400" />
                </span>
                <span className={`mt-1 block text-sm ${SECONDAIRE}`}>{section.text}</span>
              </Link>
            </li>
          ) : (
            <li key={section.title} className={CARTE}>
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-bold">{section.title}</h2>
                <span className={`shrink-0 ${BADGE.neutre}`}>lot {section.lot}</span>
              </div>
              <p className={`mt-1 text-sm ${SECONDAIRE}`}>{section.text}</p>
            </li>
          ),
        )}
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
              onClick={() => choisirTheme(id)}
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
