import { normalizeText } from '@stageradar/shared';
import { ChevronRight, Plus, Star } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Flag } from '../components/Flag';
import { CompanyAvatar } from '../components/OfferCard';
import {
  CONTACT_VIDE,
  useContacts,
  useEnregistrerContact,
  useRendrePrincipal,
  useSupprimerContact,
  type ChampsContact,
  type ContactEntreprise,
} from '../lib/contacts';
import { LANGUES_DOCUMENT } from '../lib/documents';
import {
  useEnregistrerEntreprise,
  useEntreprises,
  type ChampsEntreprise,
  type Entreprise,
} from '../lib/entreprises';
import { useOffresDuFil } from '../lib/fil';
import { dateLongue, lienSur, lieu } from '../lib/offres';
import { STARTUPS } from '../lib/startups';
import {
  BOUTON_DOUX,
  BOUTON_PRINCIPAL,
  BOUTON_SECONDAIRE,
  CARTE,
  CHAMP,
  SECONDAIRE,
  SEGMENTS,
  segment,
} from '../lib/ui';

type Onglet = 'contacts' | 'offres' | 'notes';

/** Les champs modifiables d'une entreprise, sans son identifiant. */
function sansId(entreprise: Entreprise): ChampsEntreprise {
  const champs: Partial<Entreprise> = { ...entreprise };
  delete champs.id;
  return champs as ChampsEntreprise;
}

function nomLangue(code: string | null): string {
  return LANGUES_DOCUMENT.find(([autre]) => autre === code)?.[1] ?? '—';
}

