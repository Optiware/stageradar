import { LIBELLES_PAYS, PAYS_STAGE } from '@stageradar/shared';
import { ExternalLink, Plus, Scale } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Flag } from '../components/Flag';
import { CompanyAvatar } from '../components/OfferCard';
import {
  COMMUNAUTES,
  LIBELLES_STATUT_RESEAU,
  LIBELLES_TYPE_COMMUNAUTE,
  SOURCE_GRATIFICATION,
  useContactsReseau,
  useEnregistrerContactReseau,
  useSupprimerContactReseau,
  VERIFICATION_COMMUNAUTES,
  type ChampsContactReseau,
  type ContactReseau,
  type StatutReseau,
  type TypeCommunaute,
} from '../lib/communautes';
import { lienSur } from '../lib/offres';
import {
  BADGE,
  BOUTON_DOUX,
  BOUTON_PRINCIPAL,
  BOUTON_SECONDAIRE,
  CARTE,
  CHAMP,
  pilule,
  SECONDAIRE,
} from '../lib/ui';

const LIEN = 'font-semibold text-primary-600 underline underline-offset-2 dark:text-primary-300';
const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

/** Lien « Écrire » : un e-mail ouvre la messagerie, une adresse web s'ouvre telle quelle. */
function lienContact(lien: string | null): string | null {
  const valeur = lien?.trim() ?? '';
  if (EMAIL.test(valeur)) return `mailto:${valeur}`;
  return lienSur(valeur);
}

