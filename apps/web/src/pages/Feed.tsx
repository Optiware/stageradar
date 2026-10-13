import { LIBELLES_PAYS, type Domaine, type PaysStage, type StoredOffer } from '@stageradar/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '../lib/supabase';

type FeedOffer = Pick<
  StoredOffer,
  | 'id'
  | 'titre'
  | 'entreprise'
  | 'pays'
  | 'ville'
  | 'type'
  | 'domaines'
  | 'score'
  | 'score_details'
  | 'exclue_raison'
  | 'periode_compatible'
  | 'langues_requises'
  | 'url'
  | 'date_publication'
> & { created_at: string };

const COLONNES =
  'id,titre,entreprise,pays,ville,type,domaines,score,score_details,exclue_raison,' +
  'periode_compatible,langues_requises,url,date_publication,created_at';

const ONGLETS = [
  { id: 'alternance', libelle: 'Alternance' },
  { id: 'stage', libelle: 'Stage été' },
  { id: 'tout', libelle: 'Tout' },
] as const;
type Onglet = (typeof ONGLETS)[number]['id'];

const LIBELLES_DOMAINE: Record<Domaine, string> = { dev: 'Dev', cyber: 'Cyber', devops: 'DevOps' };
const LIBELLES_LANGUE: Record<string, string> = { ja: 'Japonais', ko: 'Coréen', es: 'Espagnol' };

/** Une offre est « nouvelle » pendant les deux jours qui suivent sa première collecte (âge au chargement). */
const NOUVEAU_MS = 48 * 3600 * 1000;

function dansOnglet(offre: FeedOffer, onglet: Onglet): boolean {
  if (onglet === 'tout') return true;
  if (onglet === 'alternance') return offre.type === 'alternance';
  return offre.type === 'stage' && offre.periode_compatible !== false;
}

function couleurScore(score: number): string {
  if (score >= 75) return 'bg-accent-700 text-white';
  if (score >= 50) return 'bg-amber-500 text-slate-950';
  return 'bg-slate-300 text-slate-900 dark:bg-slate-700 dark:text-slate-100';
}

/** Les adresses viennent de sources extérieures : seul un lien web ordinaire est rendu cliquable. */
function lienSur(url: string): string | null {
  const debut = url.slice(0, 8).toLowerCase();
  return debut.startsWith('https://') || debut.startsWith('http://') ? url : null;
}

function lieu(offre: FeedOffer): string {
  const pays = offre.pays ? (LIBELLES_PAYS[offre.pays as PaysStage | 'FR'] ?? offre.pays) : null;
  return [offre.ville, pays].filter(Boolean).join(', ');
}

