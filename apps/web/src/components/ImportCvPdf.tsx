import {
  fusionnerProfil,
  LANGUES_CV,
  lireCv,
  type CvLu,
  type LangueCv,
  type ModeFusion,
  type PagePdf,
  type ProfilCv,
} from '@stageradar/shared';
import { FileUp } from 'lucide-react';
import { useState, type DragEvent } from 'react';
import { useEnregistrerProfilCv } from '../lib/cv';
import { lirePdf, PdfSansTexte } from '../lib/pdf';
import { BOUTON_PRINCIPAL, BOUTON_SECONDAIRE, CARTE, pilule, SECONDAIRE } from '../lib/ui';

const NOMS_LANGUE: Record<LangueCv, string> = { fr: 'Français', en: 'Anglais', es: 'Espagnol' };

function Ligne({
  libelle,
  valeur,
  liste = false,
}: {
  libelle: string;
  valeur: string | string[];
  /** Une entrée par ligne (expériences, formations). */
  liste?: boolean;
}) {
  const vide = Array.isArray(valeur) ? valeur.length === 0 : !valeur;
  return (
    <div className="grid grid-cols-[9rem_minmax(0,1fr)] gap-x-3 border-t border-gray-100 py-1.5 text-sm dark:border-gray-800">
      <dt className={SECONDAIRE}>{libelle}</dt>
      <dd className={vide ? `${SECONDAIRE} italic` : ''}>
        {vide ? (
          'non trouvé'
        ) : Array.isArray(valeur) && liste ? (
          <ul className="flex flex-col gap-0.5">
            {valeur.map((entree) => (
              <li key={entree}>{entree}</li>
            ))}
          </ul>
        ) : Array.isArray(valeur) ? (
          valeur.join(' · ')
        ) : (
          valeur
        )}
      </dd>
    </div>
  );
}

/**
 * « Glisse ton CV en PDF ici » : le PDF est lu sur l'appareil (pdf.js), son texte rangé dans les
 * champs du profil sans IA, puis montré pour vérification avant d'être enregistré.
 */
