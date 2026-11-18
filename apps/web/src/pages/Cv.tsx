import {
  ACCENTS,
  CONVENTIONS_CV,
  deplacer,
  docxCv,
  genererCv,
  LANGUES_CV,
  lectureRobot,
  LIBELLES_PAYS,
  MARGES_MM,
  MISE_EN_PAGE_DEFAUT,
  ordonner,
  PAYS_CV,
  POLICES,
  REGLES_ROBOT,
  resserrer,
  texteRobot,
  type AccentCv,
  type CvGenere,
  type LangueCv,
  type MargesCv,
  type MiseEnPageCv,
  type ModeleCv,
  type PaysCv,
  type PoliceCv,
  type SectionCv,
} from '@stageradar/shared';
import { ArrowDown, ArrowUp, ExternalLink, GripVertical, Minus, Plus, X } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router';
import { EditeurCv } from '../components/EditeurCv';
import { ImportCvPdf } from '../components/ImportCvPdf';
import { Flag } from '../components/Flag';
import { PageCv, type Glisser, type ModeCv } from '../components/PageCv';
import {
  cleMiseEnPage,
  useEnregistrerMiseEnPage,
  useMisesEnPage,
  useOffreCv,
  useProfilCv,
  type OffreCv,
} from '../lib/cv';
import { useAjouterDocument, useDocuments } from '../lib/documents';
import { LIBELLES_LANGUE } from '../lib/offres';
import { useCandidatures } from '../lib/suivi';
import { telecharger } from '../lib/telechargement';
import {
  BADGE,
  BOUTON_PRINCIPAL,
  BOUTON_SECONDAIRE,
  CARTE,
  CHAMP,
  pilule,
  SECONDAIRE,
  SEGMENTS,
  segment,
} from '../lib/ui';

const CODES_LANGUE: Record<LangueCv, string> = { fr: 'FR', en: 'EN', es: 'ES' };
const NOMS_BLOC: Record<SectionCv, string> = {
  profil: 'Résumé',
  experience: 'Expériences',
  formation: 'Formation',
  competences: 'Compétences',
  langues: 'Langues',
  projets: 'Projets',
  interets: 'Centres d’intérêt',
  references: 'Références',
};
const MODELES: { id: ModeleCv; libelle: string }[] = [
  { id: 'sobre', libelle: 'Sobre' },
  { id: 'moderne', libelle: 'Moderne' },
  { id: 'compact', libelle: 'Compact' },
];
const MARGES: { id: MargesCv; libelle: string }[] = [
  { id: 'etroites', libelle: 'Étroites' },
  { id: 'normales', libelle: 'Normales' },
  { id: 'larges', libelle: 'Larges' },
];
const MM_EN_PX = 96 / 25.4;
const TITRE_PANNEAU = 'text-base font-bold';

/** Vrai sur un écran assez large pour les trois colonnes de l'éditeur (1280 px). */
function useGrandEcran(): boolean {
  return useSyncExternalStore(
    (prevenir) => {
      const requete = window.matchMedia('(min-width: 1280px)');
      requete.addEventListener('change', prevenir);
      return () => requete.removeEventListener('change', prevenir);
    },
    () => window.matchMedia('(min-width: 1280px)').matches,
  );
}

function estPays(valeur: string | null): valeur is PaysCv {
  return (PAYS_CV as readonly string[]).includes(valeur ?? '');
}

function LienSource({ libelle, url, date }: { libelle: string; url: string; date?: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs font-bold text-primary-700 underline underline-offset-2 dark:text-primary-400"
    >
      {libelle}
      {date && `, ${date}`}
      <ExternalLink aria-hidden="true" className="size-3" />
    </a>
  );
}

function Interrupteur({
  actif,
  libelle,
  onChanger,
}: {
  actif: boolean;
  libelle: string;
  onChanger: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={actif}
      aria-label={libelle}
      onClick={onChanger}
      className={`relative h-6 w-10 shrink-0 rounded-full transition ${
        actif ? 'bg-primary-600 dark:bg-primary-400' : 'bg-gray-300 dark:bg-gray-700'
      }`}
    >
      <span
        className={`absolute top-0.5 size-5 rounded-full bg-white transition-all ${
          actif ? 'left-[1.125rem]' : 'left-0.5'
        }`}
      />
    </button>
  );
}

/**
 * La feuille A4 à l'écran (réduite pour tenir dans la colonne, zoomable) et l'exemplaire posé dans
 * <body> pour l'impression, avec les marges choisies.
 */
