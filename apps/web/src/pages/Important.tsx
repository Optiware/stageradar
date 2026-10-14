import { envoyeesCetteSemaine, jourIso, relanceDue } from '@stageradar/shared';
import { ArrowRight, Bell, CalendarDays, Minus, Plus, Sparkles, Target } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Flag } from '../components/Flag';
import { useOffresDuFil } from '../lib/fil';
import { estNouvelle, lienSur, lieu } from '../lib/offres';
import {
  entretienDe,
  libelleEntretien,
  libelleRelance,
  useCandidatures,
  useChangerObjectifHebdo,
  useObjectifHebdo,
} from '../lib/suivi';
import { CARTE, SECONDAIRE } from '../lib/ui';

/** Score à partir duquel une nouvelle offre est signalée ici (seuil des notifications, §5.3). */
const SCORE_A_SIGNALER = 75;

/** Ligne-bouton d'un bloc : bordure cyan au survol. */
const LIGNE =
  'group flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-3.5 transition hover:border-primary-600 dark:border-gray-800 dark:bg-gray-850 dark:hover:border-primary-400';
/** Ligne d'une action à faire : bordure et texte ambre au survol. */
const LIGNE_ACTION =
  'group flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-3.5 transition hover:border-amber-500 hover:text-amber-700 dark:border-gray-800 dark:bg-gray-850 dark:hover:border-amber-400 dark:hover:text-amber-400';
const BOUTON_OBJECTIF =
  'flex size-9 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25 disabled:opacity-40';

function Bloc({
  titre,
  icone,
  teinte,
  children,
}: {
  titre: string;
  icone: ReactNode;
  teinte: string;
  children: ReactNode;
}) {
  return (
    <section aria-label={titre} className={CARTE}>
      <div className="flex items-center gap-3">
        <span className={`rounded-xl p-2 ${teinte}`}>{icone}</span>
        <h2 className="font-bold">{titre}</h2>
      </div>
      <div className="mt-4 space-y-2">{children}</div>
    </section>
  );
}

