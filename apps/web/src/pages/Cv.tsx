import {
  CONVENTIONS_CV,
  genererCv,
  LANGUES_CV,
  LIBELLES_PAYS,
  PAYS_CV,
  type CvGenere,
  type LangueCv,
  type PaysCv,
} from '@stageradar/shared';
import { ExternalLink, Printer } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router';
import { EditeurCv } from '../components/EditeurCv';
import { Flag } from '../components/Flag';
import { useOffreCv, useProfilCv } from '../lib/cv';
import { useAjouterDocument, useDocuments } from '../lib/documents';
import { LIBELLES_LANGUE } from '../lib/offres';
import { useCandidatures } from '../lib/suivi';
import {
  BADGE,
  BOUTON_PRINCIPAL,
  BOUTON_SECONDAIRE,
  CARTE,
  CHAMP,
  pilule,
  SECONDAIRE,
} from '../lib/ui';

const NOMS_LANGUE: Record<LangueCv, string> = { fr: 'Français', en: 'Anglais', es: 'Espagnol' };

/** Hauteur utile d'une page A4 imprimée (297 mm moins 2 × 12 mm de marge), en pixels CSS. */
const HAUTEUR_PAGE_PX = (273 * 96) / 25.4;
/** Largeur d'une feuille A4 (210 mm), en pixels CSS. */
const LARGEUR_FEUILLE_PX = (210 * 96) / 25.4;

function estPays(valeur: string | null): valeur is PaysCv {
  return (PAYS_CV as readonly string[]).includes(valeur ?? '');
}

