import {
  aCompleter,
  composerLettre,
  lienMessagerie,
  passagesAEcrire,
  projetsPourOffre,
  texteLettre,
  type FormatLettre,
  type LangueLettre,
  type ModeleLettre,
  type Morceau,
} from '@stageradar/shared';
import { ChevronLeft, CircleAlert, Lock, Mail, RotateCw } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useTexteOffre } from '../components/OfferDescription';
import { useProfilCv } from '../lib/cv';
import { nomDocument, useAjouterDocument, useDocuments } from '../lib/documents';
import { useOffresDuFil } from '../lib/fil';
import { useConversations } from '../lib/messages';
import { useProjets } from '../lib/portfolio';
import { useCandidatures, useEnregistrerCandidature, valeursDe } from '../lib/suivi';
import { BOUTON_PRINCIPAL, BOUTON_SECONDAIRE, CARTE, CHAMP, SECONDAIRE, SEGMENTS } from '../lib/ui';

const FORMATS: { id: FormatLettre; titre: string; texte: string }[] = [
  { id: 'lettre', titre: 'Lettre de motivation', texte: 'Une page, pour un PDF joint' },
  { id: 'email', titre: 'E-mail court', texte: 'Quelques paragraphes' },
  { id: 'linkedin', titre: 'Message LinkedIn', texte: 'Court, sans pièce jointe' },
];

const LANGUES: { id: LangueLettre; libelle: string }[] = [
  { id: 'fr', libelle: 'Français' },
  { id: 'en', libelle: 'Anglais' },
  { id: 'es', libelle: 'Espagnol' },
];

/** Langue proposée d'après le pays de l'offre : l'anglais hors de France et d'Amérique latine. */
function langueDuPays(pays: string | null): LangueLettre {
  if (pays === 'FR') return 'fr';
  if (pays === 'CO') return 'es';
  return 'en';
}

const CHAMP_REMPLI =
  'rounded bg-[#dde6ff] px-0.5 text-inherit shadow-[inset_0_-2px_0_var(--color-primary-600)] dark:bg-primary-400/25';

function Morceaux({
  morceaux,
  valeurs,
  onChanger,
}: {
  morceaux: Morceau[];
  valeurs: Record<string, string>;
  onChanger: (id: string, valeur: string) => void;
}) {
  return morceaux.map((morceau, rang) => {
    if (typeof morceau === 'string') return <span key={rang}>{morceau}</span>;
    if ('champ' in morceau) {
      return (
        <mark key={rang} className={CHAMP_REMPLI}>
          {morceau.champ}
        </mark>
      );
    }
    return (
      <label key={rang} className="my-1 block">
        <span className="sr-only">{morceau.consigne}</span>
        <textarea
          rows={2}
          value={valeurs[morceau.id] ?? ''}
          onChange={(evenement) => onChanger(morceau.id, evenement.target.value)}
          placeholder={`À personnaliser : ${morceau.consigne}`}
          className="field-sizing-content block min-h-14 w-full resize-y rounded-lg border border-amber-300 bg-[#fff6d8] px-2.5 py-1.5 text-[0.9375rem] leading-normal font-medium text-[#5a3b00] placeholder:text-[#8a6a1f] dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-100 dark:placeholder:text-amber-300/80"
        />
      </label>
    );
  });
}

/**
 * Préparer une lettre, un e-mail ou un message LinkedIn pour une offre (maquette du 18 novembre
 * 2026). Des trames écrites à la main, remplies avec l'offre, le profil et le portfolio : les
 * passages personnels restent à écrire, et rien ne part tant qu'ils sont vides.
 */
