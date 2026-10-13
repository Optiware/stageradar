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

const LIGNE =
  'group flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-3 transition hover:border-primary-400 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-primary-500';
const BOUTON_OBJECTIF =
  'flex size-9 items-center justify-center rounded-full bg-gray-950/10 transition hover:bg-gray-950/20 disabled:opacity-40';

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
      <h1 className="text-2xl font-extrabold tracking-tight">Important</h1>

      {(candidatures.isError || offres.isError) && (
        <p role="alert" className="mt-4 font-bold text-red-700 dark:text-red-400">
          Certaines données n'ont pas pu être chargées. Vérifie ta connexion.
        </p>
      )}
      {candidatures.isPending && (
        <p className="mt-8 text-gray-600 dark:text-gray-400">Chargement…</p>
      )}

      {candidatures.isSuccess && (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <section
            aria-label="Objectif de la semaine"
            className="relative overflow-hidden rounded-3xl bg-primary-500 p-6 text-gray-950 shadow-md"
          >
            <Target
              aria-hidden="true"
              className="absolute -right-4 -bottom-4 size-32 opacity-15"
              strokeWidth={1.5}
            />
            <h2 className="font-bold text-primary-900">Objectif de la semaine</h2>
            <p className="mt-1 text-4xl font-extrabold">
              {envoyees} <span className="text-2xl font-bold text-primary-900">/ {vise}</span>
            </p>
            <p className="text-sm font-bold text-primary-900">
              {envoyees > 1 ? 'candidatures envoyées' : 'candidature envoyée'} depuis lundi
            </p>
            <div
              role="progressbar"
              aria-label="Avancement de l'objectif"
              aria-valuemin={0}
              aria-valuemax={vise}
              aria-valuenow={Math.min(envoyees, vise)}
              className="mt-4 h-2 rounded-full bg-primary-600"
            >
              <div className="h-full rounded-full bg-white" style={{ width: `${part}%` }} />
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
            teinte="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
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
            teinte="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          >
            {relances.length + aPostuler.length === 0 && (
              <p className={`text-sm ${SECONDAIRE}`}>Rien à faire pour l'instant.</p>
            )}
            {relances.map((candidature) => (
              <Link
                key={candidature.id}
                to={`/suivi?candidature=${candidature.id}`}
                className={LIGNE}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">
                    Relancer {candidature.resume.entreprise ?? candidature.resume.titre}
                  </span>
                  <span className={`mt-0.5 block text-xs ${SECONDAIRE}`}>
                    {libelleRelance(candidature.prochaine_relance!, aujourdhui)}
                  </span>
                </span>
                <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-gray-400" />
              </Link>
            ))}
            {aPostuler.map((candidature) => (
              <Link
                key={candidature.id}
                to={`/suivi?candidature=${candidature.id}`}
                className={LIGNE}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">
                    Postuler chez {candidature.resume.entreprise ?? candidature.resume.titre}
                  </span>
                  <span className={`mt-0.5 block truncate text-xs ${SECONDAIRE}`}>
                    {candidature.resume.titre}
                  </span>
                </span>
                <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-gray-400" />
              </Link>
            ))}
          </Bloc>

          <div className="md:col-span-2 xl:col-span-3">
            <Bloc
              titre="Nouvelles offres bien notées"
              icone={<Sparkles aria-hidden="true" className="size-5" />}
              teinte="bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400"
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