export function Feed() {
  const [onglet, setOnglet] = useState<Onglet>('tout');
  const [avecMasquees, setAvecMasquees] = useState(false);

  // Mono-utilisateur, quelques centaines d'offres au plus : tout est chargé d'un coup,
  // et les onglets filtrent sur place, sans nouvel appel.
  const offres = useQuery({
    queryKey: ['offers', 'feed'],
    queryFn: async () => {
      const { data, error } = await supabase!
        .from('offers')
        .select(COLONNES)
        .eq('actif', true)
        .eq('masquee', false)
        .order('score', { ascending: false })
        .order('date_publication', { ascending: false, nullsFirst: false })
        .limit(500)
        .overrideTypes<FeedOffer[], { merge: false }>();
      if (error) throw error;
      return data;
    },
  });

  const toutes = offres.data ?? [];
  const visibles = toutes.filter((offre) => avecMasquees || offre.exclue_raison === null);
  const affichees = visibles.filter((offre) => dansOnglet(offre, onglet));
  const nbMasquees = toutes.filter((offre) => offre.exclue_raison !== null).length;

  return (
    <>
      <h1 className="text-2xl font-semibold">Fil</h1>

      <div role="tablist" aria-label="Type d'offre" className="mt-4 flex gap-2">
        {ONGLETS.map(({ id, libelle }) => {
          const actif = id === onglet;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={actif}
              onClick={() => setOnglet(id)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
                actif
                  ? 'bg-accent-700 text-white'
                  : 'border border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'
              }`}
            >
              {libelle}{' '}
              <span className={actif ? 'opacity-80' : 'text-slate-500 dark:text-slate-400'}>
                {visibles.filter((offre) => dansOnglet(offre, id)).length}
              </span>
            </button>
          );
        })}
      </div>

      {nbMasquees > 0 && (
        <label className="mt-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={avecMasquees}
            onChange={(event) => setAvecMasquees(event.target.checked)}
            className="size-4 accent-accent-700"
          />
          Afficher aussi les {nbMasquees} offres hors cible
        </label>
      )}

      {offres.isPending && (
        <p className="mt-8 text-slate-600 dark:text-slate-300">Chargement des offres…</p>
      )}
      {offres.isError && (
        <p role="alert" className="mt-8 text-red-700 dark:text-red-400">
          Les offres n'ont pas pu être chargées. Vérifie ta connexion.
        </p>
      )}
      {offres.isSuccess && affichees.length === 0 && (
        <p className="mt-8 text-slate-600 dark:text-slate-300">
          {toutes.length === 0
            ? 'Aucune offre pour le moment. La collecte tourne toutes les 6 heures.'
            : 'Aucune offre dans cet onglet.'}
        </p>
      )}

      <ul className="mt-4 grid gap-3 lg:grid-cols-2">
        {affichees.map((offre) => (
          <li
            key={offre.id}
            className={`rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 ${
              offre.exclue_raison ? 'opacity-70' : ''
            }`}
          >
            <article aria-label={offre.titre}>
              <div className="flex items-start gap-3">
                <span
                  aria-label={`Score ${offre.score ?? 0} sur 100`}
                  className={`flex size-11 shrink-0 items-center justify-center rounded-lg text-base font-semibold ${couleurScore(offre.score ?? 0)}`}
                >
                  {offre.score ?? 0}
                </span>
                <div className="min-w-0">
                  <h2 className="leading-snug font-medium break-words">{offre.titre}</h2>
                  <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
                    {[offre.entreprise, lieu(offre)].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>

              <ul className="mt-3 flex flex-wrap gap-1.5 text-xs">
                {offres.dataUpdatedAt - new Date(offre.created_at).getTime() < NOUVEAU_MS && (
                  <li className="rounded-full bg-accent-100 px-2 py-0.5 font-medium text-accent-900 dark:bg-accent-900/50 dark:text-accent-100">
                    Nouveau
                  </li>
                )}
                {offre.domaines.map((domaine) => (
                  <li
                    key={domaine}
                    className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800"
                  >
                    {LIBELLES_DOMAINE[domaine]}
                  </li>
                ))}
                {offre.langues_requises
                  .filter((langue) => LIBELLES_LANGUE[langue])
                  .map((langue) => (
                    <li
                      key={langue}
                      className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
                    >
                      {LIBELLES_LANGUE[langue]} exigé
                    </li>
                  ))}
                {offre.exclue_raison && (
                  <li className="rounded-full bg-red-100 px-2 py-0.5 text-red-900 dark:bg-red-900/40 dark:text-red-100">
                    {offre.exclue_raison}
                  </li>
                )}
              </ul>

              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-slate-600 dark:text-slate-300">
                  Détail du score
                </summary>
                <ul className="mt-2 space-y-1">
                  {offre.score_details.map((detail) => (
                    <li key={detail.critere} className="flex gap-2">
                      <span className="w-14 shrink-0 text-right font-mono tabular-nums">
                        {detail.points > 0 ? '+' : ''}
                        {detail.points}/{detail.max}
                      </span>
                      <span>{detail.libelle}</span>
                    </li>
                  ))}
                </ul>
              </details>

              {lienSur(offre.url) && (
                <a
                  href={lienSur(offre.url)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  Voir l'offre
                </a>
              )}
            </article>
          </li>
        ))}
      </ul>
    </>
  );
}