export function Lettre() {
  const [params] = useSearchParams();
  const idOffre = params.get('offre');
  const offres = useOffresDuFil();
  const offre = offres.data?.find((autre) => autre.id === idOffre);
  const texteOffre = useTexteOffre(idOffre);
  const profil = useProfilCv();
  const projets = useProjets();
  const candidatures = useCandidatures();
  const conversations = useConversations();
  const documents = useDocuments();
  const ajouterDocument = useAjouterDocument();
  const enregistrerCandidature = useEnregistrerCandidature();

  const candidature = candidatures.data?.find((autre) => autre.offer_id === idOffre);
  const conversation = conversations.data?.find(
    (autre) => candidature && autre.application_id === candidature.id,
  );
  const contact = conversation?.contact_nom ?? candidature?.contact_nom ?? null;

  const [format, setFormat] = useState<FormatLettre>('email');
  const [langue, setLangue] = useState<LangueLettre | null>(null);
  const [modele, setModele] = useState<ModeleLettre>('offre');
  const [choisis, setChoisis] = useState<string[] | null>(null);
  const [valeurs, setValeurs] = useState<Record<string, string>>({});
  const [libre, setLibre] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [rangee, setRangee] = useState<string | null>(null);

  if (!idOffre) {
    return (
      <p className={SECONDAIRE}>
        Ouvre une offre puis « Préparer ma candidature » pour écrire ta lettre ou ton message.
      </p>
    );
  }
  if (offres.isPending) return <p className={SECONDAIRE}>Chargement…</p>;
  if (!offre) return <p className={SECONDAIRE}>Cette offre n’est plus disponible.</p>;

  const langueChoisie = langue ?? langueDuPays(offre.pays);
  const classes = projetsPourOffre(
    projets.data ?? [],
    `${offre.titre} ${texteOffre.data?.description ?? ''}`,
  );
  const idsCites =
    choisis ??
    classes
      .filter((item) => item.communes.length > 0)
      .slice(0, 2)
      .map((item) => item.projet.id);
  const cites = classes.filter((item) => idsCites.includes(item.projet.id));
  const donneesProfil = profil.data;
  const nom = donneesProfil
    ? [donneesProfil.prenom, donneesProfil.nom].filter(Boolean).join(' ')
    : null;

  const trame = composerLettre({
    format,
    langue: langueChoisie,
    modele,
    entreprise: offre.entreprise ?? 'votre entreprise',
    poste: offre.titre,
    contact,
    debut: offre.date_debut,
    fin: null,
    semaines: offre.duree_semaines,
    presentation: donneesProfil?.resume[langueChoisie]?.split(/(?<=\.)\s/)[0] ?? null,
    projets: cites.map((item) => ({
      titre: item.projet.titre,
      technologies: item.communes.length > 0 ? item.communes : item.projet.technologies,
    })),
    nom: nom || null,
  });
  const genere = texteLettre(trame, valeurs);
  const message = { objet: genere.objet, corps: libre ?? genere.corps };
  const restants =
    libre === null
      ? passagesAEcrire(trame).filter((passage) => !valeurs[passage.id]?.trim()).length
      : aCompleter(libre)
        ? 1
        : 0;
  const pret = restants === 0;
  const adresse = email ?? conversation?.contact_email ?? candidature?.contact_email ?? '';
  const lien = format === 'linkedin' ? null : lienMessagerie(adresse, message);
  const cv = documents.data?.find((document) => document.id === candidature?.cv_document_id);

  /** Range la version envoyée dans Documents et la lie à la candidature, une fois par texte. */
  function ranger() {
    const texte = `${message.objet}\n\n${message.corps}`;
    if (rangee === texte) return;
    setRangee(texte);
    const titre = [offre!.entreprise, offre!.titre].filter(Boolean).join(' · ');
    const version =
      (documents.data ?? []).filter(
        (document) => document.type === 'lettre' && document.titre === titre,
      ).length + 1;
    ajouterDocument.mutate(
      {
        type: 'lettre',
        langue: langueChoisie,
        titre,
        version,
        chemin_stockage: null,
        notes: texte,
      },
      {
        onSuccess: (id) => {
          if (candidature) {
            enregistrerCandidature.mutate({
              candidature,
              valeurs: { ...valeursDe(candidature), lettre_document_id: id },
            });
          }
        },
      },
    );
  }

  const titreFormat =
    format === 'lettre'
      ? 'Lettre de motivation'
      : format === 'email'
        ? contact
          ? `E-mail à ${contact}`
          : 'E-mail'
        : contact
          ? `Message LinkedIn à ${contact}`
          : 'Message LinkedIn';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Link
            to={`/?offre=${offre.id}`}
            className="inline-flex min-h-9 items-center gap-1.5 self-start text-sm font-medium text-primary-600 dark:text-primary-300"
          >
            <ChevronLeft aria-hidden="true" className="size-4" strokeWidth={1.8} />
            {[offre.titre, offre.entreprise].filter(Boolean).join(' · ')}
          </Link>
          <h1 className="text-[1.75rem] font-extrabold tracking-[-0.02em] md:text-[2rem]">
            Préparer ta candidature
          </h1>
        </div>
        <p className="flex items-center gap-2 rounded-[0.625rem] border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
          <Lock aria-hidden="true" className="size-4" strokeWidth={1.8} />
          Modèles de texte, sur ton appareil. Aucune IA en ligne.
        </p>
      </div>

      <div className="flex flex-wrap items-start gap-5">
        <aside
          aria-label="Format et modèle"
          className="flex min-w-0 flex-[1_1_17.5rem] flex-col gap-4 lg:max-w-80"
        >
          <fieldset className={`flex flex-col gap-2 ${CARTE}`}>
            <legend className="float-left mb-1.5 text-base font-bold">Format</legend>
            {FORMATS.map((item) => (
              <label
                key={item.id}
                className={`flex min-h-[3.25rem] cursor-pointer items-center gap-3 rounded-xl px-3.5 ${
                  format === item.id
                    ? 'border-2 border-primary-600 bg-primary-50/60 dark:border-primary-400 dark:bg-primary-400/10'
                    : 'border border-gray-200 dark:border-gray-800'
                }`}
              >
                <input
                  type="radio"
                  name="format"
                  checked={format === item.id}
                  onChange={() => setFormat(item.id)}
                  className="size-[1.125rem] accent-primary-600"
                />
                <span className="flex flex-col">
                  <strong className="font-semibold">{item.titre}</strong>
                  <span className={`text-[0.8125rem] ${SECONDAIRE}`}>{item.texte}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <section className={`flex flex-col gap-3 ${CARTE}`}>
            <div role="radiogroup" aria-label="Langue" className={`${SEGMENTS} flex`}>
              {LANGUES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={langueChoisie === item.id}
                  onClick={() => setLangue(item.id)}
                  className={`min-h-10 min-w-0 flex-1 rounded-full px-2 text-sm transition ${
                    langueChoisie === item.id
                      ? 'bg-white font-semibold text-gray-950 shadow-[0_1px_3px_rgb(20_22_43/0.12)] dark:bg-gray-900 dark:text-gray-50'
                      : 'font-medium text-gray-700 hover:text-gray-950 dark:text-gray-400 dark:hover:text-gray-50'
                  }`}
                >
                  {item.libelle}
                </button>
              ))}
            </div>
            <label className="text-[0.8125rem] font-semibold text-gray-700 dark:text-gray-300">
              Modèle
              <select
                value={modele}
                onChange={(evenement) => setModele(evenement.target.value as ModeleLettre)}
                className={CHAMP}
              >
                <option value="offre">Réponse à l’offre</option>
                <option value="spontanee">Prise de contact (startup, sans poste précis)</option>
              </select>
            </label>
          </section>

          <section
            aria-labelledby="titre-projets-cites"
            className={`flex flex-col gap-2.5 ${CARTE}`}
          >
            <h2 id="titre-projets-cites" className="text-base font-bold">
              Projets cités
            </h2>
            <p className={`text-[0.8125rem] ${SECONDAIRE}`}>
              Choisis jusqu’à deux projets, classés par technologies communes avec l’offre.
            </p>
            {projets.isSuccess && classes.length === 0 && (
              <p className="text-sm">
                Aucun projet pour l’instant.{' '}
                <Link
                  to="/portfolio"
                  className="font-semibold text-primary-600 dark:text-primary-300"
                >
                  Ajouter un projet
                </Link>
              </p>
            )}
            {classes.map(({ projet, communes }) => {
              const coche = idsCites.includes(projet.id);
              return (
                <label
                  key={projet.id}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 ${
                    coche ? 'bg-primary-50 dark:bg-primary-400/15' : 'bg-[#f0f2f7] dark:bg-gray-850'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={coche}
                    disabled={!coche && idsCites.length >= 2}
                    onChange={() =>
                      setChoisis(
                        coche
                          ? idsCites.filter((id) => id !== projet.id)
                          : [...idsCites, projet.id],
                      )
                    }
                    className="size-[1.125rem] accent-primary-600"
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <strong className="break-words">{projet.titre}</strong>
                    <span className={`text-[0.8125rem] ${SECONDAIRE}`}>
                      {projet.technologies.join(', ')}
                    </span>
                    <span className="text-[0.8125rem] font-bold text-primary-700 dark:text-primary-300">
                      {communes.length} en commun avec l’offre
                    </span>
                  </span>
                </label>
              );
            })}
          </section>
        </aside>

        <section
          aria-labelledby="titre-texte"
          className={`flex min-w-0 flex-[999_1_35rem] flex-col gap-4 max-lg:order-first ${CARTE} shadow-[0_8px_24px_rgb(20_22_43/0.05)]`}
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
            <h2 id="titre-texte" className="flex-1 text-xl font-bold">
              {titreFormat}
            </h2>
            <span className="flex items-center gap-1.5 text-[0.8125rem]">
              <span aria-hidden="true" className={`size-3.5 rounded ${CHAMP_REMPLI}`} />
              Rempli par StageRadar
            </span>
            <span className="flex items-center gap-1.5 text-[0.8125rem]">
              <span aria-hidden="true" className="size-3.5 rounded bg-[#ffe9a8]" />À personnaliser
            </span>
          </div>
          {trame.objet && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[0.8125rem] font-semibold text-gray-700 dark:text-gray-300">
                Objet
              </span>
              <p className="rounded-[0.625rem] border border-gray-300 px-3 py-2.5 dark:border-gray-700">
                <Morceaux morceaux={trame.objet} valeurs={valeurs} onChanger={() => undefined} />
              </p>
            </div>
          )}
          {libre === null ? (
            <div
              aria-label="Texte du message"
              role="group"
              className="flex flex-col gap-3 rounded-xl border border-gray-300 px-5 py-4 text-base leading-[1.75] whitespace-pre-line dark:border-gray-700"
            >
              {trame.paragraphes.map((paragraphe, rang) => (
                <div key={rang}>
                  <Morceaux
                    morceaux={paragraphe}
                    valeurs={valeurs}
                    onChanger={(id, valeur) => setValeurs((avant) => ({ ...avant, [id]: valeur }))}
                  />
                </div>
              ))}
            </div>
          ) : (
            <label className="text-[0.8125rem] font-semibold text-gray-700 dark:text-gray-300">
              Texte du message
              <textarea
                rows={14}
                value={libre}
                onChange={(evenement) => setLibre(evenement.target.value)}
                className={`${CHAMP} leading-relaxed`}
              />
            </label>
          )}
          <button
            type="button"
            onClick={() => setLibre(libre === null ? genere.corps : null)}
            className="flex items-center gap-1.5 self-start text-sm font-medium text-primary-600 dark:text-primary-300"
          >
            <RotateCw aria-hidden="true" className="size-3.5" strokeWidth={2} />
            {libre === null
              ? 'Modifier tout le texte'
              : 'Revenir au modèle (tes retouches seront perdues)'}
          </button>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <p
              role="status"
              className={`flex flex-[1_1_16rem] items-center gap-2 text-sm ${
                pret ? 'text-vert-700 dark:text-vert-50' : 'text-amber-800 dark:text-amber-200'
              }`}
            >
              <CircleAlert
                aria-hidden="true"
                className="size-[1.125rem] shrink-0"
                strokeWidth={1.8}
              />
              {pret
                ? rangee
                  ? 'Prêt, et rangé dans Documents.'
                  : 'Prêt à partir.'
                : libre === null
                  ? `Encore ${restants} partie${restants > 1 ? 's' : ''} à personnaliser avant d’envoyer.`
                  : 'Il reste un passage entre crochets à remplacer.'}
            </p>
            <button
              type="button"
              disabled={!pret}
              onClick={() => {
                void navigator.clipboard.writeText(
                  message.objet ? `${message.objet}\n\n${message.corps}` : message.corps,
                );
                ranger();
              }}
              className={BOUTON_SECONDAIRE}
            >
              Copier
            </button>
            {format !== 'linkedin' && (
              <a
                href={pret && lien ? lien : undefined}
                aria-disabled={!pret || !lien}
                onClick={(evenement) => {
                  if (!pret || !lien) evenement.preventDefault();
                  else ranger();
                }}
                className={`${BOUTON_PRINCIPAL} ${!pret || !lien ? 'pointer-events-none opacity-60' : ''}`}
              >
                <Mail aria-hidden="true" className="size-[1.125rem]" strokeWidth={1.8} />
                Ouvrir dans ma messagerie
              </a>
            )}
          </div>
        </section>

        <aside
          aria-labelledby="titre-avant"
          className={`flex min-w-0 flex-[1_1_16.25rem] flex-col gap-3 lg:max-w-[18.75rem] ${CARTE}`}
        >
          <h2 id="titre-avant" className="text-base font-bold">
            Avant d’envoyer
          </h2>
          <div className="flex flex-col">
            <strong className="text-sm">CV joint</strong>
            {cv ? (
              <span className={`text-[0.8125rem] ${SECONDAIRE}`}>{nomDocument(cv)}</span>
            ) : (
              <Link
                to={`/cv?offre=${offre.id}`}
                className="text-[0.8125rem] font-semibold text-primary-600 dark:text-primary-300"
              >
                Aucun CV associé : créer le CV pour cette offre
              </Link>
            )}
          </div>
          {format !== 'linkedin' && (
            <label className="text-sm font-bold">
              Destinataire
              <input
                type="email"
                value={adresse}
                onChange={(evenement) => setEmail(evenement.target.value)}
                placeholder="adresse@entreprise.com"
                className={CHAMP}
              />
              <span className={`mt-1 block text-[0.8125rem] font-normal ${SECONDAIRE}`}>
                {contact ? `${contact} · ` : ''}l’e-mail part de ta messagerie.
              </span>
            </label>
          )}
          <div className="flex flex-col">
            <strong className="text-sm">Relances prévues</strong>
            <span className={`text-[0.8125rem] ${SECONDAIRE}`}>
              J+7 et J+14 après l’envoi, quand la candidature passe en « Postulé ».
            </span>
          </div>
          <p className="rounded-[0.625rem] bg-[#f0f2f7] px-3 py-2.5 text-[0.8125rem] text-gray-700 dark:bg-gray-850 dark:text-gray-300">
            La version envoyée est rangée dans Documents
            {candidature ? ' et liée à cette candidature' : ''}.
          </p>
        </aside>
      </div>
    </div>
  );
}
