import {
  LIBELLES_PAYS,
  lireAlerte,
  rechercheIndeed,
  rechercheLinkedin,
  type OffreAlerte,
} from '@stageradar/shared';
import { useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Mail, Share2, Search } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { appelerApi, type ResultatImport } from '../lib/api';
import { BADGE, BOUTON_PRINCIPAL, BOUTON_SECONDAIRE, CARTE, CHAMP, SECONDAIRE } from '../lib/ui';

const DOMAINES: { id: string; libelle: string; motsCles: string }[] = [
  { id: 'dev', libelle: 'Développement', motsCles: 'software engineer intern' },
  { id: 'cyber', libelle: 'Cybersécurité', motsCles: 'security intern' },
  { id: 'devops', libelle: 'DevOps / cloud', motsCles: 'devops intern' },
];
const PAYS_RECHERCHE = ['FR', 'JP', 'KR', 'CO', 'CA', 'GB'] as const;
const VILLES: Record<(typeof PAYS_RECHERCHE)[number], string> = {
  FR: 'France',
  JP: 'Japan',
  KR: 'South Korea',
  CO: 'Colombia',
  CA: 'Canada',
  GB: 'London',
};

type Ligne = OffreAlerte & { choisie: boolean; titreSaisi: string };

/**
 * LinkedIn et Indeed (maquette du 18 novembre 2026). Ces sites ne donnent pas d'accès automatique
 * gratuit à leurs offres et le cahier des charges interdit d'aspirer leurs pages : leurs offres
 * entrent par leurs alertes e-mail, collées ici, par le partage depuis le téléphone, ou par des
 * recherches prêtes ouvertes chez eux.
 */
