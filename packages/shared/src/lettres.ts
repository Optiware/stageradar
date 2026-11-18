// Lettres et messages de candidature (maquette du 18 novembre 2026) : des trames écrites à la main,
// remplies avec l'offre, le profil et le portfolio. Les passages personnels restent à écrire :
// rien ne part tant qu'ils sont vides. Aucune IA, aucun texte inventé sur la personne.

export type FormatLettre = 'lettre' | 'email' | 'linkedin';
export type LangueLettre = 'fr' | 'en' | 'es';
/** « offre » : réponse à une annonce ; « spontanee » : prise de contact, sans poste précis. */
export type ModeleLettre = 'offre' | 'spontanee';

/** Morceau de texte : fixe, rempli par StageRadar (surligné), ou à écrire soi-même. */
export type Morceau = string | { champ: string } | { id: string; consigne: string };
export type Paragraphe = Morceau[];

export interface Trame {
  /** `null` pour un message LinkedIn : pas d'objet. */
  objet: Paragraphe | null;
  paragraphes: Paragraphe[];
}

export interface ProjetCite {
  titre: string;
  technologies: string[];
}

export interface DonneesLettre {
  format: FormatLettre;
  langue: LangueLettre;
  modele: ModeleLettre;
  entreprise: string;
  poste: string | null;
  /** Nom complet du contact, s'il est connu. */
  contact: string | null;
  /** AAAA-MM-JJ. */
  debut: string | null;
  fin: string | null;
  semaines: number | null;
  /** Présentation tirée du profil (résumé du CV), si elle existe dans la langue. */
  presentation: string | null;
  projets: ProjetCite[];
  /** Prénom et nom, tirés du profil. */
  nom: string | null;
}

const LOCALES: Record<LangueLettre, string> = { fr: 'fr-FR', en: 'en-GB', es: 'es-ES' };

function mois(jour: string, langue: LangueLettre): string {
  return new Date(`${jour}T12:00:00Z`).toLocaleDateString(LOCALES[langue], {
    month: 'long',
    timeZone: 'UTC',
  });
}

/** « from June to August 2027 (12 weeks) », « de juin à août 2027 (12 semaines) »… */
export function periodeLettre(
  debut: string | null,
  fin: string | null,
  semaines: number | null,
  langue: LangueLettre,
): string | null {
  if (!debut) return null;
  const annee = (fin ?? debut).slice(0, 4);
  const duree =
    semaines && semaines > 0
      ? ` (${semaines} ${{ fr: 'semaines', en: 'weeks', es: 'semanas' }[langue]})`
      : '';
  if (!fin || fin.slice(0, 7) === debut.slice(0, 7)) {
    const seul = mois(debut, langue);
    return (
      {
        fr: `à partir de ${seul} ${annee}`,
        en: `from ${seul} ${annee}`,
        es: `a partir de ${seul} de ${annee}`,
      }[langue] + duree
    );
  }
  const [a, b] = [mois(debut, langue), mois(fin, langue)];
  return (
    {
      fr: `de ${a} à ${b} ${annee}`,
      en: `from ${a} to ${b} ${annee}`,
      es: `de ${a} a ${b} de ${annee}`,
    }[langue] + duree
  );
}

