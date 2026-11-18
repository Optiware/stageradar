import {
  ChartColumn,
  ChevronRight,
  Contact,
  Download,
  FileText,
  Files,
  FolderOpen,
  Globe,
  House,
  Radar,
  Rocket,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router';
import { ChangePassword } from '../components/ChangePassword';
import { useAuth } from '../lib/auth-context';
import { choisirTheme, useTheme, type Theme } from '../lib/theme';
import { BADGE, BOUTON_SECONDAIRE, CARTE, pilule, SECONDAIRE } from '../lib/ui';

const TEINTES = {
  bleu: 'bg-primary-50 text-primary-700 dark:bg-primary-400/15 dark:text-primary-300',
  violet: 'bg-[#efe5ff] text-[#5b2eb0] dark:bg-violet-500/20 dark:text-violet-300',
  gris: 'bg-[#f0f2f7] text-[#3b3f57] dark:bg-gray-850 dark:text-gray-300',
  corail: 'bg-[#ffede4] text-[#a33a10] dark:bg-orange-500/20 dark:text-orange-200',
  vert: 'bg-vert-50 text-vert-700 dark:bg-vert-500/20 dark:text-vert-50',
  ambre: 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200',
} as const;

interface Tuile {
  titre: string;
  texte: string;
  vers: string;
  Icone: LucideIcon;
  teinte: keyof typeof TEINTES;
  nouveau?: boolean;
}

// Écrans ouverts depuis « Plus », rangés comme sur la maquette du 18 novembre 2026. « Important »
// s'ouvre par la cloche du bandeau, le calendrier par l'onglet « Agenda ».
const SECTIONS: { titre: string; texte: string; tuiles: Tuile[] }[] = [
  {
    titre: 'Préparer',
    texte: 'Ce que tu envoies',
    tuiles: [
      {
        titre: 'Générateur de CV',
        texte: 'Un profil, 6 pays, adapté à une offre',
        vers: '/cv',
        Icone: FileText,
        teinte: 'bleu',
      },
      {
        titre: 'Portfolio',
        texte: 'Tes projets et ceux à faire',
        vers: '/portfolio',
        Icone: FolderOpen,
        teinte: 'violet',
        nouveau: true,
      },
      {
        titre: 'Documents',
        texte: 'CV et lettres envoyés',
        vers: '/documents',
        Icone: Files,
        teinte: 'gris',
      },
    ],
  },
  {
    titre: 'Trouver',
    texte: 'Où chercher',
    tuiles: [
      {
        titre: 'Startups Japon et Corée',
        texte: '37 fiches sourcées',
        vers: '/startups',
        Icone: Rocket,
        teinte: 'corail',
      },
      {
        titre: 'Communautés',
        texte: 'Rencontres et startups, sourcées',
        vers: '/communautes',
        Icone: Users,
        teinte: 'vert',
        nouveau: true,
      },
      {
        titre: 'Contacts',
        texte: 'Entreprises à démarcher',
        vers: '/demarchage',
        Icone: Contact,
        teinte: 'gris',
      },
      {
        titre: 'Sources',
        texte: 'État de la collecte',
        vers: '/sources',
        Icone: Radar,
        teinte: 'bleu',
      },
      {
        titre: 'Importer une offre',
        texte: 'Adresse, partage, saisie',
        vers: '/importer',
        Icone: Download,
        teinte: 'gris',
      },
    ],
  },
  {
    titre: 'Partir',
    texte: 'Avant le départ',
    tuiles: [
      {
        titre: 'Pays',
        texte: 'Visa, stage, sources',
        vers: '/pays',
        Icone: Globe,
        teinte: 'ambre',
      },
      {
        titre: 'Logement et budget',
        texte: 'Où chercher, coût du séjour',
        vers: '/logement',
        Icone: House,
        teinte: 'vert',
      },
    ],
  },
  {
    titre: 'Compte',
    texte: 'Tes réglages et tes données',
    tuiles: [
      {
        titre: 'Statistiques',
        texte: 'Envois, réponses, ce qui marche',
        vers: '/statistiques',
        Icone: ChartColumn,
        teinte: 'violet',
      },
      {
        titre: 'Réglages',
        texte: 'Dates, pays, poids du score',
        vers: '/reglages',
        Icone: Settings,
        teinte: 'gris',
      },
      {
        titre: 'Mes données',
        texte: 'Sauvegarde, export, réimport',
        vers: '/donnees',
        Icone: ShieldCheck,
        teinte: 'bleu',
      },
    ],
  },
];

const THEMES: { id: Theme; libelle: string }[] = [
  { id: 'clair', libelle: 'Clair' },
  { id: 'sombre', libelle: 'Sombre' },
];

export function More() {
  const { session, signOut } = useAuth();
  const theme = useTheme();

  return (
    <div className="flex flex-col gap-7">
      <h1 className="text-[1.75rem] font-extrabold tracking-[-0.02em] md:text-[2.125rem]">Plus</h1>
      {SECTIONS.map((section) => (
        <section
          key={section.titre}
          aria-labelledby={`plus-${section.titre}`}
          className="flex flex-col gap-3"
        >
          <h2
            id={`plus-${section.titre}`}
            className="flex items-baseline gap-2.5 text-[0.8125rem] font-bold tracking-[0.04em] text-gray-600 uppercase md:text-xl md:tracking-normal md:text-gray-950 md:normal-case dark:text-gray-400 md:dark:text-gray-50"
          >
            {section.titre}
            <span className={`hidden font-sans text-sm font-normal md:inline ${SECONDAIRE}`}>
              {section.texte}
            </span>
          </h2>
          <ul className="overflow-hidden rounded-2xl border border-gray-200 bg-white md:grid md:grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] md:gap-3 md:overflow-visible md:rounded-none md:border-0 md:bg-transparent dark:border-gray-800 dark:bg-gray-900 md:dark:bg-transparent">
            {section.tuiles.map(({ titre, texte, vers, Icone, teinte, nouveau }) => (
              <li
                key={vers}
                className="border-gray-100 not-last:border-b md:border-0 dark:border-gray-800"
              >
                <Link
                  to={vers}
                  className="flex min-h-[3.25rem] items-center gap-3 px-3.5 transition hover:bg-gray-50 md:h-full md:items-start md:gap-3.5 md:rounded-2xl md:border md:border-gray-200 md:bg-white md:p-[1.125rem] md:hover:border-primary-300 md:hover:bg-white dark:hover:bg-gray-850 md:dark:border-gray-800 md:dark:bg-gray-900 md:dark:hover:border-primary-400"
                >
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-[0.5625rem] md:size-11 md:rounded-xl ${TEINTES[teinte]}`}
                  >
                    <Icone
                      aria-hidden="true"
                      className="size-[1.125rem] md:size-[1.375rem]"
                      strokeWidth={1.8}
                    />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-center gap-2">
                      <strong className="font-medium md:text-base md:font-bold">{titre}</strong>
                      {nouveau && (
                        <span className={`${BADGE.orange} px-2 py-px text-xs`}>Nouveau</span>
                      )}
                    </span>
                    <span className={`hidden text-sm md:block ${SECONDAIRE}`}>{texte}</span>
                  </span>
                  <ChevronRight
                    aria-hidden="true"
                    className="size-4 shrink-0 text-gray-400 md:hidden"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <div className="grid items-start gap-4 md:grid-cols-2">
        <section className={CARTE}>
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

        <section className={CARTE}>
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
    </div>
  );
}