function FormulaireContact({
  entreprise,
  contact,
  premier,
  onFermer,
}: {
  entreprise: Entreprise;
  contact: ContactEntreprise | null;
  premier: boolean;
  onFermer: () => void;
}) {
  const [champs, setChamps] = useState<ChampsContact>(contact ?? CONTACT_VIDE);
  const enregistrer = useEnregistrerContact();
  const supprimer = useSupprimerContact();

  function texte(cle: keyof ChampsContact) {
    return {
      value: champs[cle] ?? '',
      onChange: (evenement: { target: { value: string } }) =>
        setChamps({ ...champs, [cle]: evenement.target.value || null }),
      className: CHAMP,
    };
  }

  function envoyer(evenement: FormEvent) {
    evenement.preventDefault();
    enregistrer.mutate(
      {
        id: contact?.id,
        companyId: entreprise.id,
        champs: { ...champs, nom: champs.nom.trim() },
        // Le premier contact d'une entreprise en devient le principal.
        principal: contact ? contact.principal : premier,
      },
      { onSuccess: onFermer },
    );
  }

  return (
    <form
      onSubmit={envoyer}
      aria-label={contact ? `Modifier ${contact.nom}` : 'Nouveau contact'}
      className={`grid gap-3 sm:grid-cols-2 ${CARTE}`}
    >
      <label className="text-sm font-semibold">
        Nom
        <input required maxLength={200} {...texte('nom')} value={champs.nom} />
      </label>
      <label className="text-sm font-semibold">
        Rôle
        <input placeholder="Recrutement, futur tuteur, ancien stagiaire…" {...texte('role')} />
      </label>
      <label className="text-sm font-semibold">
        E-mail
        <input type="email" {...texte('email')} />
      </label>
      <label className="text-sm font-semibold">
        Profil LinkedIn
        <input type="url" placeholder="https://www.linkedin.com/in/…" {...texte('linkedin')} />
      </label>
      <label className="text-sm font-semibold">
        Langue pour lui écrire
        <select {...texte('langue')}>
          <option value="">—</option>
          {LANGUES_DOCUMENT.map(([code, nom]) => (
            <option key={code} value={code}>
              {nom}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-semibold">
        Dernier échange
        <input type="date" {...texte('dernier_echange')} />
      </label>
      <label className="text-sm font-semibold sm:col-span-2">
        Notes
        <textarea rows={2} {...texte('notes')} />
      </label>
      {enregistrer.isError && (
        <p
          role="alert"
          className="text-sm font-semibold text-red-700 sm:col-span-2 dark:text-red-400"
        >
          Le contact n’a pas pu être enregistré. Vérifie ta connexion.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={enregistrer.isPending} className={BOUTON_PRINCIPAL}>
          Enregistrer
        </button>
        <button type="button" onClick={onFermer} className={BOUTON_SECONDAIRE}>
          Annuler
        </button>
        {contact && (
          <button
            type="button"
            onClick={() => supprimer.mutate(contact.id, { onSuccess: onFermer })}
            className="ml-auto text-sm font-medium text-red-700 underline underline-offset-2 dark:text-red-400"
          >
            Supprimer ce contact
          </button>
        )}
      </div>
    </form>
  );
}

function CarteContact({
  contact,
  ancien,
  onModifier,
}: {
  contact: ContactEntreprise;
  /** Contact principal actuel de l'entreprise. */
  ancien: ContactEntreprise | undefined;
  onModifier: () => void;
}) {
  const principal = useRendrePrincipal();
  const linkedin = contact.linkedin ? lienSur(contact.linkedin) : null;
  return (
    <article
      aria-label={contact.nom}
      className={`flex flex-col gap-3 rounded-2xl bg-white p-[1.125rem] dark:bg-gray-900 ${
        contact.principal
          ? 'border-2 border-amber-400'
          : 'border border-gray-200 dark:border-gray-800'
      }`}
    >
      <div className="flex items-center gap-3">
        <CompanyAvatar nom={contact.nom} className="size-11 rounded-full text-sm" />
        <span className="flex min-w-0 flex-1 flex-col">
          <strong className="break-words">{contact.nom}</strong>
          {contact.role && <span className={`text-sm ${SECONDAIRE}`}>{contact.role}</span>}
        </span>
        <button
          type="button"
          aria-pressed={contact.principal}
          aria-label={contact.principal ? 'Contact principal' : 'Rendre principal'}
          disabled={contact.principal || principal.isPending}
          onClick={() => principal.mutate({ contact, ancien })}
          className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
            contact.principal
              ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/20'
              : 'bg-[#f0f2f7] text-gray-600 hover:text-amber-600 dark:bg-gray-850'
          }`}
        >
          <Star
            aria-hidden="true"
            className="size-[1.125rem]"
            fill={contact.principal ? '#f5b82e' : 'none'}
            strokeWidth={1.8}
          />
        </button>
      </div>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
        <dt className={SECONDAIRE}>E-mail</dt>
        <dd className="break-words">{contact.email ?? '—'}</dd>
        <dt className={SECONDAIRE}>LinkedIn</dt>
        <dd className="truncate">
          {linkedin ? (
            <a
              href={linkedin}
              target="_blank"
              rel="noreferrer"
              className="text-primary-600 dark:text-primary-300"
            >
              Profil
            </a>
          ) : (
            '—'
          )}
        </dd>
        <dt className={SECONDAIRE}>Langue</dt>
        <dd>{nomLangue(contact.langue)}</dd>
        <dt className={SECONDAIRE}>Dernier échange</dt>
        <dd>{contact.dernier_echange ? dateLongue(contact.dernier_echange) : 'Jamais'}</dd>
      </dl>
      {contact.notes && <p className="text-sm whitespace-pre-line">{contact.notes}</p>}
      <div className="mt-auto flex gap-2">
        {contact.email && (
          <a href={`mailto:${contact.email}`} className={`flex-1 text-center ${BOUTON_DOUX}`}>
            Écrire
          </a>
        )}
        <button type="button" onClick={onModifier} className={BOUTON_SECONDAIRE}>
          Modifier
        </button>
      </div>
    </article>
  );
}

/**
 * Fiche d'une entreprise démarchée (maquette du 18 novembre 2026) : ses contacts (un principal,
 * qui reçoit les messages de démarchage), ses offres dans le fil et mes notes.
 */
export function FicheEntreprise() {
  const [params] = useSearchParams();
  const id = params.get('id');
  const entreprises = useEntreprises();
  const contacts = useContacts();
  const offres = useOffresDuFil();
  const enregistrerEntreprise = useEnregistrerEntreprise();
  const [onglet, setOnglet] = useState<Onglet>('contacts');
  const [edition, setEdition] = useState<{ contact: ContactEntreprise | null }>();
  const [notes, setNotes] = useState<string | null>(null);

  const entreprise = entreprises.data?.find((autre) => autre.id === id);
  if (entreprises.isPending) return <p className={SECONDAIRE}>Chargement…</p>;
  if (!entreprise)
    return <p className={SECONDAIRE}>Cette entreprise n’est plus dans tes contacts.</p>;

  const siens = (contacts.data ?? []).filter((contact) => contact.company_id === entreprise.id);
  const nom = normalizeText(entreprise.nom);
  const sesOffres = (offres.data ?? []).filter(
    (offre) => offre.entreprise && normalizeText(offre.entreprise) === nom,
  );
  const startup = STARTUPS.find((fiche) => normalizeText(fiche.nom) === nom);
  const site = entreprise.site ? lienSur(entreprise.site) : null;
  const ONGLETS: [Onglet, string][] = [
    ['contacts', `Contacts · ${siens.length}`],
    ['offres', `Offres · ${sesOffres.length}`],
    ['notes', 'Notes'],
  ];

  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="Fil d’Ariane" className={`flex items-center gap-2 text-sm ${SECONDAIRE}`}>
        <Link to="/demarchage" className="text-primary-600 dark:text-primary-300">
          Contacts
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-gray-950 dark:text-gray-50">{entreprise.nom}</span>
      </nav>

      <section className={`flex flex-wrap items-center gap-5 ${CARTE}`}>
        <CompanyAvatar
          nom={entreprise.nom}
          className="size-16 rounded-[1.125rem] text-[1.375rem]"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="text-[1.75rem] font-extrabold tracking-[-0.02em]">{entreprise.nom}</h1>
          <p className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-sm ${SECONDAIRE}`}>
            {lieu(entreprise) && (
              <span className="flex items-center gap-1.5">
                <Flag code={entreprise.pays} />
                {lieu(entreprise)}
              </span>
            )}
            {site && (
              <a
                href={site}
                target="_blank"
                rel="noreferrer"
                className="text-primary-600 dark:text-primary-300"
              >
                {site.replace(/^https?:\/\//, '')}
              </a>
            )}
            {startup && (
              <Link to="/startups" className="text-primary-600 dark:text-primary-300">
                Fiche Startups Japon et Corée
              </Link>
            )}
          </p>
        </div>
      </section>

      <div role="tablist" aria-label="Sections de la fiche" className={`${SEGMENTS} self-start`}>
        {ONGLETS.map(([cle, libelle]) => (
          <button
            key={cle}
            type="button"
            role="tab"
            aria-selected={onglet === cle}
            onClick={() => setOnglet(cle)}
            className={segment(onglet === cle)}
          >
            {libelle}
          </button>
        ))}
      </div>

      {onglet === 'contacts' && (
        <section aria-label="Contacts" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className={`text-sm ${SECONDAIRE}`}>
              Le contact principal, marqué d’une étoile, reçoit les messages de démarchage.
            </p>
            {!edition && (
              <button
                type="button"
                onClick={() => setEdition({ contact: null })}
                className={`flex items-center gap-1.5 ${BOUTON_PRINCIPAL}`}
              >
                <Plus aria-hidden="true" className="size-4" strokeWidth={2} />
                Ajouter un contact
              </button>
            )}
          </div>
          {edition && (
            <FormulaireContact
              key={edition.contact?.id ?? 'nouveau'}
              entreprise={entreprise}
              contact={edition.contact}
              premier={siens.length === 0}
              onFermer={() => setEdition(undefined)}
            />
          )}
          {contacts.isSuccess && siens.length === 0 && !edition && (
            <p className={SECONDAIRE}>Aucun contact pour l’instant.</p>
          )}
          <div className="grid gap-4 md:grid-cols-[repeat(auto-fill,minmax(18rem,1fr))]">
            {siens.map((contact) => (
              <CarteContact
                key={contact.id}
                contact={contact}
                ancien={siens.find((autre) => autre.principal)}
                onModifier={() => setEdition({ contact })}
              />
            ))}
          </div>
        </section>
      )}

      {onglet === 'offres' && (
        <section aria-label="Offres" className={CARTE}>
          {sesOffres.length === 0 ? (
            <p className={SECONDAIRE}>Aucune offre de cette entreprise dans le fil.</p>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-800">
              {sesOffres.map((offre) => (
                <li key={offre.id}>
                  <Link to={`/?offre=${offre.id}`} className="flex items-center gap-3 py-3">
                    <span className="min-w-0 flex-1 font-semibold">{offre.titre}</span>
                    <span className="text-sm font-bold">{offre.score}</span>
                    <ChevronRight aria-hidden="true" className="size-4 text-gray-400" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {onglet === 'notes' && (
        <section aria-label="Notes" className={`flex flex-col gap-3 ${CARTE}`}>
          <label className="text-sm font-semibold">
            Mes notes sur l’entreprise
            <textarea
              rows={6}
              value={notes ?? entreprise.notes ?? ''}
              onChange={(evenement) => setNotes(evenement.target.value)}
              className={CHAMP}
            />
          </label>
          <button
            type="button"
            disabled={notes === null || enregistrerEntreprise.isPending}
            onClick={() => {
              enregistrerEntreprise.mutate(
                { id: entreprise.id, champs: { ...sansId(entreprise), notes: notes || null } },
                { onSuccess: () => setNotes(null) },
              );
            }}
            className={`self-start ${BOUTON_PRINCIPAL}`}
          >
            Enregistrer les notes
          </button>
        </section>
      )}
    </div>
  );
}
