import { completude, projetsAFaire } from '@stageradar/shared';
import { Check, Circle, FolderPlus, ImagePlus, Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import {
  PROJET_VIDE,
  reduireImage,
  useEnregistrerProjet,
  useProjets,
  useSupprimerProjet,
  useTechnologiesDemandees,
  type ChampsProjet,
  type Projet,
} from '../lib/portfolio';
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

const TITRE_SECTION = 'text-xl font-bold';

/** N'affiche en lien que les adresses web : un `javascript:` collé ne doit jamais s'exécuter. */
function lienSur(adresse: string | null): string | null {
  if (!adresse?.trim()) return null;
  try {
    const url = new URL(adresse.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

function Formulaire({
  projet,
  initial,
  onFermer,
}: {
  projet: Projet | null;
  initial: ChampsProjet;
  onFermer: () => void;
}) {
  const [champs, setChamps] = useState<ChampsProjet>(initial);
  const [technologies, setTechnologies] = useState(initial.technologies.join(', '));
  const [erreurImage, setErreurImage] = useState<string | null>(null);
  const [suppressionDemandee, setSuppressionDemandee] = useState(false);
  const enregistrer = useEnregistrerProjet();
  const supprimer = useSupprimerProjet();

  function changer<K extends keyof ChampsProjet>(cle: K, valeur: ChampsProjet[K]) {
    setChamps((avant) => ({ ...avant, [cle]: valeur }));
  }

  async function choisirImage(fichier: File | undefined) {
    if (!fichier) return;
    setErreurImage(null);
    try {
      const image = await reduireImage(fichier);
      if (image.length > 400_000) throw new Error('trop grande');
      changer('image', image);
    } catch {
      setErreurImage('Cette image n’a pas pu être réduite. Essaie une capture plus petite.');
    }
  }

  function envoyer(evenement: FormEvent) {
    evenement.preventDefault();
    const valeurs: ChampsProjet = {
      ...champs,
      titre: champs.titre.trim(),
      technologies: technologies
        .split(',')
        .map((technologie) => technologie.trim())
        .filter(Boolean),
      url_code: champs.url_code?.trim() || null,
      url_demo: champs.url_demo?.trim() || null,
    };
    enregistrer.mutate({ id: projet?.id, champs: valeurs }, { onSuccess: onFermer });
  }

  return (
    <form
      onSubmit={envoyer}
      aria-labelledby="titre-formulaire-projet"
      className={`flex flex-col gap-4 ${CARTE}`}
    >
      <h2 id="titre-formulaire-projet" className={TITRE_SECTION}>
        {projet ? `Modifier « ${projet.titre} »` : 'Nouveau projet'}
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold">
          Titre
          <input
            required
            maxLength={200}
            value={champs.titre}
            onChange={(evenement) => changer('titre', evenement.target.value)}
            className={CHAMP}
          />
        </label>
        <fieldset>
          <legend className="text-sm font-semibold">État</legend>
          <div className="mt-1.5 flex gap-2">
            {(
              [
                ['en_cours', 'En cours'],
                ['termine', 'Terminé'],
              ] as const
            ).map(([valeur, libelle]) => (
              <button
                key={valeur}
                type="button"
                aria-pressed={champs.statut === valeur}
                onClick={() => changer('statut', valeur)}
                className={pilule(champs.statut === valeur)}
              >
                {libelle}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
      <label className="text-sm font-semibold">
        Description, en une ou deux phrases
        <textarea
          rows={2}
          value={champs.description}
          onChange={(evenement) => changer('description', evenement.target.value)}
          className={CHAMP}
        />
      </label>
      <label className="text-sm font-semibold">
        Technologies, séparées par des virgules
        <input
          value={technologies}
          onChange={(evenement) => setTechnologies(evenement.target.value)}
          placeholder="React, TypeScript, PostgreSQL"
          className={CHAMP}
        />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold">
          Lien du code (GitHub…)
          <input
            type="url"
            value={champs.url_code ?? ''}
            onChange={(evenement) => changer('url_code', evenement.target.value)}
            placeholder="https://github.com/…"
            className={CHAMP}
          />
        </label>
        <label className="text-sm font-semibold">
          Lien de la démo en ligne
          <input
            type="url"
            value={champs.url_demo ?? ''}
            onChange={(evenement) => changer('url_demo', evenement.target.value)}
            placeholder="https://…"
            className={CHAMP}
          />
        </label>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold">Capture</span>
        <div className="flex flex-wrap items-center gap-3">
          {champs.image && (
            <img
              src={champs.image}
              alt="Capture du projet"
              className="h-24 rounded-xl border border-gray-200 object-cover dark:border-gray-800"
            />
          )}
          <label className={`inline-flex cursor-pointer items-center gap-2 ${BOUTON_DOUX}`}>
            <ImagePlus aria-hidden="true" className="size-4" strokeWidth={1.8} />
            {champs.image ? 'Changer la capture' : 'Choisir une capture'}
            <input
              type="file"
              accept="image/*"
              onChange={(evenement) => void choisirImage(evenement.target.files?.[0])}
              className="sr-only"
            />
          </label>
          {champs.image && (
            <button
              type="button"
              onClick={() => changer('image', null)}
              className="text-sm font-medium text-primary-600 underline underline-offset-2 dark:text-primary-300"
            >
              Retirer
            </button>
          )}
        </div>
        {erreurImage && (
          <p role="alert" className="text-sm font-semibold text-red-700 dark:text-red-400">
            {erreurImage}
          </p>
        )}
      </div>
      <label className="text-sm font-semibold">
        Ce que j’ai appris
        <textarea
          rows={2}
          value={champs.appris}
          onChange={(evenement) => changer('appris', evenement.target.value)}
          className={CHAMP}
        />
      </label>
      <fieldset>
        <legend className="text-sm font-semibold">Ce que le projet a déjà</legend>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
          {(
            [
              ['a_readme', 'Un README'],
              ['a_captures', 'Des captures dans le dépôt'],
              ['a_tests', 'Des tests'],
            ] as const
          ).map(([cle, libelle]) => (
            <label key={cle} className="flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                checked={champs[cle]}
                onChange={(evenement) => changer(cle, evenement.target.checked)}
                className="size-5 accent-primary-600"
              />
              {libelle}
            </label>
          ))}
        </div>
      </fieldset>
      {enregistrer.isError && (
        <p role="alert" className="text-sm font-semibold text-red-700 dark:text-red-400">
          Le projet n’a pas pu être enregistré. Vérifie ta connexion.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={enregistrer.isPending} className={BOUTON_PRINCIPAL}>
          Enregistrer
        </button>
        <button type="button" onClick={onFermer} className={BOUTON_SECONDAIRE}>
          Annuler
        </button>
        {projet &&
          (suppressionDemandee ? (
            <span className="flex flex-wrap items-center gap-3 text-sm">
              Supprimer ce projet ?
              <button
                type="button"
                onClick={() => supprimer.mutate(projet.id, { onSuccess: onFermer })}
                className="font-semibold text-red-700 underline underline-offset-2 dark:text-red-400"
              >
                Oui, supprimer
              </button>
              <button
                type="button"
                onClick={() => setSuppressionDemandee(false)}
                className="font-medium underline underline-offset-2"
              >
                Non
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setSuppressionDemandee(true)}
              className="ml-auto text-sm font-medium text-red-700 underline underline-offset-2 dark:text-red-400"
            >
              Supprimer
            </button>
          ))}
      </div>
    </form>
  );
}

function CarteProjet({ projet, onModifier }: { projet: Projet; onModifier: () => void }) {
  const { points, pourcent } = completude(projet);
  const code = lienSur(projet.url_code);
  const demo = lienSur(projet.url_demo);
  return (
    <article className="flex flex-col overflow-hidden rounded-[1.125rem] border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      {projet.image ? (
        <img src={projet.image} alt="" className="h-[9.375rem] w-full object-cover" />
      ) : (
        <button
          type="button"
          onClick={onModifier}
          className={`flex h-[9.375rem] items-center justify-center gap-2 bg-gray-50 text-sm font-medium dark:bg-gray-950 ${SECONDAIRE}`}
        >
          <ImagePlus aria-hidden="true" className="size-5" strokeWidth={1.6} />
          Ajoute une capture
        </button>
      )}
      <div className="flex flex-1 flex-col gap-2.5 p-[1.125rem]">
        <div className="flex items-start justify-between gap-2.5">
          <h3 className="text-[1.1875rem] font-extrabold">{projet.titre}</h3>
          <span className={projet.statut === 'en_cours' ? BADGE.bleu : BADGE.vert}>
            {projet.statut === 'en_cours' ? 'En cours' : 'Terminé'}
          </span>
        </div>
        {projet.description && <p className={`text-sm ${SECONDAIRE}`}>{projet.description}</p>}
        {projet.technologies.length > 0 && (
          <ul aria-label="Technologies" className="flex flex-wrap gap-1.5">
            {projet.technologies.map((technologie) => (
              <li key={technologie} className={BADGE.neutre}>
                {technologie}
              </li>
            ))}
          </ul>
        )}
        {(code || demo) && (
          <div className="flex gap-2">
            {code && (
              <a href={code} target="_blank" rel="noreferrer" className={BOUTON_SECONDAIRE}>
                Code
              </a>
            )}
            {demo && (
              <a href={demo} target="_blank" rel="noreferrer" className={BOUTON_SECONDAIRE}>
                Démo
              </a>
            )}
          </div>
        )}
        {projet.appris && (
          <p className="text-sm">
            <strong>Ce que j’ai appris :</strong>{' '}
            <span className={SECONDAIRE}>{projet.appris}</span>
          </p>
        )}
        <div className="mt-auto flex flex-col gap-2 rounded-xl bg-gray-50 p-3 dark:bg-gray-950">
          <div className="flex items-baseline justify-between">
            <span className={`text-[0.8125rem] font-semibold ${SECONDAIRE}`}>Complétude</span>
            <strong className="text-sm text-vert-700 dark:text-vert-50">{pourcent} %</strong>
          </div>
          <div aria-hidden="true" className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-800">
            <div className="h-1.5 rounded-full bg-vert-500" style={{ width: `${pourcent}%` }} />
          </div>
          <ul className="flex flex-wrap gap-x-3 gap-y-1.5">
            {points.map((point) => (
              <li
                key={point.libelle}
                className={`flex items-center gap-1 text-[0.8125rem] ${
                  point.fait ? 'text-vert-700 dark:text-vert-50' : SECONDAIRE
                }`}
              >
                {point.fait ? (
                  <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
                ) : (
                  <Circle aria-hidden="true" className="size-3" strokeWidth={2} />
                )}
                {point.libelle}
                <span className="sr-only">{point.fait ? ' : fait' : ' : manquant'}</span>
              </li>
            ))}
          </ul>
        </div>
        <button type="button" onClick={onModifier} className={`self-start ${BOUTON_DOUX}`}>
          Modifier
        </button>
      </div>
    </article>
  );
}

/**
 * Portfolio, d'après la maquette du 18 novembre 2026 : mes projets (réutilisés par le CV, les
 * lettres et l'entretien) et les technologies que mes offres demandent sans que je les montre.
 */
export function Portfolio() {
  const projets = useProjets();
  const demandes = useTechnologiesDemandees();
  // `undefined` : aucun formulaire ouvert ; `null` : nouveau projet.
  const [edition, setEdition] = useState<{ projet: Projet | null; initial: ChampsProjet }>();
  const liste = projets.data ?? [];
  const aFaire = projetsAFaire(demandes.data ?? [], liste);

  function ouvrir(projet: Projet | null, initial: ChampsProjet = projet ?? PROJET_VIDE) {
    setEdition({ projet, initial });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-[1.75rem] font-extrabold tracking-[-0.02em] md:text-[2.125rem]">
            Portfolio
          </h1>
          <p className={SECONDAIRE}>
            Tes projets alimentent le CV, les lettres et la préparation d’entretien.
          </p>
        </div>
        {!edition && (
          <button type="button" onClick={() => ouvrir(null)} className={BOUTON_PRINCIPAL}>
            <Plus aria-hidden="true" className="size-[1.125rem]" strokeWidth={2} />
            Ajouter un projet
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <section
          aria-labelledby="titre-mes-projets"
          className="flex min-w-0 flex-[999_1_40rem] flex-col gap-3.5"
        >
          {edition && (
            <Formulaire
              key={edition.projet?.id ?? 'nouveau'}
              projet={edition.projet}
              initial={edition.initial}
              onFermer={() => setEdition(undefined)}
            />
          )}
          <h2 id="titre-mes-projets" className={TITRE_SECTION}>
            Mes projets{' '}
            <span className={`font-medium ${SECONDAIRE}`}>
              · {projets.isSuccess ? (liste.length === 0 ? 'aucun' : liste.length) : '…'}
            </span>
          </h2>
          {projets.isPending && <p className={SECONDAIRE}>Chargement…</p>}
          {projets.isError && (
            <p role="alert" className="font-semibold text-red-700 dark:text-red-400">
              Les projets n’ont pas pu être chargés. Vérifie ta connexion.
            </p>
          )}
          {projets.isSuccess && liste.length === 0 && !edition && (
            <div className="flex flex-col items-center gap-3.5 rounded-[1.25rem] border-2 border-dashed border-gray-300 bg-white px-8 py-12 text-center dark:border-gray-700 dark:bg-gray-900">
              <span className="flex size-[4.5rem] items-center justify-center rounded-[1.375rem] bg-primary-50 text-primary-700 dark:bg-primary-400/15 dark:text-primary-300">
                <FolderPlus aria-hidden="true" className="size-[2.125rem]" strokeWidth={1.6} />
              </span>
              <h3 className="text-[1.625rem] font-extrabold">Ajoute ton premier projet</h3>
              <p className={`max-w-[28.75rem] ${SECONDAIRE}`}>
                Un projet de cours, un site perso, un script utile : tout compte. Il servira tout de
                suite au CV et aux lettres.
              </p>
              <button type="button" onClick={() => ouvrir(null)} className={BOUTON_PRINCIPAL}>
                Ajouter un projet
              </button>
            </div>
          )}
          {liste.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {liste.map((projet) => (
                <CarteProjet key={projet.id} projet={projet} onModifier={() => ouvrir(projet)} />
              ))}
            </div>
          )}
        </section>

        <aside
          aria-labelledby="titre-a-faire"
          className={`flex min-w-0 flex-[1_1_21.25rem] flex-col gap-3 md:max-w-[26.25rem] ${CARTE}`}
        >
          <h2 id="titre-a-faire" className={TITRE_SECTION}>
            Projets à faire
          </h2>
          <p className={`text-sm ${SECONDAIRE}`}>
            Les technologies demandées dans tes offres collectées que ton portfolio ne montre pas
            encore. Les idées sont des suggestions, à adapter.
          </p>
          {demandes.isPending && <p className={`text-sm ${SECONDAIRE}`}>Calcul…</p>}
          {demandes.isError && (
            <p role="alert" className="text-sm font-semibold text-red-700 dark:text-red-400">
              Le compte des technologies n’a pas pu être fait. Vérifie ta connexion.
            </p>
          )}
          {demandes.isSuccess && aFaire.length === 0 && (
            <p className={`text-sm ${SECONDAIRE}`}>
              {demandes.data.length === 0
                ? 'Aucune technologie repérée dans les offres pour l’instant.'
                : 'Ton portfolio montre toutes les technologies les plus demandées.'}
            </p>
          )}
          <ul className="flex flex-col gap-3">
            {aFaire.map((item) => (
              <li
                key={item.terme}
                className="flex flex-col gap-2 rounded-[0.875rem] border border-gray-200 p-3.5 dark:border-gray-800"
              >
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className={BADGE.ambre}>{item.nom}</span>
                  <span className={`text-sm ${SECONDAIRE}`}>
                    demandé dans {item.nombre} offre{item.nombre > 1 ? 's' : ''}, absent du
                    portfolio
                  </span>
                </div>
                <p className="text-sm">
                  <strong>Idée :</strong> {item.idee}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    ouvrir(null, {
                      ...PROJET_VIDE,
                      titre: `Projet ${item.nom}`,
                      description: item.idee,
                      technologies: [item.nom],
                    })
                  }
                  className={`self-start ${BOUTON_DOUX}`}
                >
                  Ajouter à mes projets
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
