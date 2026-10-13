import {
  aCompleter,
  changerStatut,
  composerMessage,
  jourIso,
  LIBELLES_STATUT,
  lienMessagerie,
  normalizeText,
  PAYS_STAGE,
  type LangueMessage,
  type TypeMessage,
} from '@stageradar/shared';
import { useMutation } from '@tanstack/react-query';
import { Copy, Mail, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Flag } from '../components/Flag';
import { appelerApi } from '../lib/api';
import {
  ENTREPRISE_VIDE,
  useEnregistrerEntreprise,
  useEntreprises,
  useSupprimerEntreprise,
  type ChampsEntreprise,
  type Entreprise,
  type SiteCarriere,
} from '../lib/entreprises';
import { useOffresDuFil } from '../lib/fil';
import { ANNUAIRES } from '../lib/methodes';
import { lienSur, lieu, nomPays } from '../lib/offres';
import { useEnregistrerReglages, useReglages } from '../lib/reglages';
import {
  useCandidatures,
  useEnregistrerCandidature,
  useSuivreEntreprise,
  valeursDe,
  type Candidature,
} from '../lib/suivi';
import {
  BADGE,
  BOUTON_DOUX,
  BOUTON_PRINCIPAL,
  BOUTON_SECONDAIRE,
  CARTE,
  CHAMP,
  SECONDAIRE,
} from '../lib/ui';

const LIEN = 'font-bold text-primary-700 underline underline-offset-2 dark:text-primary-400';
const LIBELLE = 'block text-sm font-bold';
const PAYS_PROPOSES: readonly string[] = [...PAYS_STAGE, 'FR'];

/** Saisie d'une entreprise : son nom suffit, le contact peut venir plus tard. */
function FormulaireEntreprise({
  entreprise,
  onFermer,
}: {
  entreprise?: Entreprise;
  onFermer: () => void;
}) {
  const [champs, setChamps] = useState<ChampsEntreprise>(entreprise ?? ENTREPRISE_VIDE);
  const enregistrer = useEnregistrerEntreprise();
  // Le serveur regarde si la page carrière repose sur un logiciel dont l'API est publique
  // (Greenhouse, Lever, Ashby) : si oui, les offres de l'entreprise rejoignent la collecte.
  const verifier = useMutation({
    mutationFn: () =>
      appelerApi<{ site: SiteCarriere | null }>('/sources/detecter', { url: champs.url_carriere }),
    onSuccess: ({ site }) =>
      setChamps((actuels) => ({
        ...actuels,
        ats: site?.ats ?? null,
        slug: site?.slug ?? null,
        url_carriere: site?.url_carriere ?? actuels.url_carriere,
      })),
  });
  const texte = (cle: keyof ChampsEntreprise) => ({
    value: champs[cle] ?? '',
    onChange: (evenement: { target: { value: string } }) =>
      setChamps({ ...champs, [cle]: evenement.target.value || (cle === 'nom' ? '' : null) }),
    className: CHAMP,
  });

  function soumettre(evenement: FormEvent) {
    evenement.preventDefault();
    if (!champs.nom.trim()) return;
    enregistrer.mutate({ id: entreprise?.id, champs }, { onSuccess: onFermer });
  }

  return (
    <form onSubmit={soumettre} className="mt-4 grid gap-4 sm:grid-cols-2">
      <label className={LIBELLE}>
        Nom de l'entreprise
        <input required {...texte('nom')} />
      </label>
      <label className={LIBELLE}>
        Pays
        <select {...texte('pays')}>
          <option value="">Autre ou inconnu</option>
          {PAYS_PROPOSES.map((code) => (
            <option key={code} value={code}>
              {nomPays(code)}
            </option>
          ))}
        </select>
      </label>
      <label className={LIBELLE}>
        Ville
        <input {...texte('ville')} />
      </label>
      <label className={LIBELLE}>
        Site web
        <input type="url" placeholder="https://" {...texte('site')} />
      </label>
      <label className={LIBELLE}>
        Personne à contacter
        <input placeholder="Prénom Nom" {...texte('contact_nom')} />
      </label>
      <label className={LIBELLE}>
        Son adresse e-mail
        <input type="email" {...texte('contact_email')} />
      </label>
      <div className="sm:col-span-2">
        <label className={LIBELLE}>
          Page carrière de l'entreprise
          <input
            type="url"
            placeholder="https://"
            value={champs.url_carriere ?? ''}
            onChange={(evenement) => {
              verifier.reset();
              // Une adresse modifiée n'est plus celle qui a été reconnue.
              setChamps({
                ...champs,
                url_carriere: evenement.target.value.trim() || null,
                ats: null,
                slug: null,
              });
            }}
            className={CHAMP}
          />
        </label>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!champs.url_carriere || verifier.isPending}
            onClick={() => verifier.mutate()}
            className={BOUTON_DOUX}
          >
            {verifier.isPending
              ? 'Vérification…'
              : 'Vérifier si ses offres peuvent être collectées'}
          </button>
          {champs.ats && champs.slug && !verifier.isSuccess && (
            <span className={BADGE.vert}>Offres collectées</span>
          )}
        </div>
        {verifier.isSuccess &&
          (verifier.data.site ? (
            <p
              role="status"
              className="mt-2 text-sm font-bold text-primary-700 dark:text-primary-400"
            >
              Site carrière reconnu : {verifier.data.site.annonces} annonces en ce moment, dont{' '}
              {verifier.data.site.stages} stages. Une fois l'entreprise enregistrée, ses offres
              seront lues à chaque collecte.
            </p>
          ) : (
            <p role="status" className={`mt-2 text-sm ${SECONDAIRE}`}>
              Cette page ne repose pas sur un site carrière lisible automatiquement. L'entreprise
              reste dans ta liste ; ses offres ne seront pas collectées.
            </p>
          ))}
        {verifier.isError && (
          <p role="alert" className="mt-2 text-sm font-bold text-red-700 dark:text-red-400">
            La vérification a échoué. Réessaie dans un instant.
          </p>
        )}
      </div>
      <label className={`${LIBELLE} sm:col-span-2`}>
        Son profil LinkedIn
        <input
          type="url"
          placeholder="https://www.linkedin.com/in/…"
          {...texte('contact_linkedin')}
        />
      </label>
      <label className={`${LIBELLE} sm:col-span-2`}>
        Notes
        <textarea
          rows={2}
          placeholder="Pourquoi cette entreprise, ce qu'elle construit, qui t'en a parlé…"
          {...texte('notes')}
        />
      </label>
      {enregistrer.isError && (
        <p role="alert" className="text-sm font-bold text-red-700 sm:col-span-2 dark:text-red-400">
          L'entreprise n'a pas pu être enregistrée. Vérifie ta connexion.
        </p>
      )}
      <div className="flex gap-3 sm:col-span-2">
        <button type="submit" disabled={enregistrer.isPending} className={BOUTON_PRINCIPAL}>
          {entreprise ? 'Enregistrer' : "Ajouter l'entreprise"}
        </button>
        <button type="button" onClick={onFermer} className={BOUTON_SECONDAIRE}>
          Annuler
        </button>
      </div>
    </form>
  );
}