function FormulaireContact({
  contact,
  onFermer,
}: {
  contact: ContactReseau | null;
  onFermer: () => void;
}) {
  const [champs, setChamps] = useState<Partial<ChampsContactReseau>>(
    contact ?? { statut: 'a_contacter' },
  );
  const enregistrer = useEnregistrerContactReseau();
  const supprimer = useSupprimerContactReseau();

  function texte(cle: 'nom' | 'startup' | 'role' | 'lien' | 'origine' | 'notes') {
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
      { id: contact?.id, champs: { ...champs, nom: champs.nom?.trim() } },
      { onSuccess: onFermer },
    );
  }

  return (
    <form
      onSubmit={envoyer}
      aria-label={contact ? `Modifier ${contact.nom}` : 'Nouveau contact'}
      className="flex flex-col gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-800"
    >
      <label className="text-sm font-semibold">
        Nom
        <input required maxLength={200} {...texte('nom')} />
      </label>
      <label className="text-sm font-semibold">
        Startup
        <input {...texte('startup')} />
      </label>
      <label className="text-sm font-semibold">
        Rôle
        <input placeholder="Fondatrice, CTO…" {...texte('role')} />
      </label>
      <label className="text-sm font-semibold">
        E-mail ou lien (LinkedIn, site)
        <input {...texte('lien')} />
      </label>
      <label className="text-sm font-semibold">
        Trouvé via
        <input list="liste-communautes" {...texte('origine')} />
        <datalist id="liste-communautes">
          {COMMUNAUTES.map((communaute) => (
            <option key={communaute.id} value={communaute.nom} />
          ))}
        </datalist>
      </label>
      <label className="text-sm font-semibold">
        Où en est l’échange
        <select
          value={champs.statut ?? 'a_contacter'}
          onChange={(evenement) =>
            setChamps({ ...champs, statut: evenement.target.value as StatutReseau })
          }
          className={CHAMP}
        >
          {(Object.keys(LIBELLES_STATUT_RESEAU) as StatutReseau[]).map((statut) => (
            <option key={statut} value={statut}>
              {LIBELLES_STATUT_RESEAU[statut]}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-semibold">
        Notes
        <textarea rows={2} {...texte('notes')} />
      </label>
      {enregistrer.isError && (
        <p role="alert" className="text-sm font-semibold text-red-700 dark:text-red-400">
          Le contact n’a pas pu être enregistré. Vérifie ta connexion.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
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
            Supprimer
          </button>
        )}
      </div>
    </form>
  );
}

/**
 * Communautés et startups (maquette du 18 novembre 2026) : un annuaire sourcé de lieux où
 * rencontrer des startups, les personnes rencontrées, et ce que dit la loi des stages non payés.
 * L'application n'a qu'un utilisateur : ce n'est pas un forum.
 */
export function Communautes() {
  const [pays, setPays] = useState<string[]>([]);
  const [type, setType] = useState<TypeCommunaute | null>(null);
  const [anglais, setAnglais] = useState(false);
  const [gratuit, setGratuit] = useState(false);
  const [edition, setEdition] = useState<{ contact: ContactReseau | null }>();
  const contacts = useContactsReseau();

  const affichees = COMMUNAUTES.filter(
    (communaute) =>
      (pays.length === 0 || pays.includes(communaute.pays)) &&
      (!type || communaute.type === type) &&
      (!anglais || communaute.langue === 'anglais') &&
      (!gratuit || communaute.gratuit === true),
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-[1.75rem] font-extrabold tracking-[-0.02em] md:text-[2.125rem]">
          Communautés et startups
        </h1>
        <p className={SECONDAIRE}>
          Où rencontrer des startups et des fondateurs qui prennent des stagiaires. Un annuaire
          sourcé, pas un forum.
        </p>
      </div>

      <section
        aria-labelledby="titre-loi"
        className="flex flex-wrap items-start gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-50"
      >
        <Scale aria-hidden="true" className="size-6 shrink-0" strokeWidth={1.8} />
        <div className="flex min-w-0 flex-[1_1_20rem] flex-col gap-2">
          <h2 id="titre-loi" className="text-lg font-bold">
            Stage non payé : ce que dit la loi
          </h2>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm">
            <li>
              En France, au-delà de deux mois de stage (consécutifs ou non) sur une même année
              d’enseignement, une gratification minimale est obligatoire.{' '}
              <a href={SOURCE_GRATIFICATION.url} target="_blank" rel="noreferrer" className={LIEN}>
                {SOURCE_GRATIFICATION.libelle}
              </a>
              , vérifiée le {SOURCE_GRATIFICATION.verifiee}.
            </li>
            <li>
              À l’étranger, un stage, même sans salaire, peut demander un visa adapté : les règles
              et leurs sources officielles sont dans la fiche de chaque pays.
            </li>
          </ul>
        </div>
        <Link to="/pays" className={`self-center ${BOUTON_DOUX}`}>
          Voir les fiches pays
        </Link>
      </section>

      <div role="group" aria-label="Filtres" className="flex flex-wrap items-center gap-2">
        {PAYS_STAGE.map((code) => (
          <button
            key={code}
            type="button"
            aria-pressed={pays.includes(code)}
            onClick={() =>
              setPays(
                pays.includes(code) ? pays.filter((autre) => autre !== code) : [...pays, code],
              )
            }
            className={`inline-flex items-center gap-2 ${pilule(pays.includes(code))}`}
          >
            <Flag code={code} />
            {LIBELLES_PAYS[code]}
          </button>
        ))}
        <span aria-hidden="true" className="mx-1 h-6 w-px bg-gray-300 dark:bg-gray-700" />
        <label className="flex items-center gap-2 text-sm">
          <span className="sr-only">Type</span>
          <select
            value={type ?? ''}
            onChange={(evenement) =>
              setType((evenement.target.value || null) as TypeCommunaute | null)
            }
            className="min-h-10 rounded-full border border-gray-300 bg-white px-3.5 text-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <option value="">Type : tous</option>
            {(Object.keys(LIBELLES_TYPE_COMMUNAUTE) as TypeCommunaute[]).map((cle) => (
              <option key={cle} value={cle}>
                {LIBELLES_TYPE_COMMUNAUTE[cle]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          aria-pressed={anglais}
          onClick={() => setAnglais(!anglais)}
          className={pilule(anglais)}
        >
          En anglais
        </button>
        <button
          type="button"
          aria-pressed={gratuit}
          onClick={() => setGratuit(!gratuit)}
          className={pilule(gratuit)}
        >
          Gratuit seulement
        </button>
      </div>

      <div className="flex flex-wrap items-start gap-5">
        <section
          aria-labelledby="titre-annuaire"
          className="flex min-w-0 flex-[999_1_37.5rem] flex-col gap-3.5"
        >
          <h2 id="titre-annuaire" className="text-xl font-bold">
            Annuaire{' '}
            <span className={`font-medium ${SECONDAIRE}`}>
              · {affichees.length} résultat{affichees.length > 1 ? 's' : ''}
            </span>
          </h2>
          {affichees.length === 0 && (
            <p className={SECONDAIRE}>Aucune communauté pour ces filtres pour l’instant.</p>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {affichees.map((communaute) => (
              <article
                key={communaute.id}
                aria-label={communaute.nom}
                className="flex flex-col gap-2.5 rounded-2xl border border-gray-200 bg-white p-[1.125rem] dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex items-center gap-2.5">
                  <Flag code={communaute.pays} />
                  <span className="flex min-w-0 flex-col">
                    <strong className="break-words">{communaute.nom}</strong>
                    <span className={`text-sm ${SECONDAIRE}`}>
                      {communaute.ville}, {LIBELLES_PAYS[communaute.pays as 'JP']}
                    </span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className={BADGE.bleu}>{LIBELLES_TYPE_COMMUNAUTE[communaute.type]}</span>
                  {communaute.langue && <span className={BADGE.neutre}>En anglais</span>}
                  {communaute.gratuit && <span className={BADGE.vert}>Gratuit</span>}
                </div>
                <blockquote
                  lang="en"
                  className="border-l-2 border-gray-200 pl-3 text-sm italic dark:border-gray-700"
                >
                  « {communaute.citation} »
                </blockquote>
                {communaute.note && <p className={`text-sm ${SECONDAIRE}`}>{communaute.note}</p>}
                <div className="mt-auto flex items-center justify-between gap-3 pt-1">
                  <span className={`text-xs ${SECONDAIRE}`}>
                    Page vérifiée le {VERIFICATION_COMMUNAUTES}
                  </span>
                  <a
                    href={communaute.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 dark:text-primary-300"
                  >
                    Ouvrir <ExternalLink aria-hidden="true" className="size-3.5" />
                  </a>
                </div>
              </article>
            ))}
          </div>
          <p className={`text-sm ${SECONDAIRE}`}>
            Japon : la page communauté de TokyoDev refuse la lecture automatique, elle n’a pas pu
            être vérifiée ici. Canada et Londres : rien de vérifié pour l’instant.
          </p>
        </section>

        <aside
          aria-labelledby="titre-reseau"
          className={`flex min-w-0 flex-[1_1_20rem] flex-col gap-3 md:max-w-[25rem] ${CARTE}`}
        >
          <div className="flex items-center justify-between gap-2">
            <h2 id="titre-reseau" className="text-lg font-bold">
              Startups ouvertes aux stagiaires
            </h2>
            {!edition && (
              <button
                type="button"
                aria-label="Ajouter un contact"
                onClick={() => setEdition({ contact: null })}
                className="flex size-10 items-center justify-center rounded-xl bg-primary-600 text-white dark:bg-primary-400 dark:text-primary-ink"
              >
                <Plus aria-hidden="true" className="size-5" strokeWidth={2} />
              </button>
            )}
          </div>
          <p className={`text-sm ${SECONDAIRE}`}>
            Les personnes rencontrées dans ces communautés, et où en est l’échange.
          </p>
          {edition && (
            <FormulaireContact
              key={edition.contact?.id ?? 'nouveau'}
              contact={edition.contact}
              onFermer={() => setEdition(undefined)}
            />
          )}
          {contacts.isSuccess && contacts.data.length === 0 && !edition && (
            <p className="text-sm">Personne pour l’instant.</p>
          )}
          <ul className="flex flex-col divide-y divide-gray-200 dark:divide-gray-800">
            {(contacts.data ?? []).map((contact) => {
              const lien = lienContact(contact.lien);
              return (
                <li key={contact.id} className="flex items-center gap-3 py-2.5">
                  <CompanyAvatar nom={contact.nom} className="size-10 rounded-full text-sm" />
                  <button
                    type="button"
                    onClick={() => setEdition({ contact })}
                    className="flex min-w-0 flex-1 flex-col text-left"
                  >
                    <span className="flex flex-wrap items-center gap-x-2">
                      <strong>{contact.nom}</strong>
                      <span
                        className={`${
                          contact.statut === 'a_repondu'
                            ? BADGE.vert
                            : contact.statut === 'contacte'
                              ? BADGE.bleu
                              : BADGE.neutre
                        } px-2 py-0 text-xs`}
                      >
                        {LIBELLES_STATUT_RESEAU[contact.statut]}
                      </span>
                    </span>
                    {(contact.role || contact.startup) && (
                      <span className={`text-sm ${SECONDAIRE}`}>
                        {[contact.role, contact.startup].filter(Boolean).join(' · ')}
                      </span>
                    )}
                    {contact.origine && (
                      <span className={`text-xs ${SECONDAIRE}`}>Trouvé via {contact.origine}</span>
                    )}
                  </button>
                  {lien && (
                    <a href={lien} target="_blank" rel="noreferrer" className={BOUTON_DOUX}>
                      Écrire
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
    </div>
  );
}
