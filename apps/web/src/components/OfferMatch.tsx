import { correspondance, MOTS_CLES_MINIMUM } from '@stageradar/shared';
import { FileText } from 'lucide-react';
import { Link } from 'react-router';
import { useProfilCv } from '../lib/cv';
import type { FeedOffer } from '../lib/offres';
import { BADGE, BOUTON_DOUX, CARTE, SECONDAIRE } from '../lib/ui';

const LIEN = 'self-center text-sm font-semibold text-primary-600 dark:text-primary-300';

/**
 * « Correspondance avec ton CV », dans la fiche d'une offre (maquette du 18 novembre 2026) : les
 * technologies citées par l'offre que le profil du CV mentionne ou non. Rien n'est ajouté au CV.
 */
export function OfferMatch({
  offre,
  description,
}: {
  offre: FeedOffer;
  /** `undefined` tant que la description n'est pas lue. */
  description: string | null | undefined;
}) {
  const profil = useProfilCv();
  const versCv = `/cv?offre=${offre.id}`;
  const resultat =
    profil.isSuccess && description !== undefined
      ? correspondance(profil.data, {
          titre: offre.titre,
          entreprise: offre.entreprise,
          description,
        })
      : null;

  let contenu;
  if (profil.isError) {
    contenu = (
      <p role="alert" className="text-sm font-semibold text-red-700 dark:text-red-400">
        Ton profil n’a pas pu être lu. Vérifie ta connexion.
      </p>
    );
  } else if (!resultat) {
    contenu = <p className={`text-sm ${SECONDAIRE}`}>Comparaison…</p>;
  } else {
    if (resultat.etat === 'profil_vide') {
      contenu = (
        <>
          <p className="font-semibold">Remplis ton profil pour comparer</p>
          <p className={`text-sm ${SECONDAIRE}`}>
            Ajoute au moins tes compétences et une formation.
          </p>
          <Link to="/cv?onglet=profil" className={`text-center ${BOUTON_DOUX}`}>
            Ouvrir mon profil
          </Link>
        </>
      );
    } else if (resultat.etat === 'trop_peu') {
      contenu = (
        <>
          <p className="font-semibold">L’annonce ne donne pas assez de détails</p>
          <p className={`text-sm ${SECONDAIRE}`}>
            Moins de {MOTS_CLES_MINIMUM} mots-clés trouvés : la comparaison ne serait pas fiable.
          </p>
          <Link to={versCv} className={LIEN}>
            Créer le CV pour cette offre
          </Link>
        </>
      );
    } else {
      contenu = (
        <>
          <div className="flex flex-col gap-1.5">
            <span className={`text-[0.8125rem] font-semibold ${SECONDAIRE}`}>Dans ton profil</span>
            {resultat.presentes.length > 0 ? (
              <ul className="flex flex-wrap gap-1.5">
                {resultat.presentes.map((terme) => (
                  <li key={terme} className={BADGE.vert}>
                    {terme}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={`text-sm ${SECONDAIRE}`}>Aucune des technologies citées.</p>
            )}
          </div>
          {resultat.absentes.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className={`text-[0.8125rem] font-semibold ${SECONDAIRE}`}>
                Absents de ton profil
              </span>
              <ul className="flex flex-wrap gap-1.5">
                {resultat.absentes.map((terme) => (
                  <li key={terme} className={BADGE.neutre}>
                    {terme}
                  </li>
                ))}
              </ul>
              <p className={`text-xs ${SECONDAIRE}`}>
                Tu en maîtrises un ? Ajoute-le à ton profil : le CV ne l’ajoute jamais tout seul.
              </p>
            </div>
          )}
          <Link
            to={versCv}
            className={`flex min-h-12 items-center justify-center gap-2 ${BOUTON_DOUX}`}
          >
            <FileText aria-hidden="true" className="size-[1.125rem]" strokeWidth={1.8} />
            Créer le CV pour cette offre
          </Link>
        </>
      );
    }
  }

  return (
    <section aria-labelledby="titre-correspondance" className={`flex flex-col gap-3.5 ${CARTE}`}>
      <div className="flex items-center justify-between gap-2.5">
        <h2 id="titre-correspondance" className="text-lg font-bold">
          Correspondance avec ton CV
        </h2>
        {resultat?.etat === 'ok' && (
          <span
            className={`shrink-0 rounded-full px-3 py-1.5 text-base font-extrabold whitespace-nowrap ${
              resultat.pourcent >= 60
                ? 'bg-vert-50 text-vert-700 dark:bg-vert-500/20 dark:text-vert-50'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200'
            }`}
          >
            {resultat.pourcent} %
          </span>
        )}
      </div>
      {contenu}
    </section>
  );
}