function Feuille({
  page,
  marges,
  zoom,
  surPages,
}: {
  page: ReactNode;
  marges: number;
  zoom: number;
  surPages: (pages: number) => void;
}) {
  const cadre = useRef<HTMLDivElement>(null);
  const contenu = useRef<HTMLDivElement>(null);
  const [ajuste, setAjuste] = useState(1);
  const hauteurPage = (297 - 2 * marges) * MM_EN_PX;

  useEffect(() => {
    const element = contenu.current;
    if (!element) return;
    const observer = new ResizeObserver(() =>
      surPages(Math.max(1, Math.ceil((element.offsetHeight - 2) / hauteurPage))),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [surPages, hauteurPage]);

  useEffect(() => {
    const element = cadre.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      const styleCadre = getComputedStyle(element);
      const largeur =
        element.clientWidth -
        parseFloat(styleCadre.paddingLeft) -
        parseFloat(styleCadre.paddingRight);
      setAjuste(Math.min(1, largeur / (210 * MM_EN_PX)));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div
        ref={cadre}
        className="overflow-auto rounded-3xl border border-gray-200 bg-[#e4e7f0] p-3 sm:p-6 dark:border-gray-800 dark:bg-gray-850"
      >
        <div
          className="relative mx-auto w-fit bg-white shadow-sm"
          style={{
            zoom: ajuste * zoom,
            padding: `${marges}mm`,
            minHeight: '297mm',
            boxSizing: 'border-box',
          }}
        >
          <div ref={contenu} data-testid="cv-feuille">
            {page}
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-red-400"
            style={{ top: `calc(${marges}mm + ${hauteurPage}px)` }}
          >
            <span className="absolute right-2 -translate-y-full bg-white px-1 text-[11px] font-semibold text-red-600">
              Fin de la page 1
            </span>
          </div>
        </div>
      </div>
      {createPortal(
        <div className="cv-impression" aria-hidden="true">
          <style>{`@media print { @page { size: A4; margin: ${marges}mm; } }`}</style>
          {page}
        </div>,
        document.body,
      )}
    </>
  );
}

function Editeur({
  profil,
  pays,
  langue,
  offre,
  enregistree,
  cle,
  mode,
  changer,
  offresSuivies,
}: {
  profil: Parameters<typeof genererCv>[0];
  pays: PaysCv;
  langue: LangueCv;
  offre: OffreCv | null;
  enregistree: MiseEnPageCv | undefined;
  cle: string;
  mode: ModeCv;
  changer: (cle: string, valeur: string | null) => void;
  offresSuivies: { id: string; titre: string; entreprise: string | null }[];
}) {
  const convention = CONVENTIONS_CV[pays];
  const grandEcran = useGrandEcran();
  const documents = useDocuments();
  const ajouterDocument = useAjouterDocument();
  const enregistrerMiseEnPage = useEnregistrerMiseEnPage();
  const [miseEnPage, setMiseEnPage] = useState<MiseEnPageCv>(enregistree ?? MISE_EN_PAGE_DEFAUT);
  const [dateNaissance, setDateNaissance] = useState<boolean | undefined>(undefined);
  const [nationalite, setNationalite] = useState<boolean | undefined>(undefined);
  const [pages, setPages] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [ajustement, setAjustement] = useState(false);
  const [feuilleMobile, setFeuilleMobile] = useState<'blocs' | 'reglages' | null>(null);
  const [glisse, setGlisse] = useState<SectionCv | null>(null);
  const [enregistrement, setEnregistrement] = useState<string | null>(null);

  const cv: CvGenere = genererCv(profil, pays, {
    langue,
    offre,
    dateNaissance,
    nationalite,
  });
  const ordreComplet = ordonner(cv.sections, { ...miseEnPage, masques: [] }).map(
    (section) => section.id,
  );
  const sections = ordonner(cv.sections, miseEnPage);
  const marges = MARGES_MM[miseEnPage.marges];
  const modifiee =
    JSON.stringify(miseEnPage) !== JSON.stringify(enregistree ?? MISE_EN_PAGE_DEFAUT);
  const libelleVersion = `${LIBELLES_PAYS[pays]} · ${CODES_LANGUE[langue]} · ${
    mode === 'robot' ? 'Robot' : 'Design'
  }`;
  const titreDocument = `${libelleVersion}${
    offre ? ` · ${[offre.entreprise, offre.titre].filter(Boolean).join(', ')}` : ''
  }`;
  const versionSuivante =
    Math.max(
      0,
      ...(documents.data ?? [])
        .filter((document) => document.type === 'cv' && document.titre === titreDocument)
        .map((document) => document.version),
    ) + 1;

  // « Tenir sur une page » : à chaque nouvelle mesure de la feuille, resserre d'un cran tant
  // qu'elle déborde, puis s'arrête.
  const ajustementEnCours = useRef(false);
  const surPages = useCallback((nombre: number) => {
    setPages(nombre);
    if (!ajustementEnCours.current) return;
    if (nombre <= 1) {
      ajustementEnCours.current = false;
      setAjustement(false);
      return;
    }
    setMiseEnPage((avant) => {
      const suivante = resserrer(avant);
      if (suivante) return suivante;
      ajustementEnCours.current = false;
      setAjustement(false);
      return avant;
    });
  }, []);

  function tenirSurUnePage() {
    const suivante = resserrer(miseEnPage);
    if (!suivante) return;
    ajustementEnCours.current = true;
    setAjustement(true);
    setMiseEnPage(suivante);
  }

  function changerMiseEnPage(champs: Partial<MiseEnPageCv>) {
    setMiseEnPage((avant) => ({ ...avant, ...champs }));
  }

  function deplacerBloc(bloc: SectionCv, vers: SectionCv) {
    if (bloc !== vers) changerMiseEnPage({ ordre: deplacer(ordreComplet, bloc, vers) });
  }

  const glisser: Glisser = {
    depart: setGlisse,
    depot: (vers) => {
      if (glisse) deplacerBloc(glisse, vers);
      setGlisse(null);
    },
  };

  function enregistrer() {
    enregistrerMiseEnPage.mutate({ cle, miseEnPage });
    ajouterDocument.mutate(
      {
        type: 'cv',
        langue,
        titre: titreDocument,
        version: versionSuivante,
        chemin_stockage: null,
        notes: `Généré par l’éditeur de CV (modèle ${miseEnPage.modele}).`,
      },
      { onSuccess: () => setEnregistrement(`v${versionSuivante}`) },
    );
  }

  const attentes = cv.attentes;
  const totalMotsCles = attentes ? attentes.trouvees.length + attentes.absentes.length : 0;
  const lecture = lectureRobot(cv, sections);

  const panneauBlocs = (
    <section aria-labelledby="titre-blocs" className={`flex flex-col gap-2 ${CARTE}`}>
      <h2 id="titre-blocs" className={TITRE_PANNEAU}>
        Blocs
      </h2>
      <p className={`text-[0.8125rem] ${SECONDAIRE}`}>
        {mode === 'robot'
          ? 'En mode Robot, l’ordre compte mais la mise en page est fixe.'
          : 'Glisse un bloc ici ou sur la page, ou masque-le.'}
      </p>
      <p className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm">
        Identité et titre <span className={`text-xs ${SECONDAIRE}`}>toujours en tête</span>
      </p>
      <ul className="flex flex-col gap-1">
        {ordreComplet.map((id, rang) => {
          const visible = !miseEnPage.masques.includes(id);
          return (
            <li
              key={id}
              draggable
              onDragStart={() => setGlisse(id)}
              onDragOver={(evenement) => evenement.preventDefault()}
              onDrop={() => {
                if (glisse) deplacerBloc(glisse, id);
                setGlisse(null);
              }}
              className={`flex items-center gap-1.5 rounded-lg px-1.5 py-1 ${
                glisse === id ? 'bg-primary-50 dark:bg-primary-400/15' : ''
              }`}
            >
              <GripVertical aria-hidden="true" className="size-4 cursor-grab text-gray-400" />
              <span className={`flex-1 text-sm ${visible ? 'font-medium' : SECONDAIRE}`}>
                {NOMS_BLOC[id]}
              </span>
              <button
                type="button"
                aria-label={`Monter ${NOMS_BLOC[id]}`}
                disabled={rang === 0}
                onClick={() => deplacerBloc(id, ordreComplet[rang - 1]!)}
                className="flex size-8 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-850"
              >
                <ArrowUp aria-hidden="true" className="size-4" />
              </button>
              <button
                type="button"
                aria-label={`Descendre ${NOMS_BLOC[id]}`}
                disabled={rang === ordreComplet.length - 1}
                onClick={() => deplacerBloc(id, ordreComplet[rang + 1]!)}
                className="flex size-8 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-850"
              >
                <ArrowDown aria-hidden="true" className="size-4" />
              </button>
              <Interrupteur
                actif={visible}
                libelle={`Afficher le bloc ${NOMS_BLOC[id]}`}
                onChanger={() =>
                  changerMiseEnPage({
                    masques: visible
                      ? [...miseEnPage.masques, id]
                      : miseEnPage.masques.filter((autre) => autre !== id),
                  })
                }
              />
            </li>
          );
        })}
      </ul>
    </section>
  );

  const panneauReglages = (
    <section aria-labelledby="titre-reglages" className={`flex flex-col gap-4 ${CARTE}`}>
      <h2 id="titre-reglages" className={TITRE_PANNEAU}>
        Réglages
      </h2>
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">Modèle</legend>
        <div className="grid grid-cols-3 gap-2">
          {MODELES.map((modele) => (
            <label
              key={modele.id}
              className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl p-2 text-sm ${
                miseEnPage.modele === modele.id
                  ? 'border-2 border-primary-600 dark:border-primary-400'
                  : 'border border-gray-200 dark:border-gray-800'
              }`}
            >
              <span
                aria-hidden="true"
                className="flex h-12 w-9 gap-0.5 rounded bg-gray-100 p-1 dark:bg-gray-850"
              >
                {modele.id === 'moderne' && (
                  <span className="w-1/3 rounded-sm bg-gray-300 dark:bg-gray-700" />
                )}
                <span className="flex flex-1 flex-col gap-0.5">
                  {Array.from({ length: modele.id === 'compact' ? 6 : 4 }, (_, rang) => (
                    <span key={rang} className="h-1 rounded-sm bg-gray-300 dark:bg-gray-700" />
                  ))}
                </span>
              </span>
              <input
                type="radio"
                name="modele"
                checked={miseEnPage.modele === modele.id}
                onChange={() => changerMiseEnPage({ modele: modele.id })}
                className="sr-only"
              />
              {modele.libelle}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">Couleur d’accent</legend>
        <div className="flex gap-2">
          {(Object.keys(ACCENTS) as AccentCv[]).map((accent) => (
            <button
              key={accent}
              type="button"
              aria-label={ACCENTS[accent].libelle}
              aria-pressed={miseEnPage.accent === accent}
              onClick={() => changerMiseEnPage({ accent })}
              className={`size-8 rounded-full ${
                miseEnPage.accent === accent
                  ? 'ring-2 ring-offset-2 ring-gray-950 dark:ring-gray-50 dark:ring-offset-gray-900'
                  : ''
              }`}
              style={{ backgroundColor: ACCENTS[accent].couleur }}
            />
          ))}
        </div>
      </fieldset>
      <label className="text-sm font-semibold">
        Police
        <select
          value={miseEnPage.police}
          onChange={(evenement) =>
            changerMiseEnPage({ police: evenement.target.value as PoliceCv })
          }
          className={CHAMP}
        >
          {(Object.keys(POLICES) as PoliceCv[]).map((police) => (
            <option key={police} value={police}>
              {POLICES[police].libelle}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-semibold">
          Taille · {String(miseEnPage.taille).replace('.', ',')} pt
          <input
            type="range"
            min={9}
            max={12}
            step={0.5}
            value={miseEnPage.taille}
            onChange={(evenement) => changerMiseEnPage({ taille: Number(evenement.target.value) })}
            className="mt-2 w-full accent-primary-600"
          />
        </label>
        <label className="text-sm font-semibold">
          Interligne · {String(miseEnPage.interligne).replace('.', ',')}
          <input
            type="range"
            min={1}
            max={1.8}
            step={0.1}
            value={miseEnPage.interligne}
            onChange={(evenement) =>
              changerMiseEnPage({ interligne: Number(evenement.target.value) })
            }
            className="mt-2 w-full accent-primary-600"
          />
        </label>
      </div>
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">Marges</legend>
        <div className="flex gap-2">
          {MARGES.map((marge) => (
            <button
              key={marge.id}
              type="button"
              aria-pressed={miseEnPage.marges === marge.id}
              onClick={() => changerMiseEnPage({ marges: marge.id })}
              className={pilule(miseEnPage.marges === marge.id)}
            >
              {marge.libelle}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold">Informations personnelles</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={dateNaissance ?? convention.dateNaissance}
            onChange={(evenement) => setDateNaissance(evenement.target.checked)}
            className="size-4 accent-primary-600"
          />
          Date de naissance
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={nationalite ?? convention.nationalite}
            onChange={(evenement) => setNationalite(evenement.target.checked)}
            className="size-4 accent-primary-600"
          />
          Nationalité
        </label>
      </fieldset>
      <p className={`text-[0.8125rem] ${SECONDAIRE}`}>
        <strong>Photo :</strong> aucune des sources de ce pays ne la demande pour ce format, elle
        n’est donc pas proposée.
      </p>
    </section>
  );

  const panneauRobot = (
    <>
      <section aria-labelledby="titre-correspondance-cv" className={`flex flex-col gap-3 ${CARTE}`}>
        <h2 id="titre-correspondance-cv" className={TITRE_PANNEAU}>
          Correspondance avec l’offre
        </h2>
        {!offre || !attentes ? (
          <p className={`text-sm ${SECONDAIRE}`}>Choisis une offre pour comparer.</p>
        ) : totalMotsCles === 0 ? (
          <p className={`text-sm ${SECONDAIRE}`}>L’offre ne cite aucun outil reconnu.</p>
        ) : (
          <>
            <p className="flex items-center gap-3">
              <span className="text-2xl font-extrabold">
                {Math.round((attentes.trouvees.length / totalMotsCles) * 100)} %
              </span>
              <span className={`text-sm ${SECONDAIRE}`}>
                des mots-clés de « {offre.titre} » sont dans ton CV.
              </span>
            </p>
            {attentes.trouvees.length > 0 && (
              <div>
                <span className="text-[0.8125rem] font-semibold">Présents</span>
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {attentes.trouvees.map((terme) => (
                    <li key={terme} className={BADGE.vert}>
                      {terme}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {attentes.absentes.length > 0 && (
              <div>
                <span className="text-[0.8125rem] font-semibold">Absents</span>
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {attentes.absentes.map((terme) => (
                    <li key={terme} className={BADGE.neutre}>
                      {terme}
                    </li>
                  ))}
                </ul>
                <p className={`mt-1.5 text-xs ${SECONDAIRE}`}>
                  Tu l’as ?{' '}
                  <button
                    type="button"
                    onClick={() => changer('onglet', 'profil')}
                    className="font-semibold text-primary-600 underline dark:text-primary-300"
                  >
                    Ajoute-le à ton profil
                  </button>
                  . Rien n’est ajouté au CV sans toi.
                </p>
              </div>
            )}
            {attentes.languesAbsentes.length > 0 && (
              <p className="text-sm font-bold text-red-700 dark:text-red-400">
                Langue exigée que ton profil ne cite pas :{' '}
                {attentes.languesAbsentes.map((code) => LIBELLES_LANGUE[code] ?? code).join(', ')}
              </p>
            )}
          </>
        )}
      </section>
      <section aria-labelledby="titre-lecture" className={`flex flex-col gap-2.5 ${CARTE}`}>
        <h2 id="titre-lecture" className={TITRE_PANNEAU}>
          Ce que lit le robot
        </h2>
        <p className={`text-[0.8125rem] ${SECONDAIRE}`}>
          Le texte du CV dans l’ordre où un logiciel de tri le lit, champ par champ.
        </p>
        <ul className="flex flex-col gap-2">
          {lecture.map((champ) => (
            <li key={champ.libelle} className="flex gap-2.5">
              <span
                aria-hidden="true"
                className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                  champ.ok
                    ? 'bg-vert-50 text-vert-700 dark:bg-vert-500/20 dark:text-vert-50'
                    : 'bg-amber-50 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200'
                }`}
              >
                {champ.ok ? '✓' : '!'}
              </span>
              <span className="flex min-w-0 flex-col text-sm">
                <strong>
                  {champ.libelle}
                  <span className="sr-only">{champ.ok ? ' : lu' : ' : à vérifier'}</span>
                </strong>
                <span
                  className={`break-words ${champ.ok ? SECONDAIRE : 'text-amber-800 dark:text-amber-200'}`}
                >
                  {champ.valeur}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-primary-600 dark:text-primary-300">
            Afficher le texte brut
          </summary>
          <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-gray-50 p-3 text-xs whitespace-pre-wrap dark:bg-gray-950">
            {texteRobot(cv, sections)}
          </pre>
        </details>
      </section>
      <section aria-labelledby="titre-regles-robot" className={`flex flex-col gap-2 ${CARTE}`}>
        <h2 id="titre-regles-robot" className={TITRE_PANNEAU}>
          Pourquoi ce format
        </h2>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm">
          {REGLES_ROBOT.map((regle) => (
            <li key={regle.texte}>{regle.texte}</li>
          ))}
        </ul>
        <p className={`flex flex-col gap-1 text-xs ${SECONDAIRE}`}>
          Sources :
          {[
            ...new Map(
              REGLES_ROBOT.flatMap((regle) => regle.sources).map((source) => [source.url, source]),
            ).values(),
          ].map((source) => (
            <LienSource key={source.url} {...source} />
          ))}
        </p>
      </section>
    </>
  );

  const reglesPays = (
    <details open className={CARTE}>
      <summary className="flex cursor-pointer items-center gap-2 font-bold">
        <Flag code={pays} />
        Ce qui se fait : {LIBELLES_PAYS[pays]}
      </summary>
      <ul className="mt-3 space-y-3 text-sm">
        {convention.regles.map((regle) => (
          <li key={regle.texte}>
            <p>{regle.texte}</p>
            <LienSource {...regle.source} />
          </li>
        ))}
      </ul>
      {convention.autreFormat && (
        <div className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">
          <p className="font-bold">Autre format</p>
          <p className="mt-1">{convention.autreFormat.texte}</p>
          <LienSource {...convention.autreFormat.source} />
        </div>
      )}
    </details>
  );

  const panneauDroit = mode === 'robot' ? panneauRobot : panneauReglages;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 print:hidden">
        <span className={`text-sm ${SECONDAIRE}`}>
          {libelleVersion}
          {modifiee
            ? ' · modifié, non enregistré'
            : enregistrement
              ? ` · ${enregistrement} enregistrée`
              : ''}
        </span>
        <span className="flex-1" />
        <button
          type="button"
          disabled={ajouterDocument.isPending}
          onClick={enregistrer}
          className={BOUTON_SECONDAIRE}
        >
          Enregistrer cette version
        </button>
        <button
          type="button"
          title="PDF de préférence ; le .docx seulement si l’offre le demande."
          onClick={() =>
            telecharger(
              `CV-${pays}-${langue}.docx`,
              docxCv(cv, sections),
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            )
          }
          className={BOUTON_SECONDAIRE}
        >
          Exporter en .docx
        </button>
        <button type="button" onClick={() => window.print()} className={BOUTON_PRINCIPAL}>
          Imprimer en PDF
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 print:hidden">
        <div role="radiogroup" aria-label="Pays visé" className="flex flex-wrap gap-2">
          {PAYS_CV.map((code) => (
            <button
              key={code}
              type="button"
              role="radio"
              aria-checked={pays === code}
              onClick={() => changer('pays', code)}
              className={`inline-flex items-center gap-2 ${pilule(pays === code)}`}
            >
              <Flag code={code} />
              {LIBELLES_PAYS[code]}
            </button>
          ))}
        </div>
        <div role="radiogroup" aria-label="Langue du CV" className={SEGMENTS}>
          {LANGUES_CV.map((code) => (
            <button
              key={code}
              type="button"
              role="radio"
              aria-checked={langue === code}
              aria-label={`${CODES_LANGUE[code]}${code === convention.langue ? ' (usage du pays)' : ''}`}
              onClick={() => changer('langue', code)}
              className={segment(langue === code)}
            >
              {CODES_LANGUE[code]}
            </button>
          ))}
        </div>
        {offre ? (
          <span className={`inline-flex items-center gap-1.5 ${BADGE.bleu}`}>
            Offre : {[offre.titre, offre.entreprise].filter(Boolean).join(' · ')}
            <button
              type="button"
              aria-label="Retirer l’offre ciblée"
              onClick={() => changer('offre', null)}
              className="-mr-1 flex size-6 items-center justify-center rounded-full hover:bg-primary-100"
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          </span>
        ) : (
          <label className="flex items-center gap-2 text-sm">
            <span className="sr-only">Adapter à une offre</span>
            <select
              value=""
              onChange={(evenement) => changer('offre', evenement.target.value || null)}
              className="min-h-10 rounded-[0.625rem] border border-gray-300 bg-white px-3 text-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <option value="">Aucune offre : CV général</option>
              {offresSuivies.map((suivie) => (
                <option key={suivie.id} value={suivie.id}>
                  {[suivie.entreprise, suivie.titre].filter(Boolean).join(' : ')}
                </option>
              ))}
            </select>
          </label>
        )}
        <span className="flex-1" />
        <div role="tablist" aria-label="Mode du CV" className={SEGMENTS}>
          {(
            [
              ['design', 'Design'],
              ['robot', 'Robot (logiciels de tri)'],
            ] as const
          ).map(([id, libelle]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              onClick={() => changer('mode', id === 'robot' ? 'robot' : null)}
              className={segment(mode === id)}
            >
              {libelle}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 xl:grid-cols-[17rem_minmax(0,1fr)_20rem]">
        {grandEcran && <aside className="flex flex-col gap-4 print:hidden">{panneauBlocs}</aside>}

        <div className="flex min-w-0 flex-col gap-3">
          {mode === 'design' && miseEnPage.modele === 'moderne' && (
            <p
              role="status"
              className="flex flex-wrap items-center gap-3 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-900 print:hidden dark:bg-amber-500/15 dark:text-amber-100"
            >
              <span className="flex-1">
                Les deux colonnes peuvent gêner les logiciels de tri des candidatures.
              </span>
              <button
                type="button"
                onClick={() => changer('mode', 'robot')}
                className="font-semibold underline underline-offset-2"
              >
                Passer en mode Robot
              </button>
            </p>
          )}
          {mode === 'robot' && (
            <p
              role="status"
              className="rounded-xl bg-vert-50 px-4 py-2.5 text-sm text-vert-700 print:hidden dark:bg-vert-500/20 dark:text-vert-50"
            >
              Une colonne, titres standard, police Arial, vrai texte dans le PDF.
            </p>
          )}
          {cv.alertes.length > 0 && (
            <section className={`print:hidden ${CARTE}`}>
              <h2 className="font-bold">À revoir dans ton profil</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {cv.alertes.map((alerte) => (
                  <li key={alerte}>{alerte}</li>
                ))}
              </ul>
            </section>
          )}
          <Feuille
            marges={marges}
            zoom={zoom}
            surPages={surPages}
            page={
              <PageCv
                cv={cv}
                sections={sections}
                miseEnPage={miseEnPage}
                mode={mode}
                marges={marges}
                glisser={mode === 'design' ? glisser : undefined}
              />
            }
          />
          {pages > 1 && (
            <div
              role="alert"
              className="flex flex-wrap items-center gap-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-800 print:hidden dark:bg-red-500/15 dark:text-red-200"
            >
              <span className="flex-1">
                <strong>Le CV déborde sur une {pages}ᵉ page.</strong>
                {convention.pagesMax !== undefined &&
                  ` Les sources de ce pays conseillent ${convention.pagesMax} page${convention.pagesMax > 1 ? 's' : ''} au plus.`}
              </span>
              <button
                type="button"
                disabled={ajustement || !resserrer(miseEnPage)}
                onClick={tenirSurUnePage}
                className="font-semibold underline underline-offset-2 disabled:opacity-50"
              >
                Tenir sur une page
              </button>
            </div>
          )}
          <div className="flex items-center justify-center gap-3 print:hidden">
            <button
              type="button"
              aria-label="Dézoomer"
              disabled={zoom <= 0.6}
              onClick={() => setZoom((avant) => Math.round((avant - 0.1) * 10) / 10)}
              className="flex size-9 items-center justify-center rounded-lg border border-gray-300 bg-white disabled:opacity-40 dark:border-gray-800 dark:bg-gray-900"
            >
              <Minus aria-hidden="true" className="size-4" />
            </button>
            <span className="w-12 text-center text-sm font-semibold">
              {Math.round(zoom * 100)} %
            </span>
            <button
              type="button"
              aria-label="Zoomer"
              disabled={zoom >= 1.5}
              onClick={() => setZoom((avant) => Math.round((avant + 0.1) * 10) / 10)}
              className="flex size-9 items-center justify-center rounded-lg border border-gray-300 bg-white disabled:opacity-40 dark:border-gray-800 dark:bg-gray-900"
            >
              <Plus aria-hidden="true" className="size-4" />
            </button>
            <span className={`text-sm ${SECONDAIRE}`}>
              {pages} page{pages > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {grandEcran && (
          <aside className="flex flex-col gap-4 print:hidden">
            {panneauDroit}
            {reglesPays}
          </aside>
        )}
      </div>

      {/* Téléphone et tablette : les panneaux s'ouvrent en feuilles du bas. */}
      {!grandEcran && (
        <div className="flex flex-col gap-4 print:hidden">
          <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-10 flex gap-2 md:bottom-4">
            <button
              type="button"
              aria-expanded={feuilleMobile === 'blocs'}
              onClick={() => setFeuilleMobile(feuilleMobile === 'blocs' ? null : 'blocs')}
              className={`flex-1 shadow-sm ${BOUTON_SECONDAIRE}`}
            >
              Blocs
            </button>
            <button
              type="button"
              aria-expanded={feuilleMobile === 'reglages'}
              onClick={() => setFeuilleMobile(feuilleMobile === 'reglages' ? null : 'reglages')}
              className={`flex-1 shadow-sm ${BOUTON_SECONDAIRE}`}
            >
              {mode === 'robot' ? 'Robot' : 'Style'}
            </button>
          </div>
          {feuilleMobile && (
            <div
              role="dialog"
              aria-label={
                feuilleMobile === 'blocs' ? 'Blocs' : mode === 'robot' ? 'Robot' : 'Style'
              }
              className="fixed inset-x-0 bottom-0 z-30 max-h-[75dvh] overflow-y-auto rounded-t-3xl border-t border-gray-200 bg-[#f4f5f9] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl dark:border-gray-800 dark:bg-gray-950"
            >
              <div className="mb-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setFeuilleMobile(null)}
                  className="text-sm font-semibold text-primary-600 dark:text-primary-300"
                >
                  Fermer
                </button>
              </div>
              <div className="flex flex-col gap-4">
                {feuilleMobile === 'blocs' ? panneauBlocs : panneauDroit}
              </div>
            </div>
          )}
          {reglesPays}
        </div>
      )}
    </div>
  );
}

/**
 * Générateur de CV (maquette du 18 novembre 2026) : le même profil, mis en forme selon les usages
 * du pays visé et adapté à une offre, dans une page arrangée à la façon de Canva (mode Design) ou
 * lisible par les logiciels de tri des candidatures (mode Robot).
 */
export function Cv() {
  const [params, setParams] = useSearchParams();
  const profil = useProfilCv();
  const candidatures = useCandidatures();
  const misesEnPage = useMisesEnPage();
  const offreId = params.get('offre');
  const offre = useOffreCv(offreId);
  const onglet = params.get('onglet') === 'profil' ? 'profil' : 'apercu';
  const mode: ModeCv = params.get('mode') === 'robot' ? 'robot' : 'design';
  const paysParam = params.get('pays');
  const pays: PaysCv = estPays(paysParam)
    ? paysParam
    : estPays(offre.data?.pays ?? null)
      ? (offre.data!.pays as PaysCv)
      : 'JP';
  const convention = CONVENTIONS_CV[pays];
  const langueParam = params.get('langue') as LangueCv | null;
  const langue = langueParam && LANGUES_CV.includes(langueParam) ? langueParam : convention.langue;

  function changer(cle: string, valeur: string | null) {
    const suivants = new URLSearchParams(params);
    if (valeur) suivants.set(cle, valeur);
    else suivants.delete(cle);
    // Changer de pays revient à la langue de ce pays.
    if (cle === 'pays') suivants.delete('langue');
    setParams(suivants, { replace: true });
  }

  const offresSuivies = (candidatures.data ?? []).flatMap((candidature) =>
    candidature.offre ? [candidature.offre] : [],
  );

  if (profil.isPending || misesEnPage.isPending) return <p className={SECONDAIRE}>Chargement…</p>;
  if (profil.isError) {
    return (
      <p role="alert" className="font-bold text-red-700 dark:text-red-400">
        Le profil n'a pas pu être chargé. Vérifie ta connexion.
      </p>
    );
  }
  const vide = !profil.data.nom && profil.data.experiences.length === 0;
  const cle = cleMiseEnPage(pays, offreId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div className="flex flex-col gap-1">
          <Link
            to="/plus"
            className="self-start text-sm font-medium text-primary-600 dark:text-primary-300"
          >
            Plus
          </Link>
          <h1 className="text-[1.75rem] font-extrabold tracking-[-0.02em]">Générateur de CV</h1>
        </div>
        <div role="tablist" aria-label="Sections du générateur" className="flex gap-2">
          {(
            [
              ['apercu', 'Mise en page'],
              ['profil', 'Mon profil'],
            ] as const
          ).map(([id, libelle]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={onglet === id}
              onClick={() => changer('onglet', id === 'profil' ? 'profil' : null)}
              className={pilule(onglet === id)}
            >
              {libelle}
            </button>
          ))}
        </div>
      </div>

      {onglet === 'profil' ? (
        <div className="max-w-3xl">
          <p className={`mb-4 ${SECONDAIRE}`}>
            Un seul profil, mis en forme selon ce qui se fait dans chaque pays. Rien n'est inventé
            ni traduit automatiquement : le CV ne contient que ce que tu as saisi.
          </p>
          <EditeurCv profil={profil.data} />
        </div>
      ) : (
        <>
          {vide && (
            <div className="print:hidden">
              <ImportCvPdf profil={profil.data} />
            </div>
          )}
          <Editeur
            key={cle}
            profil={profil.data}
            pays={pays}
            langue={langue}
            offre={offre.data ?? null}
            enregistree={misesEnPage.data?.[cle]}
            cle={cle}
            mode={mode}
            changer={changer}
            offresSuivies={offresSuivies}
          />
        </>
      )}
    </div>
  );
}
