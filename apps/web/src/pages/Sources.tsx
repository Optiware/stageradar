import { PAYS_STAGE } from '@stageradar/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { Link } from 'react-router';
import { Flag } from '../components/Flag';
import { appelerApi, type BilanCollecte } from '../lib/api';
import { RECHERCHES_STAGE, SITES_ALTERNANCE } from '../lib/liens-recherche';
import { nomPays, nomSource } from '../lib/offres';
import { supabase } from '../lib/supabase';
import { BADGE, BOUTON_SECONDAIRE, CARTE, SECONDAIRE } from '../lib/ui';

interface Passage {
  source: string;
  debut: string;
  statut: 'ok' | 'partiel' | 'erreur';
  nb_offres: number;
  nb_nouvelles: number;
  erreurs: unknown[];
}

const LIEN = 'font-bold text-primary-700 underline underline-offset-2 dark:text-primary-400';
const LIBELLES_STATUT = { ok: 'Fonctionne', partiel: 'Partiel', erreur: 'En erreur' } as const;
const BADGES_STATUT = { ok: BADGE.vert, partiel: BADGE.ambre, erreur: BADGE.rouge } as const;

function quand(dateIso: string): string {
  return new Date(dateIso).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** État de la collecte automatique, et sites à consulter à la main. */
export function Sources() {
  // Les passages les plus récents d'abord : le premier de chaque source est son dernier état.
  const passages = useQuery({
    queryKey: ['sources_status'],
    queryFn: async () => {
      const { data, error } = await supabase!
        .from('sources_status')
        .select('source,debut,statut,nb_offres,nb_nouvelles,erreurs')
        .order('debut', { ascending: false })
        .limit(400)
        .overrideTypes<Passage[], { merge: false }>();
      if (error) throw error;
      return data;
    },
  });

  const client = useQueryClient();
  const collecter = useMutation({
    mutationFn: () => appelerApi<BilanCollecte>('/collecter'),
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: ['sources_status'] }),
        client.invalidateQueries({ queryKey: ['offers'] }),
      ]),
  });

  const derniers = new Map<string, Passage>();
  for (const passage of passages.data ?? []) {
    if (!derniers.has(passage.source)) derniers.set(passage.source, passage);
  }
  const sources = [...derniers.values()].sort((a, b) => a.source.localeCompare(b.source));
  const enErreur = sources.filter((source) => source.statut !== 'ok').length;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-extrabold tracking-tight">Sources</h1>

      <section aria-label="Collecte automatique" className={`mt-6 ${CARTE}`}>
        <h2 className="font-bold">Collecte automatique</h2>
        <p className={`mt-1 text-sm ${SECONDAIRE}`}>
          Sites carrières des entreprises, TokyoDev et Japan Dev, lus toutes les six heures. Seuls
          les stages dans tes pays et les alternances en France sont gardés.
        </p>
        <button
          type="button"
          disabled={collecter.isPending}
          onClick={() => collecter.mutate()}
          className={`mt-3 flex items-center gap-2 ${BOUTON_SECONDAIRE}`}
        >
          <RefreshCw
            aria-hidden="true"
            className={`size-4 ${collecter.isPending ? 'animate-spin' : ''}`}
          />
          {collecter.isPending ? 'Collecte en cours…' : 'Lancer une collecte maintenant'}
        </button>
        {collecter.isPending && (
          <p role="status" className={`mt-2 text-sm ${SECONDAIRE}`}>
            Lecture de tous les sites : compte une à deux minutes. Tu peux quitter cet écran.
          </p>
        )}
        {collecter.isSuccess && (
          <p
            role="status"
            className="mt-2 text-sm font-bold text-primary-700 dark:text-primary-400"
          >
            Collecte terminée : {collecter.data.lues} annonces lues, {collecter.data.retenues}{' '}
            offres dans ta cible, dont {collecter.data.nouvelles} nouvelles
            {collecter.data.en_erreur > 0 ? ` ; ${collecter.data.en_erreur} sources en erreur` : ''}
            .
          </p>
        )}
        {collecter.isError && (
          <p role="alert" className="mt-2 text-sm font-bold text-red-700 dark:text-red-400">
            La collecte n'a pas pu être lancée. Réessaie dans un instant.
          </p>
        )}
        {passages.isPending && <p className={`mt-4 text-sm ${SECONDAIRE}`}>Chargement…</p>}
        {passages.isError && (
          <p role="alert" className="mt-4 text-sm font-bold text-red-700 dark:text-red-400">
            L'état des sources n'a pas pu être chargé.
          </p>
        )}
        {passages.isSuccess && sources.length === 0 && (
          <p className={`mt-4 text-sm ${SECONDAIRE}`}>Aucune collecte n'a encore tourné.</p>
        )}
        {sources.length > 0 && (
          <>
            <p className="mt-4 text-sm font-bold">
              {sources.length} sources
              {enErreur > 0 ? `, dont ${enErreur} à regarder` : ', toutes en état de marche'}
            </p>
            <ul className="mt-3 divide-y divide-gray-200 text-sm dark:divide-gray-800">
              {sources.map((source) => (
                <li key={source.source} className="py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold break-all">
                      {source.source.split(':')[1] ?? source.source}{' '}
                      <span className={`font-medium ${SECONDAIRE}`}>
                        ({nomSource(source.source)})
                      </span>
                    </span>
                    <span className={BADGES_STATUT[source.statut]}>
                      {LIBELLES_STATUT[source.statut]}
                    </span>
                  </div>
                  <p className={`mt-0.5 ${SECONDAIRE}`}>
                    {quand(source.debut)} · {source.nb_offres} annonces lues, {source.nb_nouvelles}{' '}
                    nouvelles offres gardées
                  </p>
                  {source.erreurs.length > 0 && (
                    <p className="mt-0.5 break-words text-red-700 dark:text-red-400">
                      {typeof source.erreurs[0] === 'string'
                        ? source.erreurs[0]
                        : JSON.stringify(source.erreurs[0])}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section aria-label="Sites à consulter à la main" className={`mt-4 ${CARTE}`}>
        <h2 className="font-bold">Sites à consulter à la main</h2>
        <p className={`mt-1 text-sm ${SECONDAIRE}`}>
          Ces sites interdisent la collecte automatique ou n'offrent pas d'accès prévu pour cela :
          la recherche s'ouvre chez eux. D'autres pistes par pays (programmes, laboratoires, sites
          locaux) sont dans les{' '}
          <Link to="/pays" className={LIEN}>
            fiches pays
          </Link>
          .
        </p>
        <ul className="mt-4 space-y-3 text-sm">
          {PAYS_STAGE.filter((pays) => RECHERCHES_STAGE[pays]).map((pays) => (
            <li key={pays} className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="flex w-36 shrink-0 items-center gap-1.5 font-bold">
                <Flag code={pays} />
                {nomPays(pays)}
              </span>
              {RECHERCHES_STAGE[pays]!.map((lien) => (
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
          {SITES_ALTERNANCE.map(({ site, recherches }) => (
            <li key={site} className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="flex w-36 shrink-0 items-center gap-1.5 font-bold">
                <Flag code="FR" />
                Alternance
              </span>
              {recherches.map((lien) => (
                <a
                  key={lien.url}
                  href={lien.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={LIEN}
                >
                  {site} : {lien.libelle}
                </a>
              ))}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
