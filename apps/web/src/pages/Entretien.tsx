import {
  changerStatut,
  CHECKLIST_ENTRETIEN,
  compteARebours,
  FUSEAUX_PAYS,
  jourIso,
  projetsPourOffre,
  sourcesPourPays,
} from '@stageradar/shared';
import { Plus, Video, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useTexteOffre } from '../components/OfferDescription';
import { CompanyAvatar } from '../components/OfferCard';
import {
  ficheVide,
  useEnregistrerFicheEntretien,
  useFicheEntretien,
  type FicheEntretien,
} from '../lib/entretien';
import { useConversations } from '../lib/messages';
import { lienSur, nomPays } from '../lib/offres';
import { useProjets } from '../lib/portfolio';
import {
  entretienDe,
  useCandidatures,
  useEnregistrerCandidature,
  valeursDe,
  type Candidature,
} from '../lib/suivi';
import { BADGE, BOUTON_DOUX, BOUTON_PRINCIPAL, CARTE, CHAMP, SECONDAIRE } from '../lib/ui';

const PARIS = 'Europe/Paris';
const TITRE = 'text-[1.1875rem] font-bold';

function horaire(date: Date, fuseau: string): string {
  const jour = date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: fuseau,
  });
  const heure = date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: fuseau,
  });
  return `${jour.charAt(0).toUpperCase()}${jour.slice(1)} · ${heure}`;
}

const PROCHAINES_ETAPES = [
  'En attente de réponse',
  '2ᵉ entretien',
  'Test technique',
  'Offre',
  'Refus',
] as const;