/** Ce qui demande de l'attention aujourd'hui : objectif, entretiens, relances, nouvelles offres. */
export function Important() {
  const candidatures = useCandidatures();
  const objectif = useObjectifHebdo();
  const changerObjectif = useChangerObjectifHebdo();
  const offres = useOffresDuFil();

  const toutes = candidatures.data ?? [];
  // Heure du dernier chargement, pour ne pas dépendre de l'instant du rendu.
  const maintenant = new Date(candidatures.dataUpdatedAt);
  const aujourdhui = jourIso(maintenant);

  const envoyees = envoyeesCetteSemaine(toutes, aujourdhui);
  const vise = objectif.data ?? 5;
  const part = Math.min(100, Math.round((envoyees / vise) * 100));

  const entretiens = toutes
    .map((candidature) => ({ candidature, entretien: entretienDe(candidature) }))
    .filter(
      (ligne): ligne is typeof ligne & { entretien: NonNullable<typeof ligne.entretien> } =>
        ligne.entretien !== undefined && new Date(ligne.entretien.date) >= maintenant,
    )
    .sort((a, b) => a.entretien.date.localeCompare(b.entretien.date));

  const relances = toutes
    .filter((candidature) => relanceDue(candidature, aujourdhui))
    .sort((a, b) => a.prochaine_relance!.localeCompare(b.prochaine_relance!));
  const aPostuler = toutes.filter((candidature) => candidature.statut === 'a_postuler');

  const suivies = new Set(toutes.map((candidature) => candidature.offer_id));
  const nouvelles = (offres.data ?? [])
    .filter(
      (offre) =>
        estNouvelle(offre, offres.dataUpdatedAt) &&
        (offre.score ?? 0) >= SCORE_A_SIGNALER &&
        offre.exclue_raison === null &&
        !offre.masquee &&
        !suivies.has(offre.id),
    )
    .slice(0, 5);

  return (
    <>
      <p className={`text-sm font-bold capitalize ${SECONDAIRE}`}>
        {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>
      <h1 className="mt-1 text-[1.75rem] font-extrabold tracking-[-0.035em] md:text-[2rem]">
        Important
      </h1>
      <p className={`mt-1 text-[0.9375rem] ${SECONDAIRE}`}>Bonjour, prêt à foncer ? 🚀</p>

      {(candidatures.isError || offres.isError) && (
        <p role="alert" className="mt-4 font-bold text-red-700 dark:text-red-400">
          Certaines données n'ont pas pu être chargées. Vérifie ta connexion.
        </p>
      )}
      {candidatures.isPending && (
        <p className="mt-8 text-gray-600 dark:text-gray-400">Chargement…</p>
      )}

      {candidatures.isSuccess && (
        <div className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(min(100%,17.5rem),1fr))] gap-5">
          <section
            aria-label="Objectif de la semaine"
            className="relative overflow-hidden rounded-3xl bg-gray-950 p-6 text-white shadow-sm dark:border dark:border-gray-800 dark:bg-gray-900"
          >
            <Target
              aria-hidden="true"
              className="absolute -right-6 -bottom-6 size-[10.625rem] opacity-[0.16]"
              strokeWidth={1.5}
            />
            <h2 className="font-bold text-white/70">Objectif de la semaine</h2>
            <p className="mt-2 text-5xl font-extrabold tracking-[-0.03em]">
              {envoyees} <span className="text-2xl font-bold text-white/60">/ {vise}</span>
            </p>
            <p className="mt-1 text-sm font-bold text-white/70">
              {envoyees > 1 ? 'candidatures envoyées' : 'candidature envoyée'} depuis lundi
            </p>
            <div
              role="progressbar"
              aria-label="Avancement de l'objectif"
              aria-valuemin={0}
              aria-valuemax={vise}
              aria-valuenow={Math.min(envoyees, vise)}
              className="mt-4 h-2 rounded-full bg-white/[0.16]"
            >
              <div className="h-full rounded-full bg-primary-400" style={{ width: `${part}%` }} />
            </div>
            <div className="relative mt-4 flex items-center gap-2 text-sm font-bold">
              <button
                type="button"
                aria-label="Diminuer l'objectif"
                disabled={vise <= 1 || changerObjectif.isPending}
                onClick={() => changerObjectif.mutate(vise - 1)}
                className={BOUTON_OBJECTIF}
              >
                <Minus aria-hidden="true" className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Augmenter l'objectif"
                disabled={vise >= 50 || changerObjectif.isPending}
                onClick={() => changerObjectif.mutate(vise + 1)}
                className={BOUTON_OBJECTIF}
              >
                <Plus aria-hidden="true" className="size-4" />
              </button>
              <span>Changer l'objectif</span>
            </div>
            {changerObjectif.isError && (
              <p role="alert" className="relative mt-2 text-sm font-bold">
                L'objectif n'a pas pu être enregistré.
              </p>
            )}
          </section>

          <Bloc
            titre="Entretiens à venir"
            icone={<CalendarDays aria-hidden="true" className="size-5" />}
            teinte="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400"
          >
            {entretiens.length === 0 && (
              <p className={`text-sm ${SECONDAIRE}`}>Aucun entretien prévu.</p>
            )}
            {entretiens.map(({ candidature, entretien }) => {
              const visio = entretien.details.lien ? lienSur(entretien.details.lien) : null;
              return (
                <div key={entretien.id} className={LIGNE}>
                  <Link to={`/suivi?candidature=${candidature.id}`} className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">
                      {candidature.resume.entreprise ?? candidature.resume.titre}
                    </span>
                    <span className={`mt-0.5 block text-xs ${SECONDAIRE}`}>
                      {libelleEntretien(entretien.date, maintenant)}
                    </span>
                  </Link>
                  {visio && (
                    <a
                      href={visio}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-sm font-bold text-primary-700 underline underline-offset-2 dark:text-primary-400"
                    >
                      Rejoindre
                    </a>
                  )}
                </div>
              );
            })}
          </Bloc>

          <Bloc
            titre="Actions à faire"
            icone={<Bell aria-hidden="true" className="size-5" />}
            teinte="bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
          >
            {relances.length + aPostuler.length === 0 && (
              <p className={`text-sm ${SECONDAIRE}`}>Rien à faire pour l'instant.</p>
            )}
            {relances.map((candidature) => (
              <Link
                key={candidature.id}
                to={`/suivi?candidature=${candidature.id}`}
                className={LIGNE_ACTION}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">
                    Relancer {candidature.resume.entreprise ?? candidature.resume.titre}
                  </span>
                  <span className={`mt-0.5 block text-xs ${SECONDAIRE}`}>
                    {libelleRelance(candidature.prochaine_relance!, aujourdhui)}
                  </span>
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-gray-400 group-hover:text-current"
                />
              </Link>
            ))}
            {aPostuler.map((candidature) => (
              <Link
                key={candidature.id}
                to={`/suivi?candidature=${candidature.id}`}
                className={LIGNE_ACTION}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">
                    Postuler chez {candidature.resume.entreprise ?? candidature.resume.titre}
                  </span>
                  <span className={`mt-0.5 block truncate text-xs ${SECONDAIRE}`}>
                    {candidature.resume.titre}
                  </span>
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-gray-400 group-hover:text-current"
                />
              </Link>
            ))}
          </Bloc>

          <div className="md:col-span-2 xl:col-span-3">
            <Bloc
              titre="Nouvelles offres bien notées"
              icone={<Sparkles aria-hidden="true" className="size-5" />}
              teinte="bg-primary-50 text-primary-700 dark:bg-primary-400/15 dark:text-primary-400"
            >
              {nouvelles.length === 0 && (
                <p className={`text-sm ${SECONDAIRE}`}>
                  Aucune nouvelle offre notée {SCORE_A_SIGNALER} ou plus ces deux derniers jours.
                </p>
              )}
              {nouvelles.map((offre) => (
                <Link key={offre.id} to={`/?offre=${offre.id}`} className={LIGNE}>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">{offre.titre}</span>
                    <span className={`mt-0.5 flex items-center gap-1.5 text-xs ${SECONDAIRE}`}>
                      <Flag code={offre.pays} />
                      <span className="truncate">
                        {[offre.entreprise, lieu(offre)].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-extrabold text-primary-700 dark:text-primary-400">
                    {offre.score}
                  </span>
                </Link>
              ))}
            </Bloc>
          </div>
        </div>
      )}
    </>
  );
}