export function LinkedinIndeed() {
  const client = useQueryClient();
  const [contenu, setContenu] = useState('');
  const [lignes, setLignes] = useState<Ligne[] | null>(null);
  const [envoi, setEnvoi] = useState<{ faites: number; nouvelles: number; erreurs: number } | null>(
    null,
  );
  const [enCours, setEnCours] = useState(false);
  const [domaine, setDomaine] = useState(DOMAINES[0]!.id);
  const [pays, setPays] = useState<(typeof PAYS_RECHERCHE)[number]>('JP');
  const [alternance, setAlternance] = useState(false);

  const choisi = DOMAINES.find((autre) => autre.id === domaine)!;
  const motsCles =
    pays === 'FR'
      ? `${alternance ? 'alternance' : 'stage'} ${choisi.libelle.toLowerCase()}`
      : choisi.motsCles;

  function reperer() {
    setEnvoi(null);
    setLignes(
      lireAlerte(contenu).map((offre) => ({
        ...offre,
        choisie: true,
        titreSaisi: offre.titre ?? '',
      })),
    );
  }

  async function importer() {
    const choisies = (lignes ?? []).filter((ligne) => ligne.choisie);
    setEnCours(true);
    let nouvelles = 0;
    let erreurs = 0;
    for (const ligne of choisies) {
      try {
        const resultat = await appelerApi<ResultatImport>('/importer', {
          url: ligne.url,
          titre: ligne.titreSaisi.trim() || null,
          texte: ligne.contexte.join('\n') || null,
        });
        if (resultat.nouvelle) nouvelles += 1;
      } catch {
        erreurs += 1;
      }
    }
    setEnCours(false);
    setEnvoi({ faites: choisies.length - erreurs, nouvelles, erreurs });
    setLignes(null);
    setContenu('');
    void client.invalidateQueries({ queryKey: ['offers'] });
  }

  return (
    <section aria-labelledby="titre-linkedin-indeed" className={`flex flex-col gap-5 ${CARTE}`}>
      <div className="flex flex-col gap-1">
        <h2 id="titre-linkedin-indeed" className="text-lg font-bold">
          LinkedIn et Indeed
        </h2>
        <p className={`text-sm ${SECONDAIRE}`}>
          Ces sites ne donnent pas d’accès automatique gratuit à leurs offres, et le cahier des
          charges interdit d’aspirer leurs pages. Leurs offres entrent donc de trois façons, toutes
          gratuites ; une offre importée ainsi porte la pastille de son site dans le fil.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="flex items-center gap-2 font-bold">
          <Mail aria-hidden="true" className="size-[1.125rem]" strokeWidth={1.8} />
          1. Coller une alerte e-mail
        </h3>
        <ol className={`list-decimal space-y-1 pl-5 text-sm ${SECONDAIRE}`}>
          <li>Crée une alerte sur LinkedIn ou Indeed avec une recherche prête (point 3).</li>
          <li>
            Quand une alerte arrive dans Gmail : « ⋮ » puis « Afficher l’original », puis « Copier
            dans le presse-papiers ». Le texte affiché de l’e-mail marche aussi s’il contient les
            liens.
          </li>
          <li>Colle-la ici : les offres repérées s’affichent avant d’être importées.</li>
        </ol>
        <label className="text-sm font-semibold">
          Contenu de l’alerte
          <textarea
            rows={5}
            value={contenu}
            onChange={(evenement) => setContenu(evenement.target.value)}
            className={`${CHAMP} font-mono text-xs`}
          />
        </label>
        <button
          type="button"
          disabled={!contenu.trim()}
          onClick={reperer}
          className={`self-start ${BOUTON_SECONDAIRE}`}
        >
          Repérer les offres
        </button>
        {lignes && lignes.length === 0 && (
          <p role="status" className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            Aucun lien d’offre LinkedIn ou Indeed trouvé. Essaie « Afficher l’original » : le texte
            affiché ne contient pas toujours les liens.
          </p>
        )}
        {lignes && lignes.length > 0 && (
          <div className="flex flex-col gap-2">
            <p role="status" className="text-sm font-semibold">
              {lignes.length} offre{lignes.length > 1 ? 's' : ''} repérée
              {lignes.length > 1 ? 's' : ''}. Vérifie les titres avant d’importer.
            </p>
            <ul className="flex flex-col gap-2">
              {lignes.map((ligne, rang) => (
                <li
                  key={ligne.url}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-800"
                >
                  <input
                    type="checkbox"
                    aria-label={`Importer ${ligne.titreSaisi || ligne.url}`}
                    checked={ligne.choisie}
                    onChange={(evenement) =>
                      setLignes(
                        lignes.map((autre, i) =>
                          i === rang ? { ...autre, choisie: evenement.target.checked } : autre,
                        ),
                      )
                    }
                    className="size-5 accent-primary-600"
                  />
                  <span className={ligne.source === 'linkedin' ? BADGE.bleu : BADGE.violet}>
                    {ligne.source === 'linkedin' ? 'LinkedIn' : 'Indeed'}
                  </span>
                  <label className="min-w-0 flex-[1_1_14rem] text-sm">
                    <span className="sr-only">Titre de l’offre</span>
                    <input
                      value={ligne.titreSaisi}
                      placeholder="Titre de l’offre"
                      onChange={(evenement) =>
                        setLignes(
                          lignes.map((autre, i) =>
                            i === rang ? { ...autre, titreSaisi: evenement.target.value } : autre,
                          ),
                        )
                      }
                      className={`${CHAMP} mt-0`}
                    />
                  </label>
                  {ligne.contexte.length > 0 && (
                    <span className={`basis-full text-xs ${SECONDAIRE}`}>
                      {ligne.contexte.join(' · ')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <button
              type="button"
              disabled={enCours || !lignes.some((ligne) => ligne.choisie)}
              onClick={() => void importer()}
              className={`self-start ${BOUTON_PRINCIPAL}`}
            >
              {enCours
                ? 'Import…'
                : `Importer ${lignes.filter((ligne) => ligne.choisie).length} offre${
                    lignes.filter((ligne) => ligne.choisie).length > 1 ? 's' : ''
                  }`}
            </button>
          </div>
        )}
        {envoi && (
          <p
            role="status"
            className={`text-sm font-semibold ${
              envoi.erreurs > 0
                ? 'text-red-700 dark:text-red-400'
                : 'text-vert-700 dark:text-vert-50'
            }`}
          >
            {envoi.faites} offre{envoi.faites > 1 ? 's' : ''} importée{envoi.faites > 1 ? 's' : ''}
            {envoi.nouvelles < envoi.faites
              ? `, dont ${envoi.nouvelles} nouvelle${envoi.nouvelles > 1 ? 's' : ''}`
              : ''}
            {envoi.erreurs > 0
              ? ` ; ${envoi.erreurs} n’ont pas pu l’être, vérifie ta connexion.`
              : '.'}{' '}
            <Link to="/" className="underline underline-offset-2">
              Voir le fil
            </Link>
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="flex items-center gap-2 font-bold">
          <Share2 aria-hidden="true" className="size-[1.125rem]" strokeWidth={1.8} />
          2. Partager depuis l’application du téléphone
        </h3>
        <p className={`text-sm ${SECONDAIRE}`}>
          Dans l’application LinkedIn ou Indeed : « Partager », puis « StageRadar ». L’offre arrive
          dans{' '}
          <Link to="/importer" className="font-semibold text-primary-600 dark:text-primary-300">
            Importer une offre
          </Link>
          .
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="flex items-center gap-2 font-bold">
          <Search aria-hidden="true" className="size-[1.125rem]" strokeWidth={1.8} />
          3. Recherches prêtes, pour créer tes alertes
        </h3>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm font-semibold">
            Domaine
            <select
              value={domaine}
              onChange={(evenement) => setDomaine(evenement.target.value)}
              className={CHAMP}
            >
              {DOMAINES.map((autre) => (
                <option key={autre.id} value={autre.id}>
                  {autre.libelle}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold">
            Lieu
            <select
              value={pays}
              onChange={(evenement) =>
                setPays(evenement.target.value as (typeof PAYS_RECHERCHE)[number])
              }
              className={CHAMP}
            >
              {PAYS_RECHERCHE.map((code) => (
                <option key={code} value={code}>
                  {code === 'GB' ? 'Londres' : LIBELLES_PAYS[code]}
                </option>
              ))}
            </select>
          </label>
          {pays === 'FR' && (
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={alternance}
                onChange={(evenement) => setAlternance(evenement.target.checked)}
                className="size-4 accent-primary-600"
              />
              Alternance plutôt que stage
            </label>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={rechercheLinkedin(motsCles, VILLES[pays])}
            target="_blank"
            rel="noreferrer"
            className={`inline-flex items-center gap-1.5 ${BOUTON_SECONDAIRE}`}
          >
            LinkedIn : « {motsCles} » <ExternalLink aria-hidden="true" className="size-3.5" />
          </a>
          <a
            href={rechercheIndeed(pays, motsCles, VILLES[pays])}
            target="_blank"
            rel="noreferrer"
            className={`inline-flex items-center gap-1.5 ${BOUTON_SECONDAIRE}`}
          >
            Indeed : « {motsCles} » <ExternalLink aria-hidden="true" className="size-3.5" />
          </a>
        </div>
        <p className={`text-xs ${SECONDAIRE}`}>
          Sur la page ouverte, active l’alerte e-mail du site. Le format de l’adresse Indeed n’a pas
          pu être vérifié automatiquement (Indeed refuse la lecture par un robot) : si la recherche
          est vide, retape-la sur Indeed.
        </p>
      </div>

      <p className="rounded-xl bg-[#f0f2f7] px-3.5 py-2.5 text-sm text-gray-700 dark:bg-gray-850 dark:text-gray-300">
        Plus tard : StageRadar pourra lire ces alertes directement dans Gmail, en lecture seule. Il
        faudra pour cela un accès que tu crées toi-même dans ton compte Google ; rien n’est activé
        pour l’instant.
      </p>
    </section>
  );
}
