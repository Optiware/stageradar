import {
  LANGUES_CV,
  profilCvComplet,
  type ExperienceCv,
  type FormationCv,
  type LangueCv,
  type ListeTraduite,
  type ProfilCv,
  type ProjetCv,
  type Traduit,
} from '@stageradar/shared';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { useEnregistrerProfilCv } from '../lib/cv';
import { telecharger } from '../lib/telechargement';
import {
  BOUTON_DOUX,
  BOUTON_PRINCIPAL,
  BOUTON_SECONDAIRE,
  CARTE,
  CHAMP,
  pilule,
  SECONDAIRE,
} from '../lib/ui';

const LIBELLE = 'block text-sm font-bold';
const NOMS_LANGUE: Record<LangueCv, string> = { fr: 'Français', en: 'Anglais', es: 'Espagnol' };

const EXPERIENCE_VIDE: ExperienceCv = {
  poste: {},
  entreprise: '',
  lieu: '',
  debut: '',
  fin: '',
  points: {},
};
const FORMATION_VIDE: FormationCv = {
  diplome: {},
  etablissement: '',
  lieu: '',
  debut: '',
  fin: '',
  superieur: true,
  details: {},
};
const PROJET_VIDE: ProjetCv = { nom: '', url: '', description: {} };

/** Rappel de la version française, pour traduire sans changer d'onglet. */
function rappel(valeur: string | undefined, langue: LangueCv): string | undefined {
  return langue !== 'fr' && valeur ? `fr : ${valeur}` : undefined;
}

function Champ({
  libelle,
  valeur,
  onChange,
  placeholder,
  large = false,
}: {
  libelle: string;
  valeur: string;
  onChange: (valeur: string) => void;
  placeholder?: string;
  large?: boolean;
}) {
  return (
    <label className={`${LIBELLE} ${large ? 'sm:col-span-2' : ''}`}>
      {libelle}
      <input
        value={valeur}
        placeholder={placeholder}
        onChange={(evenement) => onChange(evenement.target.value)}
        className={CHAMP}
      />
    </label>
  );
}