/** Date d'envoi en toutes lettres : « 4 November », « 4 novembre », « 4 de noviembre ». */
export function dateLettre(jour: string, langue: LangueLettre): string {
  const date = new Date(`${jour}T12:00:00Z`);
  const texte = date.toLocaleDateString(LOCALES[langue], {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
  return texte;
}

function prenom(contact: string | null): string | null {
  return contact?.trim().split(/\s+/)[0] || null;
}

function liste(elements: string[], langue: LangueLettre): string {
  if (elements.length <= 1) return elements.join('');
  const et = { fr: 'et', en: 'and', es: 'y' }[langue];
  return `${elements.slice(0, -1).join(', ')} ${et} ${elements[elements.length - 1]}`;
}

function projetEnClair(projet: ProjetCite): string {
  const technologies = projet.technologies.slice(0, 3);
  return technologies.length > 0 ? `${projet.titre} (${technologies.join(', ')})` : projet.titre;
}

/** Ce qui reste personnel : qui on est, pourquoi cette entreprise, ce qu'on veut apprendre. */
const CONSIGNES = {
  presentation: {
    fr: 'Qui tu es, en une phrase : école, année, ce que tu sais construire',
    en: 'Qui tu es, en une phrase (en anglais) : école, année, ce que tu sais construire',
    es: 'Qui tu es, en une phrase (en espagnol) : école, année, ce que tu sais construire',
  },
  pourquoi: {
    fr: 'Pourquoi cette entreprise, en une phrase précise',
    en: 'Pourquoi cette entreprise, en une phrase précise (en anglais)',
    es: 'Pourquoi cette entreprise, en une phrase précise (en espagnol)',
  },
  apprendre: {
    fr: 'Ce que tu veux apprendre pendant ce stage',
    en: 'Ce que tu veux apprendre pendant ce stage (en anglais)',
    es: 'Ce que tu veux apprendre pendant ce stage (en espagnol)',
  },
  projet: {
    fr: 'Un projet dont tu es fier, en une phrase',
    en: 'Un projet dont tu es fier, en une phrase (en anglais)',
    es: 'Un projet dont tu es fier, en une phrase (en espagnol)',
  },
  nom: { fr: 'Prénom Nom', en: 'Prénom Nom', es: 'Prénom Nom' },
} as const;

function aEcrire(id: keyof typeof CONSIGNES, langue: LangueLettre): Morceau {
  return { id, consigne: CONSIGNES[id][langue] };
}

/** Compose la trame d'une lettre, d'un e-mail ou d'un message LinkedIn. */
export function composerLettre(donnees: DonneesLettre): Trame {
  const { format, langue, modele, entreprise } = donnees;
  const destinataire = prenom(donnees.contact);
  const periode = periodeLettre(donnees.debut, donnees.fin, donnees.semaines, langue);
  const poste = modele === 'offre' ? donnees.poste : null;
  const presentation: Morceau = donnees.presentation?.trim()
    ? { champ: donnees.presentation.trim() }
    : aEcrire('presentation', langue);
  const projets: Morceau =
    donnees.projets.length > 0
      ? { champ: liste(donnees.projets.slice(0, 2).map(projetEnClair), langue) }
      : aEcrire('projet', langue);
  const signature: Morceau = donnees.nom?.trim()
    ? { champ: donnees.nom.trim() }
    : aEcrire('nom', langue);
  const avecPeriode = (avant: string): Paragraphe => (periode ? [avant, { champ: periode }] : []);

  if (langue === 'en') {
    const salut: Paragraphe = destinataire
      ? [format === 'lettre' ? 'Dear ' : 'Hello ', { champ: destinataire }, ',']
      : [format === 'lettre' ? `Dear ${entreprise} team,` : 'Hello,'];
    const demande: Paragraphe = poste
      ? [
          "I'm applying for the ",
          { champ: poste },
          ' position at ',
          { champ: entreprise },
          ...avecPeriode(', '),
          '.',
        ]
      : ["I'd love to join ", { champ: entreprise }, ' as an intern', ...avecPeriode(' '), '.'];
    if (format === 'linkedin') {
      return {
        objet: null,
        paragraphes: [
          salut,
          [presentation, ' ', ...demande],
          ['Would you be open to a short chat?'],
          ['Thank you, ', signature],
        ],
      };
    }
    return {
      objet: poste
        ? ['Application: ', { champ: poste }, ...avecPeriode(', ')]
        : ['Internship request', ...avecPeriode(', ')],
      paragraphes: [
        salut,
        [presentation, ' ', ...demande],
        [aEcrire('pourquoi', langue)],
        ['Recently I built ', projets, '.'],
        [aEcrire('apprendre', langue)],
        [
          format === 'lettre'
            ? 'My CV is attached. Thank you for considering my application; I would be glad to discuss it at your convenience.'
            : "My CV is attached. I'd be glad to talk at your convenience.",
        ],
        ['Best regards,\n', signature],
      ],
    };
  }

  if (langue === 'es') {
    const salut: Paragraphe = destinataire
      ? [
          format === 'lettre' ? 'Estimado/a ' : 'Hola ',
          { champ: destinataire },
          format === 'lettre' ? ':' : ',',
        ]
      : [format === 'lettre' ? `Estimado equipo de ${entreprise}:` : 'Hola,'];
    const demande: Paragraphe = poste
      ? [
          'Me postulo a la oferta «',
          { champ: poste },
          '» en ',
          { champ: entreprise },
          ...avecPeriode(', '),
          '.',
        ]
      : [
          'Me encantaría unirme a ',
          { champ: entreprise },
          ' como practicante',
          ...avecPeriode(' '),
          '.',
        ];
    if (format === 'linkedin') {
      return {
        objet: null,
        paragraphes: [
          salut,
          [presentation, ' ', ...demande],
          ['¿Tendría unos minutos para conversar?'],
          ['Gracias, ', signature],
        ],
      };
    }
    return {
      objet: poste
        ? ['Postulación: ', { champ: poste }, ...avecPeriode(', ')]
        : ['Solicitud de prácticas', ...avecPeriode(', ')],
      paragraphes: [
        salut,
        [presentation, ' ', ...demande],
        [aEcrire('pourquoi', langue)],
        ['Recientemente desarrollé ', projets, '.'],
        [aEcrire('apprendre', langue)],
        [
          format === 'lettre'
            ? 'Adjunto mi CV. Agradezco de antemano su atención y quedo a su disposición para conversar.'
            : 'Adjunto mi CV. Quedo a su disposición para conversar cuando le convenga.',
        ],
        [format === 'lettre' ? 'Atentamente,\n' : 'Saludos cordiales,\n', signature],
      ],
    };
  }

  const salut: Paragraphe = destinataire
    ? ['Bonjour ', { champ: destinataire }, ',']
    : [format === 'lettre' ? 'Madame, Monsieur,' : 'Bonjour,'];
  const demande: Paragraphe = poste
    ? [
        'Je souhaite postuler au poste « ',
        { champ: poste },
        ' » chez ',
        { champ: entreprise },
        ...avecPeriode(', '),
        '.',
      ]
    : ["J'aimerais rejoindre ", { champ: entreprise }, ' en stage', ...avecPeriode(' '), '.'];
  if (format === 'linkedin') {
    return {
      objet: null,
      paragraphes: [
        salut,
        [presentation, ' ', ...demande],
        ['Auriez-vous quelques minutes pour en parler ?'],
        ['Merci, ', signature],
      ],
    };
  }
  return {
    objet: poste
      ? ['Candidature : ', { champ: poste }, ...avecPeriode(', ')]
      : ['Demande de stage', ...avecPeriode(', ')],
    paragraphes: [
      salut,
      [presentation, ' ', ...demande],
      [aEcrire('pourquoi', langue)],
      ["J'ai récemment réalisé ", projets, '.'],
      [aEcrire('apprendre', langue)],
      [
        format === 'lettre'
          ? 'Vous trouverez mon CV en pièce jointe. Je vous remercie pour l’attention portée à ma candidature et reste à votre disposition pour un entretien.'
          : 'Mon CV est en pièce jointe. Ce serait un plaisir d’en parler quand cela vous convient.',
      ],
      [format === 'lettre' ? 'Bien cordialement,\n' : 'Bonne journée,\n', signature],
    ],
  };
}

/** Identifiants des passages à écrire, dans l'ordre. */
export function passagesAEcrire(trame: Trame): { id: string; consigne: string }[] {
  return [...(trame.objet ? [trame.objet] : []), ...trame.paragraphes]
    .flat()
    .filter(
      (morceau): morceau is { id: string; consigne: string } =>
        typeof morceau === 'object' && 'id' in morceau,
    );
}

function morceauEnTexte(morceau: Morceau, valeurs: Record<string, string>): string {
  if (typeof morceau === 'string') return morceau;
  if ('champ' in morceau) return morceau.champ;
  return valeurs[morceau.id]?.trim() || `[${morceau.consigne}]`;
}

/** Texte final ; un passage vide reste entre crochets, ce qui bloque l'envoi (`aCompleter`). */
export function texteLettre(
  trame: Trame,
  valeurs: Record<string, string>,
): { objet: string; corps: string } {
  return {
    objet: trame.objet?.map((morceau) => morceauEnTexte(morceau, valeurs)).join('') ?? '',
    corps: trame.paragraphes
      .map((paragraphe) => paragraphe.map((morceau) => morceauEnTexte(morceau, valeurs)).join(''))
      .join('\n\n'),
  };
}

export interface DonneesRelance {
  langue: LangueLettre;
  contact: string | null;
  poste: string | null;
  entreprise: string;
  /** Date d'envoi de la candidature (AAAA-MM-JJ). */
  envoi: string | null;
  /** 1 pour la relance de J+7, 2 pour celle de J+14. */
  rang: 1 | 2;
  nom: string | null;
}

/** Relance polie et courte, dans la langue du contact. Les passages inconnus restent entre crochets. */
export function texteRelance(donnees: DonneesRelance): string {
  const { langue, entreprise, rang } = donnees;
  const qui = prenom(donnees.contact);
  const nom = donnees.nom?.trim() || '[Prénom Nom]';
  const envoi = donnees.envoi ? dateLettre(donnees.envoi, langue) : null;
  if (langue === 'en') {
    const objet = donnees.poste
      ? `the ${donnees.poste} position`
      : `an internship at ${entreprise}`;
    return [
      qui ? `Hi ${qui},` : 'Hello,',
      rang === 1
        ? `I hope you're well. I'm following up on my application for ${objet}${envoi ? `, sent on ${envoi}` : ''}. I'm still very interested and happy to share more details.`
        : `I'm writing once more about my application for ${objet}${envoi ? ` (${envoi})` : ''}. If the position is no longer open, a short reply would help me a lot. Thank you!`,
      `Best regards,\n${nom}`,
    ].join('\n\n');
  }
  if (langue === 'es') {
    const objet = donnees.poste
      ? `la oferta «${donnees.poste}»`
      : `unas prácticas en ${entreprise}`;
    return [
      qui ? `Hola ${qui},` : 'Hola,',
      rang === 1
        ? `Espero que se encuentre bien. Le escribo para dar seguimiento a mi postulación a ${objet}${envoi ? `, enviada el ${envoi}` : ''}. Mantengo todo mi interés y con gusto puedo compartir más detalles.`
        : `Le escribo una vez más sobre mi postulación a ${objet}${envoi ? ` (${envoi})` : ''}. Si el puesto ya no está disponible, una breve respuesta me ayudaría mucho. ¡Gracias!`,
      `Saludos cordiales,\n${nom}`,
    ].join('\n\n');
  }
  const objet = donnees.poste
    ? `au poste « ${donnees.poste} »`
    : `pour un stage chez ${entreprise}`;
  return [
    qui ? `Bonjour ${qui},` : 'Bonjour,',
    rang === 1
      ? `Je me permets de revenir vers vous au sujet de ma candidature ${objet}${envoi ? `, envoyée le ${envoi}` : ''}. Cette offre m’intéresse toujours beaucoup et je reste disponible pour vous donner plus de détails.`
      : `Je reviens une dernière fois vers vous au sujet de ma candidature ${objet}${envoi ? ` (${envoi})` : ''}. Si le poste n’est plus ouvert, une courte réponse m’aiderait beaucoup. Merci !`,
    `Bien cordialement,\n${nom}`,
  ].join('\n\n');
}
