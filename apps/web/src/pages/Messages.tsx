import {
  ajouterJours,
  apresRelance,
  changerStatut,
  enPleineNuit,
  FUSEAUX_PAYS,
  jourIso,
  LIBELLES_STATUT,
  lienGoogleTraductionTexte,
  lienMessagerie,
  normalizeText,
  relanceDue,
  repererCreneaux,
  STATUTS_SUIVI,
  texteRelance,
  type Creneau,
  type StatutSuivi,
} from '@stageradar/shared';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  EllipsisVertical,
  Mail,
  Paperclip,
  PenLine,
  Search,
  Send,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CompanyAvatar } from '../components/OfferCard';
import { useProfilCv } from '../lib/cv';
import { nomDocument, useDocuments } from '../lib/documents';
import {
  dernierMessage,
  reponseRapide,
  useAjouterMessage,
  useConversations,
  useCreerConversation,
  useModifierConversation,
  useSupprimerConversation,
  type ChampsConversation,
  type Conversation,
  type LangueReponse,
  type MessageConversation,
} from '../lib/messages';
import { nomPays } from '../lib/offres';
import {
  entretienDe,
  STATUTS_AVANT_ENTRETIEN,
  useCandidatures,
  useEnregistrerCandidature,
  valeursDe,
  type Candidature,
} from '../lib/suivi';
import {
  BADGE,
  BOUTON_DOUX,
  BOUTON_PRINCIPAL,
  BOUTON_SECONDAIRE,
  CHAMP,
  teinteScore,
} from '../lib/ui';

const PARIS = 'Europe/Paris';
const DISCRET = 'text-gray-600 dark:text-gray-400';
const TITRE_LATERAL = 'text-base font-bold';
const PUCE =
  'min-h-8 rounded-full px-3 text-[0.8125rem] transition disabled:opacity-50 bg-[#f0f2f7] font-medium text-[#2b2e45] hover:bg-gray-200 dark:bg-gray-850 dark:text-gray-300';
const PUCE_ACCENT =
  'min-h-8 rounded-full px-3 text-[0.8125rem] transition disabled:opacity-50 bg-primary-50 font-semibold text-primary-700 hover:bg-primary-100 dark:bg-primary-400/15 dark:text-primary-300';

type Onglet = 'tous' | 'non_lus' | 'a_relancer';

function prenom(nom: string): string {
  return nom.trim().split(/\s+/)[0] ?? nom;
}

function heureCourte(date: Date, fuseau?: string): string {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: fuseau });
}