export function ImportCvPdf({
  profil,
  onApplique,
}: {
  profil: ProfilCv;
  /** Appelé avec le profil complété, une fois enregistré. */
  onApplique?: (profil: ProfilCv) => void;
}) {
  const enregistrer = useEnregistrerProfilCv();
  const [survol, setSurvol] = useState(false);
  const [lecture, setLecture] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [pages, setPages] = useState<PagePdf[] | null>(null);
  const [nomFichier, setNomFichier] = useState('');
  const [langue, setLangue] = useState<LangueCv | null>(null);
  const profilVide =
    !profil.nom && profil.experiences.length === 0 && profil.formations.length === 0;
  const [mode, setMode] = useState<ModeFusion>(profilVide ? 'remplacer' : 'completer');
  const [fini, setFini] = useState(false);

  // Le texte est relu dans la langue choisie si la détection s'est trompée.
  const lu: CvLu | null = pages ? lireCv(pages) : null;
  const resultat: CvLu | null =
    lu && langue && langue !== lu.langue ? relireDansLaLangue(lu, langue) : lu;

  async function lire(fichier: File | undefined) {
    if (!fichier) return;
    setErreur(null);
    setFini(false);
    setPages(null);
    setLangue(null);
    if (fichier.type !== 'application/pdf' && !/\.pdf$/i.test(fichier.name)) {
      setErreur('Ce fichier n’est pas un PDF.');
      return;
    }
    setLecture(true);
    try {
      setPages(await lirePdf(fichier));
      setNomFichier(fichier.name);
    } catch (probleme) {
      setErreur(
        probleme instanceof PdfSansTexte
          ? 'Ce PDF ne contient pas de texte : c’est sans doute une image (scan, export en image). Exporte ton CV en PDF depuis Word, Canva ou Google Docs, puis réessaie.'
          : 'Ce PDF n’a pas pu être lu.',
      );
    } finally {
      setLecture(false);
    }
  }

  function deposer(evenement: DragEvent) {
    evenement.preventDefault();
    setSurvol(false);
    void lire(evenement.dataTransfer.files[0]);
  }

  function appliquer() {
    if (!resultat) return;
    const nouveau = fusionnerProfil(profil, resultat, mode);
    enregistrer.mutate(nouveau, {
      onSuccess: () => {
        setFini(true);
        setPages(null);
        onApplique?.(nouveau);
      },
    });
  }

  const p = resultat?.profil;
  const l = resultat?.langue ?? 'fr';

  return (
    <section aria-labelledby="titre-import-pdf" className={`flex flex-col gap-4 ${CARTE}`}>
      <h2 id="titre-import-pdf" className="font-bold">
        Remplir mon profil depuis mon CV (PDF)
      </h2>
      <label
        onDragOver={(evenement) => {
          evenement.preventDefault();
          setSurvol(true);
        }}
        onDragLeave={() => setSurvol(false)}
        onDrop={deposer}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${
          survol
            ? 'border-primary-600 bg-primary-50 dark:border-primary-400 dark:bg-primary-400/15'
            : 'border-gray-300 hover:border-primary-400 dark:border-gray-700'
        }`}
      >
        <FileUp
          aria-hidden="true"
          className="size-8 text-primary-600 dark:text-primary-300"
          strokeWidth={1.6}
        />
        <span className="text-base font-bold">
          {lecture ? 'Lecture du PDF…' : 'Glisse ton CV en PDF ici'}
        </span>
        <span className={`text-sm ${SECONDAIRE}`}>
          ou clique pour choisir le fichier. Il est lu sur ton appareil, rien n’est envoyé.
        </span>
        <input
          type="file"
          accept="application/pdf,.pdf"
          aria-label="CV en PDF"
          onChange={(evenement) => {
            void lire(evenement.target.files?.[0]);
            evenement.target.value = '';
          }}
          className="sr-only"
        />
      </label>

      {erreur && (
        <p role="alert" className="text-sm font-semibold text-red-700 dark:text-red-400">
          {erreur}
        </p>
      )}
      {fini && (
        <p role="status" className="text-sm font-semibold text-vert-700 dark:text-vert-50">
          Profil rempli depuis ton CV et enregistré. Vérifie les champs ci-dessous, puis ouvre «
          Mise en page » pour l’arranger.
        </p>
      )}

      {resultat && p && (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            <strong>{nomFichier}</strong> : voici ce qui a été trouvé, sans IA. Vérifie avant
            d’appliquer ; tout reste modifiable ensuite.
          </p>
          <div role="group" aria-label="Langue du CV" className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">Langue du CV</span>
            {LANGUES_CV.map((code) => (
              <button
                key={code}
                type="button"
                aria-pressed={l === code}
                onClick={() => setLangue(code)}
                className={pilule(l === code)}
              >
                {NOMS_LANGUE[code]}
              </button>
            ))}
          </div>
          <dl aria-label="Ce qui a été trouvé">
            <Ligne libelle="Nom" valeur={[p.prenom, p.nom].filter(Boolean).join(' ')} />
            <Ligne libelle="Titre" valeur={p.titre[l] ?? ''} />
            <Ligne libelle="E-mail" valeur={p.email} />
            <Ligne libelle="Téléphone" valeur={p.telephone} />
            <Ligne libelle="Adresse" valeur={p.adresse} />
            <Ligne libelle="Liens" valeur={p.liens.map((lien) => lien.url)} />
            <Ligne libelle="Résumé" valeur={p.resume[l] ?? ''} />
            <Ligne
              liste
              libelle={`Expériences (${p.experiences.length})`}
              valeur={p.experiences.map((experience) =>
                [
                  experience.poste[l],
                  experience.entreprise,
                  [experience.debut, experience.fin].filter(Boolean).join('–'),
                ]
                  .filter(Boolean)
                  .join(', '),
              )}
            />
            <Ligne
              liste
              libelle={`Formations (${p.formations.length})`}
              valeur={p.formations.map((formation) =>
                [
                  formation.diplome[l],
                  formation.etablissement,
                  [formation.debut, formation.fin].filter(Boolean).join('–'),
                ]
                  .filter(Boolean)
                  .join(', '),
              )}
            />
            <Ligne libelle="Compétences" valeur={p.competences} />
            <Ligne libelle="Langues" valeur={p.langues[l] ?? []} />
            <Ligne libelle="Projets" valeur={p.projets.map((projet) => projet.nom)} />
            <Ligne libelle="Centres d’intérêt" valeur={p.interets[l] ?? []} />
          </dl>
          {resultat.nonClasse.length > 0 && (
            <details>
              <summary className="cursor-pointer text-sm font-semibold">
                {resultat.nonClasse.length} ligne{resultat.nonClasse.length > 1 ? 's' : ''} sans
                place, à recopier à la main si besoin
              </summary>
              <ul className={`mt-1 list-disc pl-5 text-sm ${SECONDAIRE}`}>
                {resultat.nonClasse.map((texte) => (
                  <li key={texte}>{texte}</li>
                ))}
              </ul>
            </details>
          )}
          <fieldset className="flex flex-wrap items-center gap-2">
            <legend className="mb-1.5 text-sm font-semibold">Ton profil actuel</legend>
            <button
              type="button"
              aria-pressed={mode === 'completer'}
              onClick={() => setMode('completer')}
              className={pilule(mode === 'completer')}
            >
              Compléter ce qui est vide
            </button>
            <button
              type="button"
              aria-pressed={mode === 'remplacer'}
              onClick={() => setMode('remplacer')}
              className={pilule(mode === 'remplacer')}
            >
              Remplacer par le CV ({NOMS_LANGUE[l].toLowerCase()})
            </button>
          </fieldset>
          {enregistrer.isError && (
            <p role="alert" className="text-sm font-semibold text-red-700 dark:text-red-400">
              Le profil n’a pas pu être enregistré. Vérifie ta connexion.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={enregistrer.isPending}
              onClick={appliquer}
              className={BOUTON_PRINCIPAL}
            >
              Appliquer à mon profil
            </button>
            <button type="button" onClick={() => setPages(null)} className={BOUTON_SECONDAIRE}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/** Le même texte, rangé dans une autre langue que celle détectée. */
function relireDansLaLangue(lu: CvLu, langue: LangueCv): CvLu {
  const deplacer = <T,>(valeur: Partial<Record<LangueCv, T>>) => {
    const contenu = valeur[lu.langue];
    return contenu === undefined ? {} : { [langue]: contenu };
  };
  const p = lu.profil;
  return {
    ...lu,
    langue,
    profil: {
      ...p,
      titre: deplacer(p.titre),
      resume: deplacer(p.resume),
      permis: deplacer(p.permis),
      langues: deplacer(p.langues),
      interets: deplacer(p.interets),
      experiences: p.experiences.map((experience) => ({
        ...experience,
        poste: deplacer(experience.poste),
        points: deplacer(experience.points),
      })),
      formations: p.formations.map((formation) => ({
        ...formation,
        diplome: deplacer(formation.diplome),
        details: deplacer(formation.details),
      })),
      projets: p.projets.map((projet) => ({
        ...projet,
        description: deplacer(projet.description),
      })),
    },
  };
}