/** Le CV lui-même : toujours noir sur blanc, à la largeur d'une page A4 sans ses marges. */
function ContenuCv({ cv }: { cv: CvGenere }) {
  return (
    <div lang={cv.langue} className="w-[186mm] text-[10pt] leading-snug text-gray-950">
      <header className="border-b-2 border-gray-950 pb-3">
        <h2 className="text-[20pt] font-extrabold tracking-tight text-gray-950">
          {cv.nom || 'Prénom NOM'}
        </h2>
        {cv.titre && <p className="mt-0.5 text-[12pt] font-bold text-cyan-800">{cv.titre}</p>}
        <p className="mt-1.5 text-[9pt] text-gray-700">
          {[
            ...cv.coordonnees,
            ...cv.liens.map((lien) => lien.url.replace(/^https?:\/\//, '')),
          ].join('  ·  ')}
        </p>
      </header>
      {cv.sections.map((section) => (
        <section key={section.id} className="mt-4">
          <h3 className="break-after-avoid border-b border-gray-300 pb-0.5 text-[10.5pt] font-extrabold tracking-wide text-cyan-800 uppercase">
            {section.titre}
          </h3>
          {section.elements.map((element, rang) => (
            <div key={rang} className="mt-2 break-inside-avoid">
              {(element.titre || element.dates) && (
                <div className="flex items-baseline justify-between gap-4">
                  <p className="font-bold">{element.titre}</p>
                  {element.dates && (
                    <p className="shrink-0 text-[9pt] text-gray-600">{element.dates}</p>
                  )}
                </div>
              )}
              {element.sousTitre && <p className="text-[9pt] text-gray-600">{element.sousTitre}</p>}
              {element.texte && (
                <p className="mt-0.5 whitespace-pre-line">
                  {element.enAvant && element.enAvant.length > 0
                    ? element.texte.split(' · ').map((competence, position) => (
                        <span key={competence}>
                          {position > 0 && ' · '}
                          {element.enAvant?.includes(competence) ? (
                            <strong>{competence}</strong>
                          ) : (
                            competence
                          )}
                        </span>
                      ))
                    : element.texte}
                </p>
              )}
              {element.points && element.points.length > 0 && (
                <ul className="mt-0.5 list-disc pl-4">
                  {element.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

/**
 * Aperçu à l'écran, plus un exemplaire posé directement dans <body> : à l'impression, lui seul
 * est affiché (voir index.css), sans la navigation ni les marges de l'application.
 */
function FeuilleCv({ cv, surPages }: { cv: CvGenere; surPages: (pages: number) => void }) {
  const cadre = useRef<HTMLDivElement>(null);
  const feuille = useRef<HTMLDivElement>(null);
  const [echelle, setEchelle] = useState(1);

  useEffect(() => {
    const element = feuille.current;
    if (!element) return;
    const observer = new ResizeObserver(() =>
      surPages(Math.max(1, Math.ceil(element.offsetHeight / HAUTEUR_PAGE_PX))),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [surPages]);

  // La feuille garde sa vraie taille (A4) et se réduit pour tenir dans la colonne.
  useEffect(() => {
    const element = cadre.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      const style = getComputedStyle(element);
      const largeur =
        element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      setEchelle(Math.min(1, largeur / LARGEUR_FEUILLE_PX));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div
        ref={cadre}
        className="rounded-3xl border border-gray-200 bg-gray-200 p-3 sm:p-6 dark:border-gray-800 dark:bg-gray-850"
      >
        <div className="mx-auto w-fit bg-white p-[12mm] shadow-sm" style={{ zoom: echelle }}>
          <div ref={feuille} data-testid="cv-feuille">
            <ContenuCv cv={cv} />
          </div>
        </div>
      </div>
      {createPortal(
        <div className="cv-impression" aria-hidden="true">
          <ContenuCv cv={cv} />
        </div>,
        document.body,
      )}
    </>
  );
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

/**
 * Générateur de CV : le même profil, mis en forme selon les usages du pays visé, et adapté à
 * une offre précise (compétences demandées en tête, points d'expérience réordonnés).
 */
export function Cv() {
  const [params, setParams] = useSearchParams();
  const profil = useProfilCv();
  const candidatures = useCandidatures();
  const documents = useDocuments();
  const ajouterDocument = useAjouterDocument();
  const offreId = params.get('offre');
  const offre = useOffreCv(offreId);
  const onglet = params.get('onglet') === 'profil' ? 'profil' : 'apercu';
  const paysParam = params.get('pays');
  const pays: PaysCv = estPays(paysParam)
    ? paysParam
    : estPays(offre.data?.pays ?? null)
      ? (offre.data!.pays as PaysCv)
      : 'JP';
  const convention = CONVENTIONS_CV[pays];
  const langueParam = params.get('langue') as LangueCv | null;
  const langue = langueParam && LANGUES_CV.includes(langueParam) ? langueParam : convention.langue;
  const [dateNaissance, setDateNaissance] = useState<boolean | undefined>(undefined);
  const [nationalite, setNationalite] = useState<boolean | undefined>(undefined);
  const [pages, setPages] = useState(1);

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

  if (profil.isPending) return <p className={SECONDAIRE}>Chargement…</p>;
  if (profil.isError) {
    return (
      <p role="alert" className="font-bold text-red-700 dark:text-red-400">
        Le profil n'a pas pu être chargé. Vérifie ta connexion.
      </p>
    );
  }

  const cv = genererCv(profil.data, pays, {
    langue,
    offre: offre.data ?? null,
    dateNaissance,
    nationalite,
  });
  const vide = !profil.data.nom && profil.data.experiences.length === 0;
  const titreDocument = `${convention.nom} ${LIBELLES_PAYS[pays]}${
    offre.data ? ` : ${[offre.data.entreprise, offre.data.titre].filter(Boolean).join(', ')}` : ''
  }`;
  const versionSuivante =
    Math.max(
      0,
      ...(documents.data ?? [])
        .filter((document) => document.type === 'cv' && document.titre === titreDocument)
        .map((document) => document.version),
    ) + 1;

  const dejaNote =
    ajouterDocument.isSuccess &&
    ajouterDocument.variables.titre === titreDocument &&
    ajouterDocument.variables.langue === langue;

  return (
    <div className="max-w-6xl">
      <div className="print:hidden">
        <h1 className="text-2xl font-extrabold tracking-tight">Générateur de CV</h1>
        <p className={`mt-1 max-w-3xl ${SECONDAIRE}`}>
          Un seul profil, mis en forme selon ce qui se fait dans chaque pays et adapté à l'offre
          visée. Chaque règle renvoie à sa source. Rien n'est inventé ni traduit automatiquement :
          le CV ne contient que ce que tu as saisi.
        </p>

        <div role="tablist" aria-label="Sections du générateur" className="mt-5 flex gap-2">
          {(
            [
              ['apercu', 'CV par pays'],
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
        <div className="mt-5 max-w-3xl">
          <EditeurCv profil={profil.data} />
        </div>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap gap-2 print:hidden" role="group" aria-label="Pays">
            {PAYS_CV.map((code) => (
              <button
                key={code}
                type="button"
                aria-pressed={pays === code}
                onClick={() => changer('pays', code)}
                className={`inline-flex items-center gap-2 ${pilule(pays === code)}`}
              >
                <Flag code={code} />
                {LIBELLES_PAYS[code]}
              </button>
            ))}
          </div>

          {vide && (
            <p className={`mt-4 print:hidden ${CARTE}`}>
              Ton profil est vide. Remplis-le dans « Mon profil », ou importe un fichier JSON.
            </p>
          )}

          <div className="mt-4 grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
            <aside className="space-y-4 print:hidden">
              <section className={CARTE}>
                <div className="grid gap-3">
                  <label className="block text-sm font-bold">
                    Langue du CV
                    <select
                      value={langue}
                      onChange={(evenement) => changer('langue', evenement.target.value)}
                      className={CHAMP}
                    >
                      {LANGUES_CV.map((code) => (
                        <option key={code} value={code}>
                          {NOMS_LANGUE[code]}
                          {code === convention.langue ? ' (usage du pays)' : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-bold">
                    Adapter à une offre
                    <select
                      value={offreId ?? ''}
                      onChange={(evenement) => changer('offre', evenement.target.value || null)}
                      className={CHAMP}
                    >
                      <option value="">Aucune : CV général</option>
                      {offre.data &&
                        !offresSuivies.some((suivie) => suivie.id === offre.data?.id) && (
                          <option value={offre.data.id}>
                            {[offre.data.entreprise, offre.data.titre].filter(Boolean).join(' : ')}
                          </option>
                        )}
                      {offresSuivies.map((suivie) => (
                        <option key={suivie.id} value={suivie.id}>
                          {[suivie.entreprise, suivie.titre].filter(Boolean).join(' : ')}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-sm font-bold">
                    <input
                      type="checkbox"
                      checked={dateNaissance ?? convention.dateNaissance}
                      onChange={(evenement) => setDateNaissance(evenement.target.checked)}
                      className="size-4 accent-primary-600"
                    />
                    Date de naissance
                  </label>
                  <label className="flex items-center gap-2 text-sm font-bold">
                    <input
                      type="checkbox"
                      checked={nationalite ?? convention.nationalite}
                      onChange={(evenement) => setNationalite(evenement.target.checked)}
                      className="size-4 accent-primary-600"
                    />
                    Nationalité
                  </label>
                </div>
              </section>

              <section className={CARTE}>
                <h2 className="font-bold">Ce qui se fait : {LIBELLES_PAYS[pays]}</h2>
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
              </section>

              {offre.data && cv.attentes && (
                <section className={CARTE}>
                  <h2 className="font-bold">Ce que l'offre attend</h2>
                  <p className={`mt-1 text-sm ${SECONDAIRE}`}>
                    {[offre.data.entreprise, offre.data.titre].filter(Boolean).join(' : ')}
                  </p>
                  {cv.attentes.trouvees.length > 0 && (
                    <>
                      <p className="mt-3 text-sm font-bold">Déjà dans ton CV, mis en avant</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {cv.attentes.trouvees.map((competence) => (
                          <span key={competence} className={BADGE.accent}>
                            {competence}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                  {cv.attentes.absentes.length > 0 && (
                    <>
                      <p className="mt-3 text-sm font-bold">Citées par l'offre, absentes du CV</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {cv.attentes.absentes.map((technologie) => (
                          <span key={technologie} className={BADGE.ambre}>
                            {technologie}
                          </span>
                        ))}
                      </div>
                      <p className={`mt-1.5 text-xs ${SECONDAIRE}`}>
                        Si tu les as vraiment pratiquées, ajoute-les à ton profil ; sinon, n'en mets
                        pas.
                      </p>
                    </>
                  )}
                  {cv.attentes.languesAbsentes.length > 0 && (
                    <p className="mt-3 text-sm font-bold text-red-700 dark:text-red-400">
                      Langue exigée que ton profil ne cite pas :{' '}
                      {cv.attentes.languesAbsentes
                        .map((code) => LIBELLES_LANGUE[code] ?? code)
                        .join(', ')}
                    </p>
                  )}
                  {cv.attentes.trouvees.length === 0 &&
                    cv.attentes.absentes.length === 0 &&
                    cv.attentes.languesAbsentes.length === 0 && (
                      <p className={`mt-3 text-sm ${SECONDAIRE}`}>
                        L'offre ne cite aucun outil reconnu.
                      </p>
                    )}
                  {offre.data.description === null && (
                    <p className={`mt-3 text-sm ${SECONDAIRE}`}>
                      Cette offre n'a pas de description.
                    </p>
                  )}
                </section>
              )}

              {cv.alertes.length > 0 && (
                <section className={CARTE}>
                  <h2 className="font-bold">À revoir dans ton profil</h2>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                    {cv.alertes.map((alerte) => (
                      <li key={alerte}>{alerte}</li>
                    ))}
                  </ul>
                </section>
              )}
            </aside>

            <div>
              <div className="mb-3 flex flex-wrap items-center gap-3 print:hidden">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className={`inline-flex items-center gap-2 ${BOUTON_PRINCIPAL}`}
                >
                  <Printer aria-hidden="true" className="size-4" /> Imprimer ou PDF
                </button>
                <button
                  type="button"
                  disabled={ajouterDocument.isPending || dejaNote}
                  onClick={() =>
                    ajouterDocument.mutate({
                      type: 'cv',
                      langue,
                      titre: titreDocument,
                      version: versionSuivante,
                      chemin_stockage: null,
                      notes: 'Généré par le générateur de CV',
                    })
                  }
                  className={BOUTON_SECONDAIRE}
                >
                  {dejaNote ? 'Noté dans Documents' : 'Noter dans Documents'}
                </button>
                <span
                  className={
                    convention.pagesMax !== undefined && pages > convention.pagesMax
                      ? BADGE.rouge
                      : BADGE.neutre
                  }
                >
                  {pages} page{pages > 1 ? 's' : ''} environ
                  {convention.pagesMax !== undefined && ` · ${convention.pagesMax} au plus`}
                </span>
              </div>
              <FeuilleCv cv={cv} surPages={setPages} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