function memeJour(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

/** « 14:20 », « Hier », « 6 nov. » : date du dernier message, dans la liste. */
function quand(iso: string, maintenant: Date): string {
  const date = new Date(iso);
  if (memeJour(date, maintenant)) return heureCourte(date);
  if (memeJour(date, new Date(maintenant.getTime() - 86_400_000))) return 'Hier';
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/** « Aujourd’hui », « lundi 9 novembre » : séparateur de jour dans le fil. */
function jourEnClair(iso: string, maintenant: Date): string {
  const date = new Date(iso);
  if (memeJour(date, maintenant)) return 'Aujourd’hui';
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function creneauxDe(conversation: Conversation): Creneau[] {
  const dernier = dernierMessage(conversation);
  if (!dernier || dernier.sens !== 'recu') return [];
  return repererCreneaux(
    dernier.corps,
    new Date(dernier.date),
    FUSEAUX_PAYS[conversation.pays ?? ''] ?? PARIS,
  );
}

/** « mar. 17 nov. · 02:00 », à l'heure de Paris. */
function creneauAParis(creneau: Creneau): string {
  const date = new Date(creneau.debut);
  const jour = date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: PARIS,
  });
  return `${jour} · ${heureCourte(date, PARIS)}`;
}

interface Etiquette {
  texte: string;
  style: string;
}

function etiquetteDe(
  conversation: Conversation,
  candidature: Candidature | undefined,
  aujourdhui: string,
): Etiquette | null {
  if (
    creneauxDe(conversation).length > 0 &&
    (!candidature || STATUTS_AVANT_ENTRETIEN.includes(candidature.statut))
  ) {
    return { texte: 'Entretien à planifier', style: BADGE.vert };
  }
  if (candidature && relanceDue(candidature, aujourdhui)) {
    return { texte: 'À relancer', style: BADGE.ambre };
  }
  if (candidature && candidature.offer_id === null) {
    return { texte: 'Démarchage', style: BADGE.violet };
  }
  return null;
}

function Avatar({ nom, className }: { nom: string; className: string }) {
  return <CompanyAvatar nom={nom} className={`rounded-full font-sans font-bold ${className}`} />;
}

function NouvelleConversation({
  candidatures,
  candidatureInitiale,
  onCreee,
  onAnnuler,
}: {
  candidatures: Candidature[];
  candidatureInitiale: Candidature | undefined;
  onCreee: (id: string) => void;
  onAnnuler: () => void;
}) {
  const depuis = (candidature: Candidature | undefined): ChampsConversation => ({
    application_id: candidature?.id ?? null,
    contact_nom: candidature?.contact_nom ?? '',
    contact_role: null,
    contact_email: candidature?.contact_email ?? null,
    entreprise: candidature?.resume.entreprise ?? null,
    pays: candidature?.resume.pays ?? null,
  });
  const [champs, setChamps] = useState<ChampsConversation>(() => depuis(candidatureInitiale));
  const creer = useCreerConversation();

  function envoyer(evenement: FormEvent) {
    evenement.preventDefault();
    creer.mutate({ ...champs, contact_nom: champs.contact_nom.trim() }, { onSuccess: onCreee });
  }

  return (
    <form onSubmit={envoyer} className="flex flex-col gap-4 p-6">
      <h2 className="text-lg font-bold">Nouvelle conversation</h2>
      <p className={`text-sm ${DISCRET}`}>
        StageRadar garde le fil de tes échanges et prépare tes réponses. Les messages partent de ta
        propre messagerie, seulement quand tu cliques sur « Envoyer ».
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-bold sm:col-span-2">
          Candidature liée
          <select
            value={champs.application_id ?? ''}
            onChange={(evenement) => {
              const choisie = candidatures.find(({ id }) => id === evenement.target.value);
              setChamps((actuels) => ({
                ...depuis(choisie),
                contact_nom: actuels.contact_nom || (choisie?.contact_nom ?? ''),
                contact_role: actuels.contact_role,
                contact_email: actuels.contact_email || (choisie?.contact_email ?? null),
              }));
            }}
            className={CHAMP}
          >
            <option value="">Aucune</option>
            {candidatures.map((candidature) => (
              <option key={candidature.id} value={candidature.id}>
                {[candidature.resume.entreprise, candidature.resume.titre]
                  .filter(Boolean)
                  .join(' · ')}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-bold">
          Nom du contact
          <input
            required
            value={champs.contact_nom}
            onChange={(evenement) => setChamps({ ...champs, contact_nom: evenement.target.value })}
            placeholder="Prénom Nom"
            className={CHAMP}
          />
        </label>
        <label className="block text-sm font-bold">
          Son rôle
          <input
            value={champs.contact_role ?? ''}
            onChange={(evenement) =>
              setChamps({ ...champs, contact_role: evenement.target.value || null })
            }
            placeholder="Recrutement, fondateur…"
            className={CHAMP}
          />
        </label>
        <label className="block text-sm font-bold">
          Son adresse e-mail
          <input
            type="email"
            value={champs.contact_email ?? ''}
            onChange={(evenement) =>
              setChamps({ ...champs, contact_email: evenement.target.value.trim() || null })
            }
            className={CHAMP}
          />
        </label>
        <label className="block text-sm font-bold">
          Entreprise
          <input
            value={champs.entreprise ?? ''}
            onChange={(evenement) =>
              setChamps({ ...champs, entreprise: evenement.target.value || null })
            }
            className={CHAMP}
          />
        </label>
      </div>
      {creer.isError && (
        <p role="alert" className="text-sm font-semibold text-red-700 dark:text-red-400">
          La conversation n'a pas pu être créée. Vérifie ta connexion.
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={creer.isPending} className={BOUTON_PRINCIPAL}>
          Créer la conversation
        </button>
        <button type="button" onClick={onAnnuler} className={BOUTON_SECONDAIRE}>
          Annuler
        </button>
      </div>
    </form>
  );
}

function Bulle({ message, contact }: { message: MessageConversation; contact: string }) {
  const heure = heureCourte(new Date(message.date));
  if (message.sens === 'envoye') {
    return (
      <div className="flex max-w-[88%] flex-col items-end gap-1.5 self-end md:max-w-[74%]">
        <p className="rounded-[1.125rem_1.125rem_0.25rem_1.125rem] bg-primary-600 px-4 py-3.5 leading-[1.55] break-words whitespace-pre-line text-white dark:bg-primary-500">
          {message.corps}
        </p>
        {message.pieces.map((piece) => (
          <span
            key={piece}
            className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium dark:border-gray-800 dark:bg-gray-900"
          >
            <Paperclip aria-hidden="true" className="size-4 text-orange-700" strokeWidth={1.8} />
            {piece}
          </span>
        ))}
        <span className={`text-xs ${DISCRET}`}>Envoyé · {heure}</span>
      </div>
    );
  }
  return (
    <div className="flex max-w-[88%] items-end gap-2.5 self-start md:max-w-[74%]">
      <Avatar nom={contact} className="size-8 text-xs max-md:hidden" />
      <span className="flex min-w-0 flex-col gap-1.5">
        <span className="rounded-[1.125rem_1.125rem_1.125rem_0.25rem] border border-gray-200 bg-white px-4 py-3.5 leading-[1.55] break-words whitespace-pre-line dark:border-gray-800 dark:bg-gray-900">
          {message.corps}
        </span>
        <span className={`flex gap-3 text-xs ${DISCRET}`}>
          {heure}
          <a
            href={lienGoogleTraductionTexte(message.corps).url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary-600 dark:text-primary-300"
          >
            Traduire
          </a>
        </span>
      </span>
    </div>
  );
}

/** Créneaux repérés dans la dernière réponse, ramenés à l'heure de Paris. */
function CarteCreneaux({
  creneaux,
  choisi,
  onChoisir,
  candidature,
  candidatures,
}: {
  creneaux: Creneau[];
  choisi: number;
  onChoisir: (rang: number) => void;
  candidature: Candidature | undefined;
  candidatures: Candidature[];
}) {
  const enregistrer = useEnregistrerCandidature();
  const entretiens = candidatures
    .map((autre) => entretienDe(autre)?.date)
    .filter((date): date is string => Boolean(date))
    .map((date) => new Date(date).getTime());
  const creneau = creneaux[choisi];

  function fixer(passerEnEntretien: boolean) {
    if (!candidature || !creneau) return;
    enregistrer.mutate({
      candidature,
      valeurs: {
        ...valeursDe(candidature),
        ...(passerEnEntretien ? changerStatut(candidature, 'entretien', jourIso(new Date())) : {}),
        entretien: creneau.debut,
      },
    });
  }

  return (
    <fieldset className="flex max-w-[35rem] flex-col gap-3 rounded-2xl border border-primary-200 bg-white p-4 md:ml-[2.625rem] dark:border-primary-400/40 dark:bg-gray-900">
      <legend className="sr-only">Créneaux à l’heure de Paris</legend>
      <p className="flex items-center gap-2.5 font-bold">
        <span className="flex size-8 items-center justify-center rounded-[0.625rem] bg-primary-50 text-primary-700 dark:bg-primary-400/15 dark:text-primary-300">
          <CalendarDays aria-hidden="true" className="size-4" strokeWidth={1.8} />
        </span>
        {creneaux.length > 1
          ? `${creneaux.length} créneaux repérés, à l’heure de Paris`
          : '1 créneau repéré, à l’heure de Paris'}
      </p>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-2.5">
        {creneaux.map((propose, rang) => {
          const date = new Date(propose.debut);
          const nuit = enPleineNuit(date);
          const pris = entretiens.some((autre) => Math.abs(autre - date.getTime()) < 3_600_000);
          return (
            <label
              key={propose.debut}
              className={`flex cursor-pointer items-start gap-2.5 rounded-xl px-3.5 py-3 ${
                rang === choisi
                  ? 'border-2 border-primary-600 bg-[#f5f8ff] dark:border-primary-400 dark:bg-primary-400/10'
                  : 'border border-gray-200 dark:border-gray-800'
              }`}
            >
              <input
                type="radio"
                name="creneau"
                checked={rang === choisi}
                onChange={() => onChoisir(rang)}
                className="mt-0.5 size-[1.125rem] accent-primary-600"
              />
              <span className="flex flex-col">
                <strong className="font-bold first-letter:uppercase">
                  {creneauAParis(propose)}
                </strong>
                <span
                  className={`text-[0.8125rem] ${
                    nuit || pris
                      ? 'text-[#8a3a0b] dark:text-orange-100'
                      : 'text-vert-700 dark:text-vert-50'
                  }`}
                >
                  {nuit
                    ? 'En pleine nuit chez toi'
                    : pris
                      ? 'Déjà un entretien à cette heure'
                      : 'Libre dans ton agenda'}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      {candidature ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={enregistrer.isPending}
            onClick={() => fixer(false)}
            className={`${BOUTON_DOUX} min-h-10`}
          >
            Ajouter au calendrier
          </button>
          {STATUTS_AVANT_ENTRETIEN.includes(candidature.statut) && (
            <button
              type="button"
              disabled={enregistrer.isPending}
              onClick={() => fixer(true)}
              className="min-h-10 rounded-[0.625rem] bg-[#f0f2f7] px-3.5 text-sm font-medium text-gray-950 transition hover:bg-gray-200 disabled:opacity-60 dark:bg-gray-850 dark:text-gray-50"
            >
              Passer en « Entretien »
            </button>
          )}
        </div>
      ) : (
        <p className={`text-sm ${DISCRET}`}>
          Lie cette conversation à une candidature pour ajouter l’entretien au calendrier.
        </p>
      )}
      {enregistrer.isSuccess && (
        <p role="status" className="text-sm font-semibold text-vert-700 dark:text-vert-50">
          Entretien noté dans le calendrier.
        </p>
      )}
      {enregistrer.isError && (
        <p role="alert" className="text-sm font-semibold text-red-700 dark:text-red-400">
          L’entretien n’a pas pu être enregistré.
        </p>
      )}
    </fieldset>
  );
}

function Composer({
  conversation,
  candidature,
  creneau,
  relance = null,
}: {
  conversation: Conversation;
  candidature: Candidature | undefined;
  creneau: Creneau | undefined;
  /** Relance préparée : son texte de départ ; l'envoyer la marque faite dans le suivi. */
  relance?: string | null;
}) {
  const [texte, setTexte] = useState(relance ?? '');
  const enregistrerCandidature = useEnregistrerCandidature();
  const [langue, setLangue] = useState<LangueReponse>('en');
  const [pieces, setPieces] = useState<string[]>([]);
  // « recu » : le champ sert à coller une réponse arrivée dans la messagerie.
  const [mode, setMode] = useState<MessageConversation['sens']>('envoye');
  const [joindre, setJoindre] = useState(false);
  const documents = useDocuments();
  const ajouter = useAjouterMessage();
  const contact = prenom(conversation.contact_nom);
  const lien = lienMessagerie(conversation.contact_email, {
    objet: candidature ? `Re: ${candidature.resume.titre}` : `Re: ${conversation.entreprise ?? ''}`,
    corps: texte,
  });

  function envoyer(evenement: FormEvent) {
    evenement.preventDefault();
    const corps = texte.trim();
    if (!corps) return;
    ajouter.mutate(
      { conversation, sens: mode, corps, pieces: mode === 'envoye' ? pieces : [] },
      {
        onSuccess: () => {
          setTexte('');
          setPieces([]);
          setMode('envoye');
        },
      },
    );
    // Lancé tout de suite : le fil se recharge après l'envoi et ce champ disparaît avec lui.
    if (relance !== null && mode === 'envoye' && candidature) {
      enregistrerCandidature.mutate({
        candidature,
        valeurs: { ...valeursDe(candidature), ...apresRelance(candidature, jourIso(new Date())) },
      });
    }
    // Le message part de la messagerie de l'appareil : l'application ne fait que l'ouvrir.
    if (mode === 'envoye' && lien) window.location.href = lien;
  }

  return (
    <form
      aria-label={`Répondre à ${conversation.contact_nom}`}
      onSubmit={envoyer}
      className="flex flex-col gap-2 border-gray-300 bg-white p-3 max-md:sticky max-md:bottom-0 max-md:z-10 max-md:border-t max-md:pb-[max(0.75rem,env(safe-area-inset-bottom))] md:mx-6 md:mb-6 md:rounded-[1.125rem] md:border dark:border-gray-800 dark:bg-gray-900"
    >
      {mode === 'envoye' && (
        <div className="hide-scroll flex gap-1.5 overflow-x-auto md:flex-wrap">
          <button
            type="button"
            onClick={() =>
              setTexte(reponseRapide('accepter', langue, contact, creneau?.texte ?? null))
            }
            className={`shrink-0 ${PUCE_ACCENT}`}
          >
            Accepter le créneau
          </button>
          <button
            type="button"
            onClick={() => setTexte(reponseRapide('remercier', langue, contact, null))}
            className={`shrink-0 ${PUCE}`}
          >
            Remercier
          </button>
          <button
            type="button"
            onClick={() => setTexte(reponseRapide('autre_horaire', langue, contact, null))}
            className={`shrink-0 ${PUCE}`}
          >
            <span className="max-md:hidden">Proposer un autre horaire</span>
            <span className="md:hidden">Autre horaire</span>
          </button>
        </div>
      )}
      <label htmlFor="reponse" className="sr-only">
        {mode === 'envoye' ? 'Ta réponse' : 'Réponse reçue'}
      </label>
      <textarea
        id="reponse"
        rows={3}
        value={texte}
        onChange={(evenement) => setTexte(evenement.target.value)}
        placeholder={
          mode === 'envoye'
            ? `Écris à ${contact}…`
            : `Colle ici la réponse de ${contact}, reçue dans ta messagerie.`
        }
        className="w-full resize-none border-0 bg-transparent px-1.5 py-2 leading-[1.55] outline-none placeholder:text-gray-400 max-md:h-14 max-md:rounded-2xl max-md:bg-gray-100 max-md:px-3.5 max-md:dark:bg-gray-850"
      />
      {pieces.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {pieces.map((piece) => (
            <li key={piece}>
              <button
                type="button"
                aria-label={`Retirer ${piece}`}
                onClick={() => setPieces(pieces.filter((autre) => autre !== piece))}
                className={BADGE.neutre}
              >
                {piece} ×
              </button>
            </li>
          ))}
        </ul>
      )}
      {joindre && (
        <div className="flex flex-wrap gap-1.5">
          {(documents.data ?? []).map((document) => (
            <button
              key={document.id}
              type="button"
              onClick={() => {
                const nom = nomDocument(document);
                if (!pieces.includes(nom)) setPieces([...pieces, nom]);
                setJoindre(false);
              }}
              className={PUCE}
            >
              {nomDocument(document)}
            </button>
          ))}
          {documents.isSuccess && documents.data.length === 0 && (
            <p className={`text-sm ${DISCRET}`}>
              Aucun document enregistré :{' '}
              <Link to="/documents" className="font-semibold text-primary-600">
                en ajouter un
              </Link>
              .
            </p>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {mode === 'envoye' && (
          <>
            <button
              type="button"
              aria-label="Joindre un document"
              aria-expanded={joindre}
              onClick={() => setJoindre(!joindre)}
              className="flex size-10 items-center justify-center rounded-[0.625rem] bg-[#f0f2f7] text-gray-950 transition hover:bg-gray-200 dark:bg-gray-850 dark:text-gray-50"
            >
              <Paperclip aria-hidden="true" className="size-[1.125rem]" strokeWidth={1.8} />
            </button>
            <button
              type="button"
              aria-label="Langue des réponses rapides"
              onClick={() => setLangue(langue === 'en' ? 'fr' : 'en')}
              className="min-h-10 rounded-[0.625rem] bg-[#f0f2f7] px-3 text-sm font-medium text-gray-950 transition hover:bg-gray-200 dark:bg-gray-850 dark:text-gray-50"
            >
              {langue === 'en' ? 'EN · Anglais' : 'FR · Français'}
            </button>
          </>
        )}
        <span
          className={`flex-[1_1_10rem] text-[0.8125rem] max-md:order-last max-md:basis-full max-md:text-xs md:text-right ${
            mode === 'envoye' && lien ? 'max-md:hidden' : ''
          } ${DISCRET}`}
        >
          {mode === 'recu'
            ? 'La réponse est ajoutée au fil et annule la relance prévue.'
            : lien
              ? 'Envoyé depuis ton e-mail, seulement quand tu cliques'
              : 'Sans adresse e-mail : le message est seulement noté ici'}
        </span>
        <button
          type="submit"
          disabled={ajouter.isPending || !texte.trim()}
          className={`${BOUTON_PRINCIPAL} max-md:ml-auto ${
            mode === 'envoye' ? 'max-md:size-11 max-md:rounded-full max-md:px-0' : ''
          }`}
        >
          <span className={mode === 'envoye' ? 'max-md:sr-only' : ''}>
            {mode === 'envoye' ? 'Envoyer' : 'Ajouter la réponse'}
          </span>
          <Send aria-hidden="true" className="size-4" strokeWidth={1.8} />
        </button>
      </div>
      {ajouter.isError && (
        <p role="alert" className="text-sm font-semibold text-red-700 dark:text-red-400">
          Le message n’a pas pu être enregistré. Vérifie ta connexion.
        </p>
      )}
      <button
        type="button"
        onClick={() => setMode(mode === 'envoye' ? 'recu' : 'envoye')}
        className="self-start text-sm font-medium text-primary-600 dark:text-primary-300"
      >
        {mode === 'envoye'
          ? `${contact} a répondu ? Coller sa réponse`
          : 'Revenir à l’écriture d’un message'}
      </button>
    </form>
  );
}

/** Colonne de droite : la candidature liée, son statut, ses relances, les documents, les notes. */
function Lateral({
  conversation,
  candidature,
  candidatures,
  aujourdhui,
  onSupprimee,
  ouverteSurTelephone,
  onFermer,
}: {
  conversation: Conversation;
  candidature: Candidature | undefined;
  candidatures: Candidature[];
  aujourdhui: string;
  onSupprimee: () => void;
  ouverteSurTelephone: boolean;
  onFermer: () => void;
}) {
  const enregistrer = useEnregistrerCandidature();
  const modifier = useModifierConversation();
  const supprimer = useSupprimerConversation();
  const [notes, setNotes] = useState(candidature?.notes_entretien ?? '');
  const [email, setEmail] = useState(conversation.contact_email ?? '');
  const [suppressionDemandee, setSuppressionDemandee] = useState(false);
  const aRepondu = conversation.messages.some((message) => message.sens === 'recu');
  const envoyes = conversation.messages.flatMap((message) =>
    message.sens === 'envoye' ? message.pieces.map((piece) => ({ piece, date: message.date })) : [],
  );
  const creneaux = creneauxDe(conversation);

  function changer(valeurs: Partial<ReturnType<typeof valeursDe>>) {
    if (candidature) {
      enregistrer.mutate({ candidature, valeurs: { ...valeursDe(candidature), ...valeurs } });
    }
  }

  const etape = !candidature
    ? null
    : creneaux.length > 0 && STATUTS_AVANT_ENTRETIEN.includes(candidature.statut)
      ? 'Prochaine étape : confirmer un créneau, puis passer en « Entretien ».'
      : candidature.statut === 'a_etudier' || candidature.statut === 'a_postuler'
        ? 'Prochaine étape : envoyer ta candidature, puis passer en « Postulé ».'
        : relanceDue(candidature, aujourdhui)
          ? 'Prochaine étape : relancer, la date prévue est arrivée.'
          : null;

  return (
    <aside
      aria-label="Candidature liée"
      className={`flex min-w-0 flex-[1_1_17.5rem] flex-col gap-5 border-gray-200 p-5 max-lg:border-t lg:border-l dark:border-gray-800 ${
        ouverteSurTelephone ? 'max-md:min-h-dvh max-md:border-t-0' : 'max-md:hidden'
      }`}
    >
      <button
        type="button"
        onClick={onFermer}
        className="-mt-2 -ml-2 flex min-h-11 items-center gap-1 self-start font-semibold md:hidden"
      >
        <ChevronLeft aria-hidden="true" className="size-[1.375rem]" strokeWidth={1.8} />
        Retour au fil
      </button>
      {candidature ? (
        <Link
          to={
            candidature.offre
              ? `/?offre=${candidature.offre.id}`
              : `/suivi?candidature=${candidature.id}`
          }
          className="flex items-center gap-3 rounded-2xl bg-gray-100 p-4 transition hover:bg-primary-50 dark:bg-gray-850"
        >
          <CompanyAvatar
            nom={candidature.resume.entreprise}
            className="size-11 rounded-xl text-[0.9375rem]"
          />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="leading-[1.3] font-bold break-words">{candidature.resume.titre}</span>
            <span className={`text-[0.8125rem] ${DISCRET}`}>
              {[candidature.resume.ville, nomPays(candidature.resume.pays)]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </span>
          <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-gray-600" />
        </Link>
      ) : (
        <label className="block text-sm font-bold">
          Lier à une candidature
          <select
            value=""
            onChange={(evenement) =>
              modifier.mutate({
                id: conversation.id,
                champs: { application_id: evenement.target.value || null },
              })
            }
            className={CHAMP}
          >
            <option value="">Aucune</option>
            {candidatures.map((autre) => (
              <option key={autre.id} value={autre.id}>
                {[autre.resume.entreprise, autre.resume.titre].filter(Boolean).join(' · ')}
              </option>
            ))}
          </select>
        </label>
      )}

      {candidature && (
        <>
          <section aria-labelledby="titre-statut-conv" className="flex flex-col gap-2.5">
            <h2 id="titre-statut-conv" className={TITRE_LATERAL}>
              Statut
            </h2>
            <label htmlFor="statut-conv" className="sr-only">
              Statut de la candidature
            </label>
            <select
              id="statut-conv"
              value={candidature.statut}
              disabled={enregistrer.isPending}
              onChange={(evenement) =>
                changer(
                  changerStatut(candidature, evenement.target.value as StatutSuivi, aujourdhui),
                )
              }
              className="h-11 rounded-[0.625rem] border border-gray-300 bg-white px-3 text-[0.9375rem] dark:border-gray-800 dark:bg-gray-950"
            >
              {STATUTS_SUIVI.map((statut) => (
                <option key={statut} value={statut}>
                  {LIBELLES_STATUT[statut]}
                </option>
              ))}
            </select>
            {etape && (
              <p className="rounded-[0.625rem] bg-primary-50 px-3 py-2.5 text-sm text-primary-700 dark:bg-primary-400/15 dark:text-primary-300">
                {etape}
              </p>
            )}
          </section>

          <section aria-labelledby="titre-relances-conv" className="flex flex-col gap-2 text-sm">
            <h2 id="titre-relances-conv" className={TITRE_LATERAL}>
              Relances
            </h2>
            {candidature.date_candidature ? (
              <>
                {[7, 14].map((jours) => {
                  const jour = ajouterJours(candidature.date_candidature!, jours);
                  return (
                    <div key={jours} className="flex justify-between gap-3">
                      <span>
                        J+{jours} ·{' '}
                        {new Date(`${jour}T12:00:00`).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                      <span className={`${DISCRET} ${aRepondu ? 'line-through' : ''}`}>
                        {aRepondu ? 'Annulée' : jour < aujourdhui ? 'Passée' : 'Prévue'}
                      </span>
                    </div>
                  );
                })}
                {aRepondu && (
                  <p className={`text-[0.8125rem] ${DISCRET}`}>
                    Annulées automatiquement : {prenom(conversation.contact_nom)} a répondu.
                  </p>
                )}
              </>
            ) : (
              <p className={DISCRET}>Aucune relance : la candidature n’est pas encore envoyée.</p>
            )}
          </section>
        </>
      )}

      <section aria-labelledby="titre-envoyes-conv" className="flex flex-col gap-2 text-sm">
        <h2 id="titre-envoyes-conv" className={TITRE_LATERAL}>
          Documents envoyés
        </h2>
        {envoyes.length === 0 && <p className={DISCRET}>Aucun document joint pour l’instant.</p>}
        {envoyes.map(({ piece, date }) => (
          <div key={piece + date} className="flex justify-between gap-3">
            <span className="min-w-0 break-words">{piece}</span>
            <span className={`shrink-0 ${DISCRET}`}>
              {new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            </span>
          </div>
        ))}
      </section>

      {candidature && (
        <section className="flex flex-col gap-2">
          <label htmlFor="notes-conv" className={TITRE_LATERAL}>
            Notes d’entretien
          </label>
          {(candidature.statut === 'entretien' || entretienDe(candidature)) && (
            <Link
              to={`/entretien?candidature=${candidature.id}`}
              className="text-sm font-semibold text-primary-600 dark:text-primary-300"
            >
              Préparer l’entretien
            </Link>
          )}
          <textarea
            id="notes-conv"
            rows={4}
            value={notes}
            onChange={(evenement) => setNotes(evenement.target.value)}
            onBlur={() => {
              if (notes !== (candidature.notes_entretien ?? '')) {
                changer({ notes_entretien: notes.trim() || null });
              }
            }}
            placeholder="Questions à préparer, projets à citer…"
            className="w-full resize-y rounded-[0.625rem] border border-gray-300 bg-white px-3 py-2.5 text-sm leading-normal dark:border-gray-800 dark:bg-gray-950"
          />
        </section>
      )}

      {enregistrer.isError && (
        <p role="alert" className="text-sm font-semibold text-red-700 dark:text-red-400">
          La candidature n’a pas pu être mise à jour.
        </p>
      )}

      <section aria-labelledby="titre-contact-conv" className="flex flex-col gap-2 text-sm">
        <h2 id="titre-contact-conv" className={TITRE_LATERAL}>
          Contact
        </h2>
        <label htmlFor="email-conv" className={DISCRET}>
          Adresse e-mail de {prenom(conversation.contact_nom)}
        </label>
        <input
          id="email-conv"
          type="email"
          value={email}
          onChange={(evenement) => setEmail(evenement.target.value)}
          onBlur={() => {
            if (email.trim() !== (conversation.contact_email ?? '')) {
              modifier.mutate({
                id: conversation.id,
                champs: { contact_email: email.trim() || null },
              });
            }
          }}
          className="h-11 rounded-[0.625rem] border border-gray-300 bg-white px-3 dark:border-gray-800 dark:bg-gray-950"
        />
        {suppressionDemandee ? (
          <button
            type="button"
            disabled={supprimer.isPending}
            onClick={() => supprimer.mutate(conversation.id, { onSuccess: onSupprimee })}
            className="self-start rounded-xl bg-red-600 px-4 py-2 font-semibold text-white"
          >
            Confirmer la suppression
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setSuppressionDemandee(true)}
            className="self-start font-medium text-red-700 underline underline-offset-2 dark:text-red-400"
          >
            Supprimer la conversation
          </button>
        )}
      </section>
    </aside>
  );
}

/** « Relance J+7 prévue aujourd'hui » : la candidature envoyée attend toujours une réponse. */
function BandeauRelance({
  candidature,
  prete,
  onPreparer,
}: {
  candidature: Candidature;
  prete: boolean;
  onPreparer: () => void;
}) {
  const rang = candidature.statut === 'relance' ? 'J+14' : 'J+7';
  const envoi = candidature.date_candidature
    ? new Date(`${candidature.date_candidature}T12:00:00Z`).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      })
    : null;
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 md:px-6 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-100"
    >
      <span className="flex-[1_1_16rem]">
        <strong>Relance {rang} prévue aujourd’hui.</strong>{' '}
        {envoi ? `Candidature envoyée le ${envoi}, pas de réponse.` : 'Pas de réponse.'}
      </span>
      {prete ? (
        <span className="font-semibold">Relance prête dans la zone d’écriture.</span>
      ) : (
        <button type="button" onClick={onPreparer} className={BOUTON_DOUX}>
          Préparer la relance
        </button>
      )}
    </div>
  );
}

function Fil({
  conversation,
  candidature,
  candidatures,
  etiquette,
  maintenant,
  cacheSurTelephone,
  onDetails,
}: {
  conversation: Conversation;
  candidature: Candidature | undefined;
  candidatures: Candidature[];
  etiquette: Etiquette | null;
  maintenant: Date;
  cacheSurTelephone: boolean;
  onDetails: () => void;
}) {
  const creneaux = creneauxDe(conversation);
  // Par défaut, le premier créneau qui ne tombe pas en pleine nuit.
  const [choisi, setChoisi] = useState(() =>
    Math.max(
      0,
      creneaux.findIndex((creneau) => !enPleineNuit(new Date(creneau.debut))),
    ),
  );
  const [relance, setRelance] = useState<string | null>(null);
  const profil = useProfilCv();
  const nomProfil =
    [profil.data?.prenom, profil.data?.nom].filter(Boolean).join(' ').trim() || null;
  const fuseau = FUSEAUX_PAYS[conversation.pays ?? ''];
  const sousTitre = [
    conversation.contact_role,
    conversation.entreprise,
    fuseau &&
      fuseau !== PARIS &&
      `il est ${heureCourte(maintenant, fuseau)} là-bas (${nomPays(conversation.pays)})`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <section
      aria-labelledby="titre-fil"
      className={`flex min-w-0 flex-[999_1_32.5rem] flex-col bg-gray-50 max-md:min-h-dvh dark:bg-gray-950 ${
        cacheSurTelephone ? 'max-md:hidden' : ''
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-3 border-b border-gray-200 bg-white px-4 py-3 max-md:sticky max-md:top-0 max-md:z-10 md:px-6 md:py-4 dark:border-gray-800 dark:bg-gray-900">
        <Link
          to="/messages"
          aria-label="Retour aux messages"
          className="-ml-2 flex size-11 items-center justify-center md:hidden"
        >
          <ChevronLeft aria-hidden="true" className="size-[1.375rem]" strokeWidth={1.8} />
        </Link>
        <Avatar nom={conversation.contact_nom} className="size-10 text-sm md:size-[2.875rem]" />
        <div className="min-w-0 flex-[1_1_10rem]">
          <h2 id="titre-fil" className="text-base font-bold md:text-lg">
            {conversation.contact_nom}
          </h2>
          {sousTitre && <p className={`text-sm max-md:hidden ${DISCRET}`}>{sousTitre}</p>}
          <p className={`truncate text-[0.8125rem] md:hidden ${DISCRET}`}>
            {[conversation.entreprise, 'via ton e-mail'].filter(Boolean).join(' · ')}
          </p>
        </div>
        <span className={`flex items-center gap-1.5 max-md:hidden ${BADGE.neutre}`}>
          <Mail aria-hidden="true" className="size-[0.9375rem]" strokeWidth={1.8} />
          Via ton e-mail
        </span>
        {etiquette && <span className={`max-md:hidden ${etiquette.style}`}>{etiquette.texte}</span>}
        <button
          type="button"
          aria-label="Candidature, relances et notes"
          onClick={onDetails}
          className="-mr-2 ml-auto flex size-11 items-center justify-center md:hidden"
        >
          <EllipsisVertical aria-hidden="true" className="size-5" strokeWidth={1.8} />
        </button>
        {candidature && (
          <Link
            to={
              candidature.offre
                ? `/?offre=${candidature.offre.id}`
                : `/suivi?candidature=${candidature.id}`
            }
            className="flex basis-full items-center gap-3 rounded-[0.875rem] bg-gray-100 px-3 py-2.5 md:hidden dark:bg-gray-850"
          >
            {typeof candidature.offre?.score === 'number' && (
              <span
                className={`flex h-8 min-w-9 items-center justify-center rounded-lg px-1.5 text-sm font-extrabold ${teinteScore(candidature.offre.score).fond} ${teinteScore(candidature.offre.score).texte}`}
              >
                {candidature.offre.score}
              </span>
            )}
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-bold">{candidature.resume.titre}</span>
              <span className={`text-xs ${DISCRET}`}>
                {LIBELLES_STATUT[candidature.statut]}
                {candidature.date_candidature &&
                  ` le ${new Date(candidature.date_candidature).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`}
              </span>
            </span>
            <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-gray-600" />
          </Link>
        )}
      </div>

      {candidature && relanceDue(candidature, jourIso(maintenant)) && (
        <BandeauRelance
          candidature={candidature}
          prete={relance !== null}
          onPreparer={() =>
            setRelance(
              texteRelance({
                langue:
                  conversation.pays === 'FR' ? 'fr' : conversation.pays === 'CO' ? 'es' : 'en',
                contact: conversation.contact_nom,
                poste: candidature.offre?.titre ?? null,
                entreprise: candidature.resume.entreprise ?? conversation.entreprise ?? '',
                envoi: candidature.date_candidature,
                rang: candidature.statut === 'relance' ? 2 : 1,
                nom: nomProfil,
              }),
            )
          }
        />
      )}

      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        {conversation.messages.length === 0 && (
          <p className={`self-center text-center text-sm ${DISCRET}`}>
            Aucun message pour l’instant. Écris le premier ci-dessous : il partira de ta messagerie.
          </p>
        )}
        {conversation.messages.map((message, rang) => {
          const precedent = conversation.messages[rang - 1];
          const nouveauJour =
            !precedent || !memeJour(new Date(precedent.date), new Date(message.date));
          return (
            <div key={message.id} className="contents">
              {nouveauJour && (
                <p className="self-center rounded-full bg-[#e9ebf2] px-3 py-1 text-xs font-semibold text-gray-700 first-letter:uppercase dark:bg-gray-850 dark:text-gray-300">
                  {jourEnClair(message.date, maintenant)}
                </p>
              )}
              <Bulle message={message} contact={conversation.contact_nom} />
            </div>
          );
        })}
        {creneaux.length > 0 && (
          <CarteCreneaux
            creneaux={creneaux}
            choisi={Math.min(choisi, creneaux.length - 1)}
            onChoisir={setChoisi}
            candidature={candidature}
            candidatures={candidatures}
          />
        )}
      </div>

      <Composer
        key={relance ?? 'libre'}
        conversation={conversation}
        candidature={candidature}
        creneau={creneaux[choisi]}
        relance={relance}
      />
    </section>
  );
}

/**
 * Messages, d'après la maquette du 11 novembre 2026 : conversations à gauche, fil au centre,
 * candidature liée à droite. Sur téléphone, la liste puis le fil occupent tout l'écran.
 */
export function Messages() {
  const [params, setParams] = useSearchParams();
  const [onglet, setOnglet] = useState<Onglet>('tous');
  const [recherche, setRecherche] = useState('');
  // Sur téléphone, « ⋮ » remplace le fil par la candidature liée.
  const [details, setDetails] = useState(false);
  const conversations = useConversations();
  const candidatures = useCandidatures();
  const modifier = useModifierConversation();

  const toutes = conversations.data ?? [];
  const suivies = candidatures.data ?? [];
  const maintenant = new Date(conversations.dataUpdatedAt || 0);
  const aujourdhui = jourIso(maintenant);
  const candidatureDe = (conversation: Conversation) =>
    suivies.find((candidature) => candidature.id === conversation.application_id);

  // « Écrire à… » depuis une offre : ouvre la conversation de sa candidature, ou en prépare une.
  const idOffre = params.get('offre');
  const candidatureOffre = idOffre
    ? suivies.find((candidature) => candidature.offer_id === idOffre)
    : suivies.find((candidature) => candidature.id === params.get('candidature'));
  const ouverte =
    toutes.find((conversation) => conversation.id === params.get('c')) ??
    (candidatureOffre &&
      toutes.find((conversation) => conversation.application_id === candidatureOffre.id));
  const nouvelle =
    !ouverte &&
    (params.has('nouvelle') || (candidatureOffre !== undefined && conversations.isSuccess));

  // Ouvrir une conversation, c'est la lire.
  const idNonLue = ouverte?.non_lu ? ouverte.id : null;
  const marquerLue = modifier.mutate;
  useEffect(() => {
    if (idNonLue) marquerLue({ id: idNonLue, champs: { non_lu: false } });
  }, [idNonLue, marquerLue]);

  const aRelancer = (conversation: Conversation) => {
    const candidature = candidatureDe(conversation);
    return candidature !== undefined && relanceDue(candidature, aujourdhui);
  };
  const nbNonLus = toutes.filter((conversation) => conversation.non_lu).length;
  const nbARelancer = toutes.filter(aRelancer).length;
  const mots = normalizeText(recherche).split(' ').filter(Boolean);
  const affichees = toutes.filter(
    (conversation) =>
      (onglet === 'tous' ||
        (onglet === 'non_lus' ? conversation.non_lu : aRelancer(conversation))) &&
      mots.every((mot) =>
        normalizeText(`${conversation.contact_nom} ${conversation.entreprise ?? ''}`).includes(mot),
      ),
  );
  const ONGLETS: { id: Onglet; libelle: string }[] = [
    { id: 'tous', libelle: 'Tous' },
    { id: 'non_lus', libelle: `Non lus · ${nbNonLus}` },
    { id: 'a_relancer', libelle: `À relancer · ${nbARelancer}` },
  ];
  const detail = ouverte !== undefined || nouvelle;

  return (
    <div className="-mx-4 flex flex-wrap border-gray-200 md:overflow-hidden bg-white max-md:-mt-5 max-md:border-b md:mx-0 md:rounded-[1.25rem] md:border md:shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <section
        aria-labelledby="titre-conversations"
        className={`flex min-w-0 flex-[1_1_18.75rem] flex-col border-gray-200 md:border-r dark:border-gray-800 ${
          detail ? 'max-md:hidden' : ''
        }`}
      >
        <div className="flex flex-col gap-3.5 px-5 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <h1
              id="titre-conversations"
              className="text-[1.625rem] font-extrabold tracking-[-0.01em]"
            >
              Messages
            </h1>
            <Link
              to="/messages?nouvelle=1"
              aria-label="Nouveau message"
              className="flex size-11 items-center justify-center rounded-xl bg-primary-600 text-white transition hover:bg-primary-700 dark:bg-primary-400 dark:text-primary-ink"
            >
              <PenLine aria-hidden="true" className="size-5" strokeWidth={2} />
            </Link>
          </div>
          <label className="flex h-11 items-center gap-2.5 rounded-xl bg-gray-100 px-3 dark:bg-gray-850">
            <Search
              aria-hidden="true"
              className="size-[1.125rem] text-gray-600"
              strokeWidth={1.8}
            />
            <span className="sr-only">Rechercher une conversation</span>
            <input
              type="search"
              value={recherche}
              onChange={(evenement) => setRecherche(evenement.target.value)}
              placeholder="Rechercher un contact"
              className="min-w-0 flex-1 border-0 bg-transparent text-[0.9375rem] outline-none placeholder:text-gray-500"
            />
          </label>
          <div
            role="tablist"
            aria-label="Filtrer les conversations"
            className="flex flex-wrap gap-1.5"
          >
            {ONGLETS.map(({ id, libelle }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={id === onglet}
                onClick={() => setOnglet(id)}
                className={`min-h-9 rounded-full px-3.5 text-sm transition ${
                  id === onglet
                    ? 'bg-gray-950 font-semibold text-white dark:bg-gray-50 dark:text-gray-950'
                    : 'bg-[#f0f2f7] font-medium text-[#2b2e45] dark:bg-gray-850 dark:text-gray-300'
                }`}
              >
                {libelle}
              </button>
            ))}
          </div>
        </div>
        {conversations.isPending && <p className={`px-5 pb-5 text-sm ${DISCRET}`}>Chargement…</p>}
        {conversations.isError && (
          <p
            role="alert"
            className="px-5 pb-5 text-sm font-semibold text-red-700 dark:text-red-400"
          >
            Les conversations n’ont pas pu être chargées. Vérifie ta connexion.
          </p>
        )}
        {conversations.isSuccess && affichees.length === 0 && (
          <p className={`px-5 pb-5 text-sm ${DISCRET}`}>
            {toutes.length === 0
              ? 'Aucune conversation. Commence par « Écrire » depuis une offre, ou crée-en une avec le bouton ci-dessus.'
              : 'Aucune conversation ne correspond.'}
          </p>
        )}
        <ul className="flex flex-col gap-0.5 px-2.5 pb-3">
          {affichees.map((conversation) => {
            const dernier = dernierMessage(conversation);
            const etiquette = etiquetteDe(conversation, candidatureDe(conversation), aujourdhui);
            return (
              <li key={conversation.id}>
                <Link
                  to={`/messages?c=${conversation.id}`}
                  onClick={() => setDetails(false)}
                  aria-current={conversation.id === ouverte?.id ? 'true' : undefined}
                  className={`flex gap-3 rounded-[0.875rem] p-3 transition ${
                    conversation.id === ouverte?.id
                      ? 'bg-primary-50 dark:bg-primary-400/15'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-850'
                  }`}
                >
                  <Avatar
                    nom={conversation.contact_nom}
                    className="size-[2.875rem] text-[0.9375rem]"
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-px">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-bold">{conversation.contact_nom}</span>
                      <span className={`shrink-0 text-xs ${DISCRET}`}>
                        {quand(dernier?.date ?? conversation.created_at, maintenant)}
                      </span>
                    </span>
                    <span className={`truncate text-[0.8125rem] ${DISCRET}`}>
                      {[conversation.entreprise, nomPays(conversation.pays)]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                    <span className="flex items-center gap-2">
                      <span
                        className={`min-w-0 flex-1 truncate text-sm ${
                          conversation.non_lu ? 'font-semibold' : DISCRET
                        }`}
                      >
                        {dernier
                          ? `${dernier.sens === 'envoye' ? 'Toi : ' : ''}${dernier.corps}`
                          : 'Pas encore de message'}
                      </span>
                      {conversation.non_lu && (
                        <span className="size-2.5 shrink-0 rounded-full bg-orange-500">
                          <span className="sr-only">Non lu</span>
                        </span>
                      )}
                    </span>
                    {etiquette && (
                      <span
                        className={`mt-1.5 self-start ${etiquette.style} px-2.5 py-0.5 text-xs`}
                      >
                        {etiquette.texte}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {ouverte ? (
        <>
          <Fil
            key={`fil-${ouverte.id}-${ouverte.messages.length}`}
            conversation={ouverte}
            candidature={candidatureDe(ouverte)}
            candidatures={suivies}
            etiquette={etiquetteDe(ouverte, candidatureDe(ouverte), aujourdhui)}
            maintenant={maintenant}
            cacheSurTelephone={details}
            onDetails={() => setDetails(true)}
          />
          <Lateral
            key={`lateral-${ouverte.id}-${ouverte.application_id}`}
            conversation={ouverte}
            candidature={candidatureDe(ouverte)}
            candidatures={suivies}
            aujourdhui={aujourdhui}
            onSupprimee={() => setParams({}, { replace: true })}
            ouverteSurTelephone={details}
            onFermer={() => setDetails(false)}
          />
        </>
      ) : nouvelle ? (
        <div className="min-w-0 flex-[999_1_32.5rem]">
          <NouvelleConversation
            key={candidatureOffre?.id ?? 'vide'}
            candidatures={suivies}
            candidatureInitiale={candidatureOffre}
            onCreee={(id) => setParams({ c: id }, { replace: true })}
            onAnnuler={() => setParams({}, { replace: true })}
          />
        </div>
      ) : (
        <p
          className={`flex min-h-64 flex-[999_1_32.5rem] items-center justify-center bg-gray-50 p-6 text-center max-md:hidden dark:bg-gray-950 ${DISCRET}`}
        >
          Choisis une conversation pour lire le fil et répondre.
        </p>
      )}
    </div>
  );
}