function Fiche({ candidature, fiche }: { candidature: Candidature; fiche: FicheEntretien }) {
  const enregistrer = useEnregistrerFicheEntretien();
  const enregistrerCandidature = useEnregistrerCandidature();
  const projets = useProjets();
  const conversations = useConversations();
  const texteOffre = useTexteOffre(candidature.offre?.id ?? null);
  const [reponses, setReponses] = useState(fiche.reponses);
  const [question, setQuestion] = useState('');
  const [notes, setNotes] = useState(candidature.notes_entretien ?? '');
  // Sources dont toutes les questions sont dépliées ; sinon les 3 premières et celles déjà répondues.
  const [depliees, setDepliees] = useState<string[]>([]);

  const entretien = entretienDe(candidature);
  const debut = entretien ? new Date(entretien.date) : null;
  const pays = candidature.resume.pays;
  const fuseau = FUSEAUX_PAYS[pays ?? ''];
  const visio = entretien?.details.lien ? lienSur(entretien.details.lien) : null;
  const conversation = conversations.data?.find((autre) => autre.application_id === candidature.id);
  const contact = conversation?.contact_nom ?? candidature.contact_nom;
  const sources = sourcesPourPays(pays);
  const cites = projetsPourOffre(
    projets.data ?? [],
    `${candidature.resume.titre} ${texteOffre.data?.description ?? ''}`,
  ).slice(0, 2);
  const faits = CHECKLIST_ENTRETIEN.filter((item) => fiche.checklist[item.id]).length;

  function sauver(champs: Partial<FicheEntretien>) {
    enregistrer.mutate({ ...fiche, ...champs, reponses });
  }

  function ajouterQuestion(evenement: FormEvent) {
    evenement.preventDefault();
    const texte = question.trim();
    if (!texte) return;
    sauver({ mes_questions: [...fiche.mes_questions, texte] });
    setQuestion('');
  }

  function choisirEtape(etape: string) {
    sauver({ prochaine_etape: etape || null });
    const statut = etape === 'Offre' ? 'offre' : etape === 'Refus' ? 'refus' : null;
    if (statut && candidature.statut !== statut) {
      enregistrerCandidature.mutate({
        candidature,
        valeurs: {
          ...valeursDe(candidature),
          ...changerStatut(candidature, statut, jourIso(new Date())),
        },
      });
    }
  }

  return (
    <div className="flex flex-col gap-5 max-md:pb-20">
      <section
        className={`flex flex-wrap items-center gap-x-7 gap-y-5 ${CARTE} rounded-[1.25rem] shadow-[0_8px_24px_rgb(20_22_43/0.05)]`}
      >
        <CompanyAvatar
          nom={candidature.resume.entreprise}
          className="size-16 rounded-[1.125rem] text-[1.375rem]"
        />
        <div className="flex min-w-0 flex-[1_1_23.75rem] flex-col gap-1.5">
          <div className="flex flex-wrap gap-1.5">
            <span className={BADGE.vert}>Entretien</span>
            {visio && <span className={BADGE.neutre}>Visio</span>}
          </div>
          <h1 className="text-[1.75rem] leading-[1.15] font-extrabold tracking-[-0.02em] md:text-[1.875rem]">
            {candidature.resume.titre}
          </h1>
          <p className="text-gray-700 dark:text-gray-300">
            {[candidature.resume.entreprise, contact && `avec ${contact}`]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        {debut ? (
          <>
            <dl className="grid flex-[1_1_20rem] grid-cols-2 gap-2.5">
              <div className="rounded-xl bg-primary-50 px-3.5 py-3 dark:bg-primary-400/15">
                <dt className="text-[0.8125rem] text-primary-700 dark:text-primary-300">
                  Chez toi · Paris
                </dt>
                <dd className="mt-0.5 text-[1.0625rem] font-bold">{horaire(debut, PARIS)}</dd>
              </div>
              {fuseau && fuseau !== PARIS && (
                <div className="rounded-xl bg-[#f0f2f7] px-3.5 py-3 dark:bg-gray-850">
                  <dt className={`text-[0.8125rem] ${SECONDAIRE}`}>
                    Chez eux · {candidature.resume.ville ?? nomPays(pays)}
                  </dt>
                  <dd className="mt-0.5 text-[1.0625rem] font-bold">{horaire(debut, fuseau)}</dd>
                </div>
              )}
            </dl>
            <div className="flex flex-col items-end gap-2">
              <span className="text-[1.75rem] font-extrabold">
                {compteARebours(debut, new Date())}
              </span>
              {visio && (
                <a
                  href={visio}
                  target="_blank"
                  rel="noreferrer"
                  className={`${BOUTON_PRINCIPAL} max-md:hidden`}
                >
                  <Video aria-hidden="true" className="size-[1.125rem]" strokeWidth={1.8} />
                  Ouvrir le lien de visio
                </a>
              )}
            </div>
          </>
        ) : (
          <p className={`flex-[1_1_20rem] ${SECONDAIRE}`}>
            Aucun créneau fixé.{' '}
            <Link
              to={`/suivi?candidature=${candidature.id}`}
              className="font-semibold text-primary-600 dark:text-primary-300"
            >
              Le noter dans le suivi
            </Link>
          </p>
        )}
      </section>

      <div className="flex flex-wrap items-start gap-5">
        <div className="flex min-w-0 flex-[999_1_37.5rem] flex-col gap-5">
          <section aria-labelledby="titre-checklist" className={`flex flex-col gap-3 ${CARTE}`}>
            <div className="flex items-baseline justify-between">
              <h2 id="titre-checklist" className={TITRE}>
                Check-list
              </h2>
              <span className="text-sm font-semibold text-vert-700 dark:text-vert-50">
                {faits} sur {CHECKLIST_ENTRETIEN.length}
              </span>
            </div>
            <div aria-hidden="true" className="h-2 rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className="h-2 rounded-full bg-vert-500"
                style={{ width: `${(faits / CHECKLIST_ENTRETIEN.length) * 100}%` }}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {CHECKLIST_ENTRETIEN.map((item) => {
                const coche = Boolean(fiche.checklist[item.id]);
                return (
                  <label
                    key={item.id}
                    className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-3.5 ${
                      coche
                        ? 'bg-vert-50 dark:bg-vert-500/20'
                        : 'border border-gray-200 dark:border-gray-800'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={coche}
                      onChange={(evenement) =>
                        sauver({
                          checklist: { ...fiche.checklist, [item.id]: evenement.target.checked },
                        })
                      }
                      className="size-5 accent-vert-500"
                    />
                    {item.libelle}
                  </label>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="titre-questions" className={`flex flex-col gap-4 ${CARTE}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="titre-questions" className={TITRE}>
                Questions fréquentes
              </h2>
              <span className={`text-[0.8125rem] ${SECONDAIRE}`}>
                Recopiées des pages citées, dans leur langue
              </span>
            </div>
            {sources.map((source) => (
              <div key={source.id} className="flex flex-col gap-4">
                {source.questions
                  .filter(
                    (item, rang) =>
                      depliees.includes(source.id) ||
                      rang < 3 ||
                      Boolean(reponses[item.id]?.trim()),
                  )
                  .map((item) => (
                    <div key={item.id} className="flex flex-col gap-1.5">
                      <label htmlFor={item.id} className="font-semibold" lang={source.langue}>
                        {item.texte}
                      </label>
                      <textarea
                        id={item.id}
                        rows={2}
                        value={reponses[item.id] ?? ''}
                        onChange={(evenement) =>
                          setReponses((avant) => ({ ...avant, [item.id]: evenement.target.value }))
                        }
                        onBlur={() => sauver({})}
                        placeholder="Ta réponse, en quelques phrases"
                        className={`${CHAMP} mt-0 resize-y`}
                      />
                    </div>
                  ))}
                {!depliees.includes(source.id) && source.questions.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setDepliees([...depliees, source.id])}
                    className="self-start text-sm font-semibold text-primary-600 dark:text-primary-300"
                  >
                    Afficher les {source.questions.length - 3} autres questions
                  </button>
                )}
                <p className={`text-[0.8125rem] ${SECONDAIRE}`}>
                  Source :{' '}
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-primary-600 underline underline-offset-2 dark:text-primary-300"
                  >
                    {source.libelle}
                  </a>{' '}
                  · vérifiée le {source.verifiee}
                </p>
              </div>
            ))}
          </section>

          <section aria-labelledby="titre-projets" className={`flex flex-col gap-3 ${CARTE}`}>
            <h2 id="titre-projets" className={TITRE}>
              Mes projets à citer
            </h2>
            {projets.isSuccess && cites.length === 0 && (
              <p className={`text-sm ${SECONDAIRE}`}>
                Aucun projet dans ton portfolio.{' '}
                <Link
                  to="/portfolio"
                  className="font-semibold text-primary-600 dark:text-primary-300"
                >
                  En ajouter un
                </Link>
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {cites.map(({ projet, communes }, rang) => (
                <Link
                  key={projet.id}
                  to="/portfolio"
                  className={`flex flex-col gap-1.5 rounded-[0.875rem] p-4 ${
                    rang === 0 && communes.length > 0
                      ? 'border-2 border-primary-600 bg-primary-50/60 dark:border-primary-400 dark:bg-primary-400/10'
                      : 'border border-gray-200 dark:border-gray-800'
                  }`}
                >
                  <span className="flex justify-between gap-2">
                    <strong className="text-base">{projet.titre}</strong>
                    <span className="text-[0.8125rem] font-bold text-primary-700 dark:text-primary-300">
                      {communes.length} techno{communes.length > 1 ? 's' : ''} en commun
                    </span>
                  </span>
                  {projet.description && (
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {projet.description}
                    </span>
                  )}
                  {communes.length > 0 && (
                    <span className="flex flex-wrap gap-1">
                      {communes.map((technologie) => (
                        <span key={technologie} className={BADGE.neutre}>
                          {technologie}
                        </span>
                      ))}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </section>

          <section
            aria-labelledby="titre-mes-questions"
            className={`flex flex-col gap-2.5 ${CARTE}`}
          >
            <h2 id="titre-mes-questions" className={TITRE}>
              Mes questions à poser
            </h2>
            {fiche.mes_questions.length > 0 && (
              <ol className="flex list-decimal flex-col gap-1.5 pl-5">
                {fiche.mes_questions.map((texte, rang) => (
                  <li key={`${rang}-${texte}`}>
                    <span className="flex items-start justify-between gap-2">
                      {texte}
                      <button
                        type="button"
                        aria-label={`Retirer « ${texte} »`}
                        onClick={() =>
                          sauver({
                            mes_questions: fiche.mes_questions.filter((_, autre) => autre !== rang),
                          })
                        }
                        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-850"
                      >
                        <X aria-hidden="true" className="size-4" />
                      </button>
                    </span>
                  </li>
                ))}
              </ol>
            )}
            <form onSubmit={ajouterQuestion} className="flex flex-wrap items-end gap-2">
              <label className="flex-[1_1_16rem] text-sm font-semibold">
                Nouvelle question
                <input
                  value={question}
                  onChange={(evenement) => setQuestion(evenement.target.value)}
                  className={CHAMP}
                />
              </label>
              <button type="submit" className={`flex items-center gap-1.5 ${BOUTON_DOUX}`}>
                <Plus aria-hidden="true" className="size-4" strokeWidth={2} />
                Ajouter une question
              </button>
            </form>
          </section>
        </div>

        <aside className="flex min-w-0 flex-[1_1_20rem] flex-col gap-5 lg:max-w-[23.75rem]">
          <section aria-labelledby="titre-entreprise" className={`flex flex-col gap-2.5 ${CARTE}`}>
            <h2 id="titre-entreprise" className="text-[1.0625rem] font-bold">
              L’entreprise
            </h2>
            <dl className="flex flex-col gap-2 text-sm">
              {candidature.offre?.url && lienSur(candidature.offre.url) && (
                <div className="flex justify-between gap-2.5">
                  <dt className={SECONDAIRE}>Annonce</dt>
                  <dd>
                    <a
                      href={candidature.offre.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary-600 dark:text-primary-300"
                    >
                      Annonce d’origine
                    </a>
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-2.5">
                <dt className={SECONDAIRE}>Lieu</dt>
                <dd>
                  {[candidature.resume.ville, nomPays(pays)].filter(Boolean).join(', ') || '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-2.5">
                <dt className={SECONDAIRE}>Contact</dt>
                <dd>
                  {conversation ? (
                    <Link
                      to={`/messages?c=${conversation.id}`}
                      className="text-primary-600 dark:text-primary-300"
                    >
                      {conversation.contact_nom}
                    </Link>
                  ) : (
                    (contact ?? '—')
                  )}
                </dd>
              </div>
            </dl>
            {texteOffre.data?.notes && (
              <p className="rounded-[0.625rem] bg-[#f0f2f7] px-3 py-2.5 text-sm dark:bg-gray-850">
                Mes notes : {texteOffre.data.notes}
              </p>
            )}
          </section>

          <section aria-labelledby="titre-apres" className={`flex flex-col gap-3 ${CARTE}`}>
            <h2 id="titre-apres" className="text-[1.0625rem] font-bold">
              Après l’entretien
            </h2>
            <fieldset>
              <legend className="mb-1.5 text-[0.8125rem] font-semibold text-gray-700 dark:text-gray-300">
                Impression
              </legend>
              <div className="flex gap-1.5">
                {(
                  [
                    ['bien', 'Bien'],
                    ['mitige', 'Mitigé'],
                    ['difficile', 'Difficile'],
                  ] as const
                ).map(([valeur, libelle]) => (
                  <button
                    key={valeur}
                    type="button"
                    aria-pressed={fiche.impression === valeur}
                    onClick={() =>
                      sauver({ impression: fiche.impression === valeur ? null : valeur })
                    }
                    className={`min-h-10 flex-1 rounded-[0.625rem] text-sm ${
                      fiche.impression === valeur
                        ? 'bg-primary-600 font-semibold text-white dark:bg-primary-400 dark:text-primary-ink'
                        : 'bg-[#f0f2f7] dark:bg-gray-850'
                    }`}
                  >
                    {libelle}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="text-[0.8125rem] font-semibold text-gray-700 dark:text-gray-300">
              Notes
              <textarea
                rows={3}
                value={notes}
                onChange={(evenement) => setNotes(evenement.target.value)}
                onBlur={() => {
                  if (notes !== (candidature.notes_entretien ?? '')) {
                    enregistrerCandidature.mutate({
                      candidature,
                      valeurs: { ...valeursDe(candidature), notes_entretien: notes || null },
                    });
                  }
                }}
                placeholder="Ce qui a été dit, les noms, les dates"
                className={CHAMP}
              />
            </label>
            <label className="text-[0.8125rem] font-semibold text-gray-700 dark:text-gray-300">
              Prochaine étape
              <select
                value={fiche.prochaine_etape ?? ''}
                onChange={(evenement) => choisirEtape(evenement.target.value)}
                className={CHAMP}
              >
                <option value="">À préciser</option>
                {PROCHAINES_ETAPES.map((etape) => (
                  <option key={etape} value={etape}>
                    {etape}
                  </option>
                ))}
              </select>
            </label>
            <Link
              to={`/messages?candidature=${candidature.id}`}
              className={`flex min-h-12 items-center justify-center ${BOUTON_DOUX}`}
            >
              Envoyer un remerciement
            </Link>
          </section>
        </aside>
      </div>

      {visio && (
        <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 border-t border-gray-200 bg-white p-3 md:hidden dark:border-gray-800 dark:bg-gray-900">
          <a href={visio} target="_blank" rel="noreferrer" className={`w-full ${BOUTON_PRINCIPAL}`}>
            <Video aria-hidden="true" className="size-[1.125rem]" strokeWidth={1.8} />
            Rejoindre la visio
          </a>
        </div>
      )}
    </div>
  );
}

/**
 * Préparation d'entretien (maquette du 18 novembre 2026) : l'heure chez moi et chez eux, la
 * check-list, les questions fréquentes de pages citées, mes projets à citer et l'après.
 */
export function Entretien() {
  const [params] = useSearchParams();
  const id = params.get('candidature');
  const candidatures = useCandidatures();
  const fiche = useFicheEntretien(id);
  const candidature = candidatures.data?.find((autre) => autre.id === id);

  if (!id) {
    return (
      <p className={SECONDAIRE}>
        Ouvre une candidature en « Entretien » dans le suivi pour préparer son entretien.
      </p>
    );
  }
  if (candidatures.isPending || fiche.isPending) return <p className={SECONDAIRE}>Chargement…</p>;
  if (candidatures.isError || fiche.isError) {
    return (
      <p role="alert" className="font-semibold text-red-700 dark:text-red-400">
        La préparation n’a pas pu être chargée. Vérifie ta connexion.
      </p>
    );
  }
  if (!candidature) return <p className={SECONDAIRE}>Cette candidature n’existe plus.</p>;
  return (
    <Fiche key={candidature.id} candidature={candidature} fiche={fiche.data ?? ficheVide(id)} />
  );
}
