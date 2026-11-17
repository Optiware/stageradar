import { jourIso, relanceDue } from '@stageradar/shared';
import {
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  MessageSquare,
  RotateCcw,
  Send,
  type LucideIcon,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { useConversations } from '../lib/messages';
import { RECHERCHES_STAGE, SITES_ALTERNANCE, type LienRecherche } from '../lib/liens-recherche';
import { entretienDe, libelleEntretien, libelleRelance, useCandidatures } from '../lib/suivi';
import { CARTE } from '../lib/ui';

/** Nombre de lignes montrées dans « À faire aujourd'hui » ; la suite est sur l'écran Important. */
const LIGNES_MAX = 4;

interface Action {
  cle: string;
  vers: string;
  titre: string;
  detail: string;
  Icone: LucideIcon;
  teinte: string;
}

function AFaire() {
  const candidatures = useCandidatures();
  const conversations = useConversations();
  const toutes = candidatures.data ?? [];
  const maintenant = new Date(candidatures.dataUpdatedAt || 0);
  const aujourdhui = jourIso(maintenant);

  const actions: Action[] = [
    ...(conversations.data ?? [])
      .filter((conversation) => conversation.non_lu)
      .map((conversation) => ({
        cle: `m-${conversation.id}`,
        vers: `/messages?c=${conversation.id}`,
        titre: `Répondre à ${conversation.contact_nom}`,
        detail: [conversation.entreprise, 'réponse non lue'].filter(Boolean).join(' · '),
        Icone: MessageSquare,
        teinte: 'bg-orange-50 text-orange-700 dark:bg-orange-500/20 dark:text-orange-100',
      })),
    ...toutes.flatMap((candidature) => {
      const entretien = entretienDe(candidature);
      if (!entretien || new Date(entretien.date) < maintenant) return [];
      return [
        {
          cle: `e-${entretien.id}`,
          vers: `/suivi?candidature=${candidature.id}`,
          titre: `Entretien · ${candidature.resume.entreprise ?? candidature.resume.titre}`,
          detail: libelleEntretien(entretien.date, maintenant),
          Icone: CalendarDays,
          teinte: 'bg-orange-50 text-orange-700 dark:bg-orange-500/20 dark:text-orange-100',
        },
      ];
    }),
    ...toutes
      .filter((candidature) => relanceDue(candidature, aujourdhui))
      .map((candidature) => ({
        cle: `r-${candidature.id}`,
        vers: `/suivi?candidature=${candidature.id}`,
        titre: `Relancer ${candidature.resume.entreprise ?? candidature.resume.titre}`,
        detail: libelleRelance(candidature.prochaine_relance!, aujourdhui),
        Icone: RotateCcw,
        teinte: 'bg-primary-50 text-primary-700 dark:bg-primary-400/15 dark:text-primary-300',
      })),
    ...toutes
      .filter((candidature) => candidature.statut === 'a_postuler')
      .map((candidature) => ({
        cle: `p-${candidature.id}`,
        vers: `/suivi?candidature=${candidature.id}`,
        titre: `Postuler chez ${candidature.resume.entreprise ?? candidature.resume.titre}`,
        detail: candidature.resume.titre,
        Icone: Send,
        teinte: 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200',
      })),
  ];

  return (
    <section aria-labelledby="titre-a-faire" className={`flex flex-col gap-1.5 ${CARTE}`}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 id="titre-a-faire" className="text-lg font-bold">
          À faire aujourd’hui
        </h2>
        {actions.length > LIGNES_MAX && (
          <Link
            to="/important"
            className="text-sm font-medium text-primary-600 dark:text-primary-300"
          >
            Tout voir ({actions.length})
          </Link>
        )}
      </div>
      {candidatures.isPending && (
        <p className="text-sm text-gray-600 dark:text-gray-400">Chargement…</p>
      )}
      {candidatures.isSuccess && actions.length === 0 && (
        <p className="text-sm text-gray-600 dark:text-gray-400">Rien à faire pour l’instant.</p>
      )}
      {actions.slice(0, LIGNES_MAX).map(({ cle, vers, titre, detail, Icone, teinte }) => (
        <Link
          key={cle}
          to={vers}
          className="-mx-2.5 flex items-center gap-3 rounded-xl p-2.5 transition hover:bg-gray-100 dark:hover:bg-gray-850"
        >
          <span
            className={`flex size-10 shrink-0 items-center justify-center rounded-full ${teinte}`}
          >
            <Icone aria-hidden="true" className="size-[1.125rem]" strokeWidth={1.8} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <strong className="truncate font-semibold">{titre}</strong>
            <span className="truncate text-sm text-gray-600 dark:text-gray-400">{detail}</span>
          </span>
          <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-gray-600" />
        </Link>
      ))}
    </section>
  );
}

function ImporterAnnonce() {
  const [adresse, setAdresse] = useState('');
  const naviguer = useNavigate();

  function envoyer(evenement: FormEvent) {
    evenement.preventDefault();
    void naviguer(`/importer?url=${encodeURIComponent(adresse.trim())}`);
  }

  return (
    <section aria-labelledby="titre-importer" className={`flex flex-col gap-3 ${CARTE}`}>
      <h2 id="titre-importer" className="text-lg font-bold">
        Importer une annonce
      </h2>
      <form onSubmit={envoyer} className="flex flex-col gap-3">
        <label htmlFor="import-url" className="text-sm text-gray-700 dark:text-gray-300">
          Colle l’adresse d’une annonce vue ailleurs.
        </label>
        <div className="flex gap-2">
          <input
            id="import-url"
            type="url"
            required
            value={adresse}
            onChange={(evenement) => setAdresse(evenement.target.value)}
            placeholder="https://"
            className="h-11 min-w-0 flex-1 rounded-[0.625rem] border border-gray-300 bg-white px-3 text-[0.9375rem] dark:border-gray-800 dark:bg-gray-950"
          />
          <button
            type="submit"
            className="min-h-11 rounded-[0.625rem] bg-gray-950 px-4 font-semibold text-white transition hover:bg-gray-700 dark:bg-gray-50 dark:text-gray-950 dark:hover:bg-gray-200"
          >
            Importer
          </button>
        </div>
      </form>
    </section>
  );
}

function ChercherAussi({ alternance, pays }: { alternance: boolean; pays: string[] }) {
  const liens: LienRecherche[] = alternance
    ? SITES_ALTERNANCE.flatMap(({ site, recherches }) =>
        recherches.map(({ libelle, url }) => ({ libelle: `${site} : ${libelle}`, url })),
      )
    : Object.entries(RECHERCHES_STAGE)
        .filter(([code]) => pays.length === 0 || pays.includes(code))
        .flatMap(([, recherches]) => recherches);
  if (liens.length === 0) return null;

  return (
    <section aria-labelledby="titre-chercher" className={`flex flex-col gap-2.5 ${CARTE}`}>
      <h2 id="titre-chercher" className="text-lg font-bold">
        Chercher aussi sur
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Recherches pré-remplies. Ces sites ne sont pas lus automatiquement.
      </p>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,8.5rem),1fr))] gap-2">
        {liens.map(({ libelle, url }) => (
          <li key={url}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center justify-between gap-2 rounded-[0.625rem] bg-gray-100 px-3 text-sm font-medium text-gray-950 transition hover:bg-primary-50 hover:text-primary-700 dark:bg-gray-850 dark:text-gray-50 dark:hover:bg-primary-400/15"
            >
              {libelle}
              <ArrowUpRight aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={1.8} />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Colonne de droite du fil : actions du jour, import d'une annonce, recherches ailleurs. */
export function AsideFil({ alternance, pays }: { alternance: boolean; pays: string[] }) {
  return (
    <aside
      aria-label="Aujourd’hui et sources"
      className="flex min-w-0 flex-[1_1_18.75rem] flex-col gap-5"
    >
      <AFaire />
      <ImporterAnnonce />
      <ChercherAussi alternance={alternance} pays={pays} />
    </aside>
  );
}