/** Message à relire, compléter, puis envoyer soi-même : rien ne part de l'application. */
function Redaction({
  entreprise,
  candidature,
  presentation,
  debut,
  fin,
}: {
  entreprise: Entreprise;
  candidature: Candidature | undefined;
  presentation: string;
  debut: string;
  fin: string;
}) {
  const [langue, setLangue] = useState<LangueMessage>(entreprise.pays === 'FR' ? 'fr' : 'en');
  const dejaEcrit = candidature?.statut === 'postule' || candidature?.statut === 'relance';
  const [type, setType] = useState<TypeMessage>(dejaEcrit ? 'relance' : 'premier_contact');
  const modele = composerMessage({
    langue,
    type,
    entreprise: entreprise.nom,
    contact: entreprise.contact_nom,
    presentation,
    debut,
    fin,
  });
  // Le texte suit le modèle tant qu'il n'a pas été retouché à la main.
  const [retouche, setRetouche] = useState<{ modele: string; texte: string } | null>(null);
  const corps = retouche?.modele === modele.corps ? retouche.texte : modele.corps;
  const [copie, setCopie] = useState(false);
  const suivre = useSuivreEntreprise();
  const enregistrer = useEnregistrerCandidature();

  const messagerie = lienMessagerie(entreprise.contact_email, { objet: modele.objet, corps });
  const linkedin = entreprise.contact_linkedin ? lienSur(entreprise.contact_linkedin) : null;

  function marquerEnvoye() {
    const aujourdhui = jourIso(new Date());
    const vers = type === 'relance' ? 'relance' : 'postule';
    if (!candidature) {
      suivre.mutate({
        companyId: entreprise.id,
        etat: changerStatut(
          { statut: 'a_postuler', date_candidature: null, prochaine_relance: null },
          vers,
          aujourdhui,
        ),
      });
      return;
    }
    enregistrer.mutate({
      candidature,
      valeurs: { ...valeursDe(candidature), ...changerStatut(candidature, vers, aujourdhui) },
    });
  }

  return (
    <div className="mt-4 rounded-2xl bg-gray-50 p-4 dark:bg-gray-800/50">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={LIBELLE}>
          Langue du message
          <select
            value={langue}
            onChange={(evenement) => setLangue(evenement.target.value as LangueMessage)}
            className={CHAMP}
          >
            <option value="en">Anglais</option>
            <option value="fr">Français</option>
          </select>
        </label>
        <label className={LIBELLE}>
          Type de message
          <select
            value={type}
            onChange={(evenement) => setType(evenement.target.value as TypeMessage)}
            className={CHAMP}
          >
            <option value="premier_contact">Premier contact</option>
            <option value="relance">Relance</option>
          </select>
        </label>
      </div>
      <p className="mt-3 text-sm">
        <span className={SECONDAIRE}>Objet : </span>
        <span className="font-bold">{modele.objet}</span>
      </p>
      <label className={`mt-3 ${LIBELLE}`}>
        Message
        <textarea
          aria-label="Message"
          rows={12}
          value={corps}
          onChange={(evenement) =>
            setRetouche({ modele: modele.corps, texte: evenement.target.value })
          }
          className={CHAMP}
        />
      </label>
      {aCompleter(corps) && (
        <p className="mt-2 text-sm font-bold text-amber-700 dark:text-amber-400">
          Il reste des passages entre crochets à remplacer avant l'envoi.
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard
              .writeText(`${modele.objet}\n\n${corps}`)
              .then(() => setCopie(true));
          }}
          className={`flex items-center gap-2 ${BOUTON_DOUX}`}
        >
          <Copy aria-hidden="true" className="size-4" /> {copie ? 'Copié' : 'Copier'}
        </button>
        {messagerie && (
          <a href={messagerie} className={`flex items-center gap-2 ${BOUTON_DOUX}`}>
            <Mail aria-hidden="true" className="size-4" /> Ouvrir ma messagerie
          </a>
        )}
        {linkedin && (
          <a
            href={linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 ${BOUTON_DOUX}`}
          >
            Ouvrir son profil LinkedIn
          </a>
        )}
        <button
          type="button"
          disabled={suivre.isPending || enregistrer.isPending}
          onClick={marquerEnvoye}
          className={`${BOUTON_SECONDAIRE} bg-white dark:bg-gray-900`}
        >
          J'ai envoyé ce message
        </button>
      </div>
      {!messagerie && !linkedin && (
        <p className={`mt-2 text-xs ${SECONDAIRE}`}>
          Ajoute l'adresse e-mail ou le profil LinkedIn de la personne pour ouvrir le message
          directement.
        </p>
      )}
      {(suivre.isError || enregistrer.isError) && (
        <p role="alert" className="mt-2 text-sm font-bold text-red-700 dark:text-red-400">
          L'envoi n'a pas pu être noté dans le suivi. Vérifie ta connexion.
        </p>
      )}
    </div>
  );
}

function CarteEntreprise({
  entreprise,
  candidature,
  presentation,
  debut,
  fin,
}: {
  entreprise: Entreprise;
  candidature: Candidature | undefined;
  presentation: string;
  debut: string;
  fin: string;
}) {
  const [volet, setVolet] = useState<'message' | 'edition' | null>(null);
  const [suppression, setSuppression] = useState(false);
  const supprimer = useSupprimerEntreprise();
  const suivre = useSuivreEntreprise();
  const site = entreprise.site ? lienSur(entreprise.site) : null;

  return (
    <li>
      <article aria-label={entreprise.nom} className={CARTE}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold break-words">{entreprise.nom}</h3>
            {lieu(entreprise) && (
              <p className={`mt-1 flex items-center gap-1.5 text-sm ${SECONDAIRE}`}>
                <Flag code={entreprise.pays} />
                {lieu(entreprise)}
              </p>
            )}
          </div>
          {candidature ? (
            <Link to={`/suivi?candidature=${candidature.id}`} className={BADGE.vert}>
              Suivi : {LIBELLES_STATUT[candidature.statut]}
            </Link>
          ) : (
            <span className={BADGE.neutre}>Pas encore contactée</span>
          )}
        </div>
        {entreprise.ats && entreprise.slug && (
          <p className="mt-2">
            <span className={BADGE.bleu}>Offres collectées automatiquement</span>
          </p>
        )}

        <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm">
          {site && (
            <div className="contents">
              <dt className={SECONDAIRE}>Site</dt>
              <dd className="truncate">
                <a href={site} target="_blank" rel="noopener noreferrer" className={LIEN}>
                  {site.replace(/^https?:\/\//, '')}
                </a>
              </dd>
            </div>
          )}
          {(entreprise.contact_nom || entreprise.contact_email) && (
            <div className="contents">
              <dt className={SECONDAIRE}>Contact</dt>
              <dd className="break-words">
                {[entreprise.contact_nom, entreprise.contact_email].filter(Boolean).join(' · ')}
              </dd>
            </div>
          )}
          {entreprise.notes && (
            <div className="contents">
              <dt className={SECONDAIRE}>Notes</dt>
              <dd className="break-words whitespace-pre-line">{entreprise.notes}</dd>
            </div>
          )}
        </dl>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            aria-expanded={volet === 'message'}
            onClick={() => setVolet(volet === 'message' ? null : 'message')}
            className="rounded-2xl bg-primary-500 px-4 py-2.5 text-sm font-bold text-gray-950 transition hover:bg-primary-400"
          >
            Préparer un message
          </button>
          {!candidature && (
            <button
              type="button"
              disabled={suivre.isPending}
              onClick={() =>
                suivre.mutate({
                  companyId: entreprise.id,
                  etat: { statut: 'a_postuler', date_candidature: null, prochaine_relance: null },
                })
              }
              className={BOUTON_DOUX}
            >
              Ajouter au suivi
            </button>
          )}
          <button
            type="button"
            aria-expanded={volet === 'edition'}
            onClick={() => setVolet(volet === 'edition' ? null : 'edition')}
            className={`flex items-center gap-2 ${BOUTON_DOUX}`}
          >
            <Pencil aria-hidden="true" className="size-4" /> Modifier
          </button>
          {!candidature &&
            (suppression ? (
              <button
                type="button"
                disabled={supprimer.isPending}
                onClick={() => supprimer.mutate(entreprise.id)}
                className="rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"
              >
                Confirmer la suppression
              </button>
            ) : (
              <button
                type="button"
                aria-label={`Supprimer ${entreprise.nom}`}
                onClick={() => setSuppression(true)}
                className={`flex items-center ${BOUTON_DOUX}`}
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </button>
            ))}
        </div>
        {(supprimer.isError || suivre.isError) && (
          <p role="alert" className="mt-2 text-sm font-bold text-red-700 dark:text-red-400">
            L'action n'a pas pu être enregistrée. Vérifie ta connexion.
          </p>
        )}

        {volet === 'message' && (
          <Redaction
            entreprise={entreprise}
            candidature={candidature}
            presentation={presentation}
            debut={debut}
            fin={fin}
          />
        )}
        {volet === 'edition' && (
          <FormulaireEntreprise entreprise={entreprise} onFermer={() => setVolet(null)} />
        )}
      </article>
    </li>
  );
}

/** Texte de présentation, écrit une fois et repris dans tous les messages. */
function Presentation({ valeur }: { valeur: string }) {
  const [texte, setTexte] = useState(valeur);
  const enregistrer = useEnregistrerReglages();
  return (
    <section aria-label="Ma présentation" className={`mt-4 ${CARTE}`}>
      <h2 className="font-bold">Ma présentation</h2>
      <p className={`mt-1 text-sm ${SECONDAIRE}`}>
        Deux ou trois phrases, dans la langue de tes messages (l'anglais pour le Japon, la Corée et
        Londres) : ta formation, ton année, ce que tu sais construire. Elles ouvrent chaque message.
      </p>
      <label className="sr-only" htmlFor="presentation">
        Ma présentation
      </label>
      <textarea
        id="presentation"
        rows={3}
        value={texte}
        onChange={(evenement) => setTexte(evenement.target.value)}
        className={CHAMP}
      />
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled={enregistrer.isPending || texte === valeur}
          onClick={() => enregistrer.mutate({ presentation: texte })}
          className={BOUTON_SECONDAIRE}
        >
          Enregistrer la présentation
        </button>
        {enregistrer.isSuccess && texte === valeur && (
          <span role="status" className="text-sm font-bold text-primary-700 dark:text-primary-400">
            Enregistrée.
          </span>
        )}
        {enregistrer.isError && (
          <span role="alert" className="text-sm font-bold text-red-700 dark:text-red-400">
            Échec de l'enregistrement.
          </span>
        )}
      </div>
    </section>
  );
}

/** Candidatures spontanées : repérer des startups, garder leurs contacts, préparer les messages. */
export function Demarchage() {
  const entreprises = useEntreprises();
  const candidatures = useCandidatures();
  const reglages = useReglages();
  const offres = useOffresDuFil();
  const ajouter = useEnregistrerEntreprise();
  const [ajout, setAjout] = useState(false);

  const liste = entreprises.data ?? [];
  const parEntreprise = new Map(
    (candidatures.data ?? [])
      .filter((candidature) => candidature.company_id)
      .map((candidature) => [candidature.company_id, candidature]),
  );

  // Entreprises déjà vues dans le fil et pas encore dans la liste : un geste suffit pour les ajouter.
  const connues = new Set(liste.map((entreprise) => normalizeText(entreprise.nom)));
  const vues = new Map<string, { nom: string; pays: string | null }>();
  for (const offre of offres.data ?? []) {
    const cle = normalizeText(offre.entreprise);
    if (offre.entreprise && cle && !connues.has(cle) && !vues.has(cle)) {
      vues.set(cle, { nom: offre.entreprise, pays: offre.pays });
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-extrabold tracking-tight">Démarchage</h1>
      <p className="mt-1 text-gray-600 dark:text-gray-400">
        Pour écrire à des startups qui n'ont pas publié d'offre : repère-les, note la bonne
        personne, prépare ton message, puis suis les réponses. L'application n'envoie rien à ta
        place.
      </p>

      {reglages.isSuccess && <Presentation valeur={reglages.data.presentation} />}

      <section aria-label="Où trouver des startups" className={`mt-4 ${CARTE}`}>
        <h2 className="font-bold">Où trouver des startups</h2>
        <p className={`mt-1 text-sm ${SECONDAIRE}`}>
          Annuaires à parcourir chez eux. Quand une entreprise te plaît, ajoute-la ci-dessous.
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          {ANNUAIRES.map(({ pays, liens }) => (
            <li key={pays ?? 'tous'} className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="flex w-36 shrink-0 items-center gap-1.5 font-bold">
                <Flag code={pays} />
                {pays ? nomPays(pays) : 'Tous pays'}
              </span>
              {liens.map((lien) => (
                <a
                  key={lien.url}
                  href={lien.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={LIEN}
                >
                  {lien.libelle}
                </a>
              ))}
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Mes entreprises cibles" className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold">Mes entreprises cibles</h2>
          {!ajout && (
            <button
              type="button"
              onClick={() => setAjout(true)}
              className={`flex items-center gap-2 ${BOUTON_SECONDAIRE} bg-white dark:bg-gray-900`}
            >
              <Plus aria-hidden="true" className="size-4" /> Ajouter une entreprise
            </button>
          )}
        </div>

        {ajout && (
          <div className={`mt-3 ${CARTE}`}>
            <h3 className="font-bold">Nouvelle entreprise</h3>
            <FormulaireEntreprise onFermer={() => setAjout(false)} />
          </div>
        )}

        {vues.size > 0 && (
          <div className="mt-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Vues dans le fil, à ajouter d'un geste :
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {[...vues.values()].slice(0, 12).map(({ nom, pays }) => (
                <li key={nom}>
                  <button
                    type="button"
                    disabled={ajouter.isPending}
                    onClick={() => ajouter.mutate({ champs: { ...ENTREPRISE_VIDE, nom, pays } })}
                    className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-sm font-bold transition hover:border-primary-400 dark:border-gray-800 dark:bg-gray-900"
                  >
                    <Plus aria-hidden="true" className="size-3.5" />
                    {nom}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {entreprises.isPending && (
          <p className="mt-6 text-gray-600 dark:text-gray-400">Chargement…</p>
        )}
        {entreprises.isError && (
          <p role="alert" className="mt-6 font-bold text-red-700 dark:text-red-400">
            Les entreprises n'ont pas pu être chargées. Vérifie ta connexion.
          </p>
        )}
        {entreprises.isSuccess && liste.length === 0 && (
          <p className="mt-6 text-gray-600 dark:text-gray-400">
            Aucune entreprise pour le moment. Ajoute la première pour préparer ton message.
          </p>
        )}
        <ul className="mt-4 space-y-3">
          {liste.map((entreprise) => (
            <CarteEntreprise
              key={entreprise.id}
              entreprise={entreprise}
              candidature={parEntreprise.get(entreprise.id)}
              presentation={reglages.data?.presentation ?? ''}
              debut={reglages.data?.profil.stage.debut ?? '2027-06-01'}
              fin={reglages.data?.profil.stage.fin ?? '2027-08-31'}
            />
          ))}
        </ul>
      </section>
    </div>
  );
}
