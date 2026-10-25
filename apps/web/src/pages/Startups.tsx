import { normalizeText } from '@stageradar/shared';
import { ExternalLink, Mail } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Flag } from '../components/Flag';
import { useEnregistrerEntreprise, useEntreprises } from '../lib/entreprises';
import { nomPays } from '../lib/offres';
import {
  LIBELLES_ACCES,
  LIBELLES_LANGUE_TRAVAIL,
  rechercheLinkedinEntreprise,
  rechercheLinkedinPersonne,
  rechercheRecruteurs,
  STARTUPS,
  VERIFICATION_STARTUPS,
  type AccesStage,
  type FicheStartup,
} from '../lib/startups';
import { BADGE, BOUTON_ACCENT, CARTE, CHAMP, pilule, SECONDAIRE } from '../lib/ui';

const LIEN = 'font-bold text-primary-700 underline underline-offset-2 dark:text-primary-400';
const TITRE_BLOC = 'text-xs font-bold tracking-wide text-gray-500 uppercase dark:text-gray-400';

const COULEUR_ACCES: Record<AccesStage, string> = {
  programme: BADGE.accent,
  offre: BADGE.bleu,
  spontanee: BADGE.neutre,
};

function Externe({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 ${LIEN}`}
    >
      {children}
      <ExternalLink aria-hidden="true" className="size-3.5 opacity-70" />
    </a>
  );
}

/** Ce que la fiche apporte au démarchage : site, page carrière, premier contact, notes. */
function versEntreprise(fiche: FicheStartup) {
  const fondateur = fiche.fondateurs[0];
  return {
    nom: fiche.nom,
    pays: fiche.pays,
    ville: fiche.ville,
    site: fiche.site,
    contact_nom: fondateur ? `${fondateur.nom} (${fondateur.role})` : null,
    contact_email: fiche.email ?? null,
    contact_linkedin: fiche.linkedin ?? null,
    notes: `${fiche.pourquoi}\n${LIBELLES_LANGUE_TRAVAIL[fiche.langue]}. Fiche vérifiée le ${VERIFICATION_STARTUPS}.`,
    url_carriere: fiche.carriere,
    ats: null,
    slug: null,
  };
}

function CarteStartup({ fiche, suivie }: { fiche: FicheStartup; suivie: boolean }) {
  const enregistrer = useEnregistrerEntreprise();
  return (
    <article aria-label={fiche.nom} className={CARTE}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-extrabold">{fiche.nom}</h2>
          <p className={`flex items-center gap-1.5 text-sm ${SECONDAIRE}`}>
            <Flag code={fiche.pays} />
            {fiche.ville}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className={COULEUR_ACCES[fiche.acces]}>{LIBELLES_ACCES[fiche.acces]}</span>
          <span className={fiche.langue === 'local' ? BADGE.ambre : BADGE.neutre}>
            {LIBELLES_LANGUE_TRAVAIL[fiche.langue]}
          </span>
        </div>
      </div>

      <p className="mt-3 text-sm">{fiche.activite}</p>
      <p className="mt-2 text-sm">{fiche.pourquoi}</p>

      <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <p className={TITRE_BLOC}>Postuler</p>
          <ul className="mt-1.5 space-y-1">
            <li>
              <Externe href={fiche.carriere}>Page carrière</Externe>
            </li>
            {fiche.offres.map((offre) => (
              <li key={offre.url}>
                <Externe href={offre.url}>{offre.libelle}</Externe>
              </li>
            ))}
            <li>
              <Externe href={fiche.site}>Site de l’entreprise</Externe>
            </li>
            <li>
              {fiche.email ? (
                <a
                  href={`mailto:${fiche.email}`}
                  className={`inline-flex items-center gap-1 ${LIEN}`}
                >
                  <Mail aria-hidden="true" className="size-3.5" />
                  {fiche.email}
                </a>
              ) : (
                <span className={SECONDAIRE}>
                  Pas d’e-mail public : passe par la page carrière.
                </span>
              )}
            </li>
          </ul>
        </div>

        <div>
          <p className={TITRE_BLOC}>Personnes</p>
          <ul className="mt-1.5 space-y-1.5">
            {fiche.fondateurs.map((personne) => (
              <li key={personne.nom}>
                <span className="font-bold">{personne.nom}</span>
                <span className={SECONDAIRE}> · {personne.role}</span>
                <br />
                <Externe href={rechercheLinkedinPersonne(personne.nom, fiche.nom)}>
                  Chercher sur LinkedIn
                </Externe>
              </li>
            ))}
            <li>
              <Externe href={rechercheRecruteurs(fiche.nom)}>Recruteurs sur LinkedIn</Externe>
            </li>
          </ul>
        </div>

        <div className="sm:col-span-2">
          <p className={TITRE_BLOC}>Réseaux</p>
          <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
            {fiche.linkedin ? (
              <Externe href={fiche.linkedin}>LinkedIn</Externe>
            ) : (
              <Externe href={rechercheLinkedinEntreprise(fiche.nom)}>Chercher sur LinkedIn</Externe>
            )}
            {fiche.reseaux.map((reseau) => (
              <Externe key={reseau.url} href={reseau.url}>
                {reseau.libelle}
              </Externe>
            ))}
          </p>
        </div>
      </div>

      <details className="mt-4 text-sm">
        <summary className={`cursor-pointer font-bold ${SECONDAIRE}`}>
          Sources (lues le {VERIFICATION_STARTUPS})
        </summary>
        <ul className="mt-1.5 list-disc space-y-1 pl-5">
          {fiche.sources.map((source) => (
            <li key={source.url}>
              <Externe href={source.url}>{source.libelle}</Externe>
            </li>
          ))}
        </ul>
      </details>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {suivie ? (
          <Link to="/demarchage" className={`text-sm ${LIEN}`}>
            Déjà dans le démarchage
          </Link>
        ) : (
          <button
            type="button"
            disabled={enregistrer.isPending}
            onClick={() => enregistrer.mutate({ champs: versEntreprise(fiche) })}
            className={BOUTON_ACCENT}
          >
            Ajouter au démarchage
          </button>
        )}
        {enregistrer.isError && (
          <p role="alert" className="text-sm font-bold text-red-700 dark:text-red-400">
            L’entreprise n’a pas pu être ajoutée. Vérifie ta connexion.
          </p>
        )}
      </div>
    </article>
  );
}

const FILTRES_PAYS = [null, 'JP', 'KR'] as const;
const FILTRES_ACCES = [null, 'programme', 'offre', 'spontanee'] as const;

/**
 * Startups du Japon et de la Corée qui peuvent prendre un stagiaire étranger en informatique,
 * avec tout ce qu'il faut pour les contacter. Une fiche s'ajoute au démarchage en un clic.
 */
export function Startups() {
  const entreprises = useEntreprises();
  const [pays, setPays] = useState<(typeof FILTRES_PAYS)[number]>(null);
  const [acces, setAcces] = useState<(typeof FILTRES_ACCES)[number]>(null);
  const [recherche, setRecherche] = useState('');

  const suivies = new Set(
    (entreprises.data ?? []).map((entreprise) => normalizeText(entreprise.nom)),
  );
  const terme = normalizeText(recherche);
  const fiches = STARTUPS.filter(
    (fiche) =>
      (!pays || fiche.pays === pays) &&
      (!acces || fiche.acces === acces) &&
      (!terme || normalizeText(`${fiche.nom} ${fiche.activite} ${fiche.ville}`).includes(terme)),
  );

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-extrabold tracking-tight">Startups Japon et Corée</h1>
      <p className={`mt-1 max-w-3xl ${SECONDAIRE}`}>
        Entreprises tech qui accueillent des stagiaires étrangers ou recrutent des ingénieurs sans
        exiger le japonais ou le coréen. Chaque fiche a été vérifiée le {VERIFICATION_STARTUPS} et
        cite ses sources. Les e-mails sont ceux que l’entreprise publie ; pour une personne, le lien
        ouvre une recherche LinkedIn, aucun profil n’est deviné.
      </p>

      <div className="mt-5 space-y-3">
        <div role="group" aria-label="Pays" className="flex flex-wrap gap-2">
          {FILTRES_PAYS.map((code) => (
            <button
              key={code ?? 'tous'}
              type="button"
              aria-pressed={pays === code}
              onClick={() => setPays(code)}
              className={`inline-flex items-center gap-2 ${pilule(pays === code)}`}
            >
              {code && <Flag code={code} />}
              {code ? nomPays(code) : 'Tous'}
            </button>
          ))}
        </div>
        <div role="group" aria-label="Accès au stage" className="flex flex-wrap gap-2">
          {FILTRES_ACCES.map((code) => (
            <button
              key={code ?? 'tous'}
              type="button"
              aria-pressed={acces === code}
              onClick={() => setAcces(code)}
              className={pilule(acces === code)}
            >
              {code ? LIBELLES_ACCES[code] : 'Tous les accès'}
            </button>
          ))}
        </div>
        <label className="block max-w-md text-sm font-bold">
          Chercher
          <input
            type="search"
            value={recherche}
            placeholder="robotique, IA, Tokyo…"
            onChange={(evenement) => setRecherche(evenement.target.value)}
            className={CHAMP}
          />
        </label>
      </div>

      <p className={`mt-4 text-sm ${SECONDAIRE}`} role="status">
        {fiches.length} startup{fiches.length > 1 ? 's' : ''}
      </p>
      <div className="mt-2 grid gap-4 lg:grid-cols-2">
        {fiches.map((fiche) => (
          <CarteStartup
            key={fiche.id}
            fiche={fiche}
            suivie={suivies.has(normalizeText(fiche.nom))}
          />
        ))}
      </div>
    </div>
  );
}