function ChampTraduit({
  libelle,
  valeur,
  langue,
  onChange,
  multiligne = false,
}: {
  libelle: string;
  valeur: Traduit;
  langue: LangueCv;
  onChange: (valeur: Traduit) => void;
  multiligne?: boolean;
}) {
  const proprietes = {
    value: valeur[langue] ?? '',
    placeholder: rappel(valeur.fr, langue),
    onChange: (evenement: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange({ ...valeur, [langue]: evenement.target.value }),
    className: CHAMP,
  };
  return (
    <label className={`${LIBELLE} ${multiligne ? 'sm:col-span-2' : ''}`}>
      {libelle} ({NOMS_LANGUE[langue].toLowerCase()})
      {multiligne ? <textarea rows={4} {...proprietes} /> : <input {...proprietes} />}
    </label>
  );
}

/** Liste traduite saisie une ligne par élément. */
function Lignes({
  libelle,
  valeur,
  langue,
  onChange,
}: {
  libelle: string;
  valeur: ListeTraduite;
  langue: LangueCv;
  onChange: (valeur: ListeTraduite) => void;
}) {
  return (
    <label className={`${LIBELLE} sm:col-span-2`}>
      {libelle} ({NOMS_LANGUE[langue].toLowerCase()}, une ligne par élément)
      <textarea
        rows={Math.max(3, (valeur[langue]?.length ?? 0) + 1)}
        value={(valeur[langue] ?? []).join('\n')}
        placeholder={langue !== 'fr' ? (valeur.fr ?? []).join('\n') : undefined}
        onChange={(evenement) =>
          onChange({ ...valeur, [langue]: evenement.target.value.split('\n') })
        }
        className={CHAMP}
      />
    </label>
  );
}

function Bloc({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section className={`mt-4 ${CARTE}`}>
      <h2 className="font-bold">{titre}</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

/** Boutons monter, descendre, supprimer d'un élément de liste. */
function Ordre({
  nom,
  rang,
  total,
  deplacer,
  supprimer,
}: {
  nom: string;
  rang: number;
  total: number;
  deplacer: (vers: number) => void;
  supprimer: () => void;
}) {
  const bouton =
    'rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-950 disabled:opacity-30 dark:hover:bg-gray-800 dark:hover:text-gray-50';
  return (
    <div className="flex gap-1 sm:col-span-2 sm:justify-end">
      <button
        type="button"
        aria-label={`Monter ${nom}`}
        disabled={rang === 0}
        onClick={() => deplacer(rang - 1)}
        className={bouton}
      >
        <ArrowUp aria-hidden="true" className="size-4" />
      </button>
      <button
        type="button"
        aria-label={`Descendre ${nom}`}
        disabled={rang === total - 1}
        onClick={() => deplacer(rang + 1)}
        className={bouton}
      >
        <ArrowDown aria-hidden="true" className="size-4" />
      </button>
      <button type="button" aria-label={`Supprimer ${nom}`} onClick={supprimer} className={bouton}>
        <Trash2 aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}

function deplacer<T>(liste: T[], de: number, vers: number): T[] {
  const copie = [...liste];
  const [element] = copie.splice(de, 1);
  if (element !== undefined) copie.splice(vers, 0, element);
  return copie;
}

function remplacer<T>(liste: T[], rang: number, element: T): T[] {
  return liste.map((autre, position) => (position === rang ? element : autre));
}

/**
 * Saisie du profil d'où partent tous les CV. Les textes s'écrivent dans chaque langue :
 * l'application ne traduit rien d'elle-même, pour qu'aucun CV ne contienne une phrase non relue.
 */
export function EditeurCv({ profil }: { profil: ProfilCv }) {
  const enregistrer = useEnregistrerProfilCv();
  const [brouillon, setBrouillon] = useState(profil);
  const [langue, setLangue] = useState<LangueCv>('fr');
  const [erreurImport, setErreurImport] = useState<string | null>(null);
  const fichier = useRef<HTMLInputElement>(null);
  const modifie = JSON.stringify(brouillon) !== JSON.stringify(profil);

  function changer<K extends keyof ProfilCv>(cle: K, valeur: ProfilCv[K]) {
    setBrouillon((actuel) => ({ ...actuel, [cle]: valeur }));
  }

  async function importer(evenement: ChangeEvent<HTMLInputElement>) {
    const choisi = evenement.target.files?.[0];
    evenement.target.value = '';
    if (!choisi) return;
    try {
      const valeur: unknown = JSON.parse(await choisi.text());
      if (!valeur || typeof valeur !== 'object' || Array.isArray(valeur)) throw new Error();
      setBrouillon(profilCvComplet(valeur));
      setErreurImport(null);
    } catch {
      setErreurImport("Ce fichier n'est pas un profil de CV (JSON) lisible.");
    }
  }

  return (
    <div>
      <div className={`flex flex-wrap items-center gap-2 ${CARTE}`}>
        <span className="mr-1 text-sm font-bold">Langue de saisie</span>
        {LANGUES_CV.map((code) => (
          <button
            key={code}
            type="button"
            aria-pressed={langue === code}
            onClick={() => setLangue(code)}
            className={pilule(langue === code)}
          >
            {NOMS_LANGUE[code]}
          </button>
        ))}
        <p className={`basis-full text-sm ${SECONDAIRE}`}>
          Les champs marqués d'une langue s'écrivent dans chacune : un CV espagnol n'utilise que les
          textes saisis en espagnol. Les autres champs servent à tous les CV.
        </p>
      </div>

      <Bloc titre="Identité et contact">
        <Champ libelle="Prénom" valeur={brouillon.prenom} onChange={(v) => changer('prenom', v)} />
        <Champ libelle="Nom" valeur={brouillon.nom} onChange={(v) => changer('nom', v)} />
        <ChampTraduit
          libelle="Titre"
          valeur={brouillon.titre}
          langue={langue}
          onChange={(v) => changer('titre', v)}
        />
        <Champ libelle="E-mail" valeur={brouillon.email} onChange={(v) => changer('email', v)} />
        <Champ
          libelle="Téléphone"
          valeur={brouillon.telephone}
          placeholder="+33 6 …"
          onChange={(v) => changer('telephone', v)}
        />
        <Champ
          libelle="Ville (pays où l'adresse complète ne se met pas)"
          valeur={brouillon.ville}
          onChange={(v) => changer('ville', v)}
        />
        <Champ
          libelle="Adresse complète"
          valeur={brouillon.adresse}
          large
          onChange={(v) => changer('adresse', v)}
        />
        <label className={LIBELLE}>
          Date de naissance
          <input
            type="date"
            value={brouillon.date_naissance}
            onChange={(evenement) => changer('date_naissance', evenement.target.value)}
            className={CHAMP}
          />
        </label>
        <ChampTraduit
          libelle="Nationalité"
          valeur={brouillon.nationalite}
          langue={langue}
          onChange={(v) => changer('nationalite', v)}
        />
        <ChampTraduit
          libelle="Permis"
          valeur={brouillon.permis}
          langue={langue}
          onChange={(v) => changer('permis', v)}
        />
        <ChampTraduit
          libelle="Statut de visa"
          valeur={brouillon.visa}
          langue={langue}
          onChange={(v) => changer('visa', v)}
        />
        <ChampTraduit
          libelle="Résumé"
          valeur={brouillon.resume}
          langue={langue}
          multiligne
          onChange={(v) => changer('resume', v)}
        />
        <div className="sm:col-span-2">
          <p className={LIBELLE}>Liens (GitHub, LinkedIn, portfolio)</p>
          {brouillon.liens.map((lien, rang) => (
            <div key={rang} className="mt-2 flex items-end gap-2">
              <input
                aria-label={`Nom du lien ${rang + 1}`}
                value={lien.libelle}
                placeholder="GitHub"
                onChange={(evenement) =>
                  changer(
                    'liens',
                    remplacer(brouillon.liens, rang, { ...lien, libelle: evenement.target.value }),
                  )
                }
                className={`${CHAMP} max-w-40`}
              />
              <input
                aria-label={`Adresse du lien ${rang + 1}`}
                type="url"
                value={lien.url}
                placeholder="https://github.com/…"
                onChange={(evenement) =>
                  changer(
                    'liens',
                    remplacer(brouillon.liens, rang, { ...lien, url: evenement.target.value }),
                  )
                }
                className={CHAMP}
              />
              <button
                type="button"
                aria-label={`Supprimer le lien ${rang + 1}`}
                onClick={() =>
                  changer(
                    'liens',
                    brouillon.liens.filter((_, position) => position !== rang),
                  )
                }
                className="mb-1 shrink-0 rounded-full p-2 text-gray-500 hover:text-red-700 dark:hover:text-red-400"
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => changer('liens', [...brouillon.liens, { libelle: '', url: '' }])}
            className={`mt-2 inline-flex items-center gap-1.5 ${BOUTON_DOUX}`}
          >
            <Plus aria-hidden="true" className="size-4" /> Ajouter un lien
          </button>
        </div>
      </Bloc>

      <section className="mt-6">
        <h2 className="text-lg font-extrabold">Expériences</h2>
        <p className={`text-sm ${SECONDAIRE}`}>
          De la plus récente à la plus ancienne : c'est l'ordre qu'attendent tous les pays visés.
        </p>
        {brouillon.experiences.map((experience, rang) => {
          const nom = experience.entreprise || `expérience ${rang + 1}`;
          const maj = (champs: Partial<ExperienceCv>) =>
            changer(
              'experiences',
              remplacer(brouillon.experiences, rang, { ...experience, ...champs }),
            );
          return (
            <div key={rang} className={`mt-3 grid gap-4 sm:grid-cols-2 ${CARTE}`}>
              <ChampTraduit
                libelle="Poste"
                valeur={experience.poste}
                langue={langue}
                onChange={(poste) => maj({ poste })}
              />
              <Champ
                libelle="Entreprise"
                valeur={experience.entreprise}
                onChange={(entreprise) => maj({ entreprise })}
              />
              <Champ libelle="Lieu" valeur={experience.lieu} onChange={(lieu) => maj({ lieu })} />
              <div className="grid grid-cols-2 gap-3">
                <Champ
                  libelle="Début"
                  valeur={experience.debut}
                  placeholder="AAAA ou AAAA-MM"
                  onChange={(debut) => maj({ debut })}
                />
                <Champ
                  libelle="Fin"
                  valeur={experience.fin}
                  placeholder="vide : en cours"
                  onChange={(fin) => maj({ fin })}
                />
              </div>
              <Lignes
                libelle="Missions et réussites"
                valeur={experience.points}
                langue={langue}
                onChange={(points) => maj({ points })}
              />
              <Ordre
                nom={nom}
                rang={rang}
                total={brouillon.experiences.length}
                deplacer={(vers) =>
                  changer('experiences', deplacer(brouillon.experiences, rang, vers))
                }
                supprimer={() =>
                  changer(
                    'experiences',
                    brouillon.experiences.filter((_, position) => position !== rang),
                  )
                }
              />
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => changer('experiences', [...brouillon.experiences, EXPERIENCE_VIDE])}
          className={`mt-3 inline-flex items-center gap-1.5 ${BOUTON_DOUX}`}
        >
          <Plus aria-hidden="true" className="size-4" /> Ajouter une expérience
        </button>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-extrabold">Formation</h2>
        {brouillon.formations.map((formation, rang) => {
          const nom = formation.etablissement || `formation ${rang + 1}`;
          const maj = (champs: Partial<FormationCv>) =>
            changer(
              'formations',
              remplacer(brouillon.formations, rang, { ...formation, ...champs }),
            );
          return (
            <div key={rang} className={`mt-3 grid gap-4 sm:grid-cols-2 ${CARTE}`}>
              <ChampTraduit
                libelle="Diplôme"
                valeur={formation.diplome}
                langue={langue}
                onChange={(diplome) => maj({ diplome })}
              />
              <Champ
                libelle="Établissement"
                valeur={formation.etablissement}
                onChange={(etablissement) => maj({ etablissement })}
              />
              <Champ libelle="Lieu" valeur={formation.lieu} onChange={(lieu) => maj({ lieu })} />
              <div className="grid grid-cols-2 gap-3">
                <Champ
                  libelle="Début"
                  valeur={formation.debut}
                  placeholder="AAAA"
                  onChange={(debut) => maj({ debut })}
                />
                <Champ
                  libelle="Fin"
                  valeur={formation.fin}
                  placeholder="AAAA"
                  onChange={(fin) => maj({ fin })}
                />
              </div>
              <ChampTraduit
                libelle="Précisions"
                valeur={formation.details}
                langue={langue}
                onChange={(details) => maj({ details })}
              />
              <label className="flex items-center gap-2 self-end text-sm font-bold">
                <input
                  type="checkbox"
                  checked={formation.superieur}
                  onChange={(evenement) => maj({ superieur: evenement.target.checked })}
                  className="size-4 accent-primary-600"
                />
                Enseignement supérieur
              </label>
              <Ordre
                nom={nom}
                rang={rang}
                total={brouillon.formations.length}
                deplacer={(vers) =>
                  changer('formations', deplacer(brouillon.formations, rang, vers))
                }
                supprimer={() =>
                  changer(
                    'formations',
                    brouillon.formations.filter((_, position) => position !== rang),
                  )
                }
              />
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => changer('formations', [...brouillon.formations, FORMATION_VIDE])}
          className={`mt-3 inline-flex items-center gap-1.5 ${BOUTON_DOUX}`}
        >
          <Plus aria-hidden="true" className="size-4" /> Ajouter une formation
        </button>
      </section>

      <Bloc titre="Compétences, langues, centres d'intérêt">
        <label className={`${LIBELLE} sm:col-span-2`}>
          Langages et outils (séparés par des virgules, identiques dans toutes les langues)
          <input
            value={brouillon.competences.join(', ')}
            placeholder="TypeScript, React, Docker"
            onChange={(evenement) =>
              changer(
                'competences',
                evenement.target.value.split(',').map((competence) => competence.trimStart()),
              )
            }
            onBlur={() =>
              changer(
                'competences',
                brouillon.competences.map((competence) => competence.trim()).filter(Boolean),
              )
            }
            className={CHAMP}
          />
        </label>
        <Lignes
          libelle="Autres compétences"
          valeur={brouillon.competences_autres}
          langue={langue}
          onChange={(v) => changer('competences_autres', v)}
        />
        <Lignes
          libelle="Langues parlées, avec le niveau"
          valeur={brouillon.langues}
          langue={langue}
          onChange={(v) => changer('langues', v)}
        />
        <Lignes
          libelle="Centres d'intérêt"
          valeur={brouillon.interets}
          langue={langue}
          onChange={(v) => changer('interets', v)}
        />
      </Bloc>

      <section className="mt-6">
        <h2 className="text-lg font-extrabold">Projets</h2>
        {brouillon.projets.map((projet, rang) => {
          const maj = (champs: Partial<ProjetCv>) =>
            changer('projets', remplacer(brouillon.projets, rang, { ...projet, ...champs }));
          return (
            <div key={rang} className={`mt-3 grid gap-4 sm:grid-cols-2 ${CARTE}`}>
              <Champ libelle="Nom" valeur={projet.nom} onChange={(nom) => maj({ nom })} />
              <Champ
                libelle="Adresse"
                valeur={projet.url}
                placeholder="https://"
                onChange={(url) => maj({ url })}
              />
              <ChampTraduit
                libelle="Description"
                valeur={projet.description}
                langue={langue}
                multiligne
                onChange={(description) => maj({ description })}
              />
              <Ordre
                nom={projet.nom || `projet ${rang + 1}`}
                rang={rang}
                total={brouillon.projets.length}
                deplacer={(vers) => changer('projets', deplacer(brouillon.projets, rang, vers))}
                supprimer={() =>
                  changer(
                    'projets',
                    brouillon.projets.filter((_, position) => position !== rang),
                  )
                }
              />
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => changer('projets', [...brouillon.projets, PROJET_VIDE])}
          className={`mt-3 inline-flex items-center gap-1.5 ${BOUTON_DOUX}`}
        >
          <Plus aria-hidden="true" className="size-4" /> Ajouter un projet
        </button>
      </section>

      <div className="sticky bottom-24 z-[5] mt-6 flex flex-wrap items-center gap-3 rounded-3xl border border-gray-200 bg-white/90 p-4 shadow-sm backdrop-blur md:bottom-4 dark:border-gray-800 dark:bg-gray-900/90">
        <button
          type="button"
          disabled={!modifie || enregistrer.isPending}
          onClick={() => enregistrer.mutate(brouillon)}
          className={BOUTON_PRINCIPAL}
        >
          Enregistrer le profil
        </button>
        <button
          type="button"
          onClick={() => fichier.current?.click()}
          className={BOUTON_SECONDAIRE}
        >
          Importer (JSON)
        </button>
        <button
          type="button"
          onClick={() =>
            telecharger('profil-cv.json', JSON.stringify(brouillon, null, 2), 'application/json')
          }
          className={BOUTON_SECONDAIRE}
        >
          Exporter (JSON)
        </button>
        <input
          ref={fichier}
          type="file"
          accept="application/json,.json"
          aria-label="Fichier de profil à importer"
          onChange={(evenement) => void importer(evenement)}
          className="hidden"
        />
        <span role="status" className={`text-sm ${SECONDAIRE}`}>
          {enregistrer.isPending
            ? 'Enregistrement…'
            : modifie
              ? 'Modifications non enregistrées.'
              : enregistrer.isSuccess
                ? 'Profil enregistré.'
                : ''}
        </span>
        {(enregistrer.isError || erreurImport) && (
          <p role="alert" className="basis-full text-sm font-bold text-red-700 dark:text-red-400">
            {erreurImport ?? "Le profil n'a pas pu être enregistré. Vérifie ta connexion."}
          </p>
        )}
      </div>
    </div>
  );
}
