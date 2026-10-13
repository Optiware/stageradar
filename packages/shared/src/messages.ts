// Messages de candidature spontanée : une trame à relire et à compléter, jamais envoyée
// automatiquement (§8). Les passages entre crochets sont à remplacer avant l'envoi.

export type LangueMessage = 'en' | 'fr';
export type TypeMessage = 'premier_contact' | 'relance';

export interface DonneesMessage {
  langue: LangueMessage;
  type: TypeMessage;
  entreprise: string;
  /** Nom de la personne contactée, si elle est connue. */
  contact: string | null;
  /** Présentation rédigée une fois dans l'application ; vide si elle ne l'est pas encore. */
  presentation: string;
  /** Début et fin du stage visé (AAAA-MM-JJ). */
  debut: string;
  fin: string;
}

export interface Message {
  objet: string;
  corps: string;
}

/** « June to August 2027 », « juin à août 2027 ». */
export function periodeEnClair(debut: string, fin: string, langue: LangueMessage): string {
  const locale = langue === 'fr' ? 'fr-FR' : 'en-GB';
  const mois = (jour: string) =>
    new Date(`${jour}T12:00:00Z`).toLocaleDateString(locale, { month: 'long', timeZone: 'UTC' });
  const annee = fin.slice(0, 4);
  return langue === 'fr'
    ? `de ${mois(debut)} à ${mois(fin)} ${annee}`
    : `from ${mois(debut)} to ${mois(fin)} ${annee}`;
}

function prenom(contact: string | null): string | null {
  return contact?.trim().split(/\s+/)[0] || null;
}

export function composerMessage(donnees: DonneesMessage): Message {
  const { langue, type, entreprise, debut, fin } = donnees;
  const periode = periodeEnClair(debut, fin, langue);
  const destinataire = prenom(donnees.contact);
  const presentation = donnees.presentation.trim();

  if (langue === 'fr') {
    const bonjour = destinataire ? `Bonjour ${destinataire},` : 'Bonjour,';
    if (type === 'relance') {
      return {
        objet: `Stage ${periode} : relance`,
        corps: [
          bonjour,
          `Je me permets de revenir vers vous au sujet de mon message sur un stage chez ${entreprise}, ${periode}. Je reste très intéressé et disponible pour un court échange.`,
          '[Une nouveauté depuis le premier message : projet terminé, article lu, version publiée.]',
          'Merci pour votre temps,\n[Ton nom]',
        ].join('\n\n'),
      };
    }
    return {
      objet: `Stage en développement ${periode}`,
      corps: [
        bonjour,
        presentation ||
          '[Deux phrases pour te présenter : formation, année, ce que tu sais construire.]',
        `Je suis ${entreprise} avec intérêt et j'aimerais rejoindre votre équipe en stage ${periode}. [Une phrase précise sur ce qui t'attire dans leur produit, et ce sur quoi tu pourrais aider.]`,
        'Mon CV et mes projets : [lien]',
        'Auriez-vous quelques minutes pour en parler ?',
        'Merci pour votre temps,\n[Ton nom]',
      ].join('\n\n'),
    };
  }

  const bonjour = destinataire ? `Hello ${destinataire},` : 'Hello,';
  if (type === 'relance') {
    return {
      objet: `Internship ${periode}: following up`,
      corps: [
        bonjour,
        `I am following up on my message about an internship at ${entreprise} ${periode}. I am still very interested and happy to have a short call whenever suits you.`,
        '[One thing that is new since your first message: a finished project, an article you read, a release.]',
        'Thank you for your time,\n[Your name]',
      ].join('\n\n'),
    };
  }
  return {
    objet: `Software engineering internship ${periode}`,
    corps: [
      bonjour,
      presentation ||
        '[Two sentences about you: your school, your year, what you are able to build.]',
      `I have been following ${entreprise} and I would love to join your team as an intern ${periode}. [One precise sentence on what you like about their product, and what you could help with.]`,
      'My CV and projects: [link]',
      'Would you be open to a short call?',
      'Thank you for your time,\n[Your name]',
    ].join('\n\n'),
  };
}

/** Vrai tant qu'il reste un passage entre crochets à remplacer. */
export function aCompleter(texte: string): boolean {
  return /\[[^\]]+\]/.test(texte);
}

const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

/** Lien qui ouvre la messagerie avec le message prêt, ou `null` si l'adresse n'est pas valide. */
export function lienMessagerie(email: string | null, message: Message): string | null {
  const adresse = email?.trim() ?? '';
  if (!EMAIL.test(adresse)) return null;
  const objet = encodeURIComponent(message.objet);
  const corps = encodeURIComponent(message.corps);
  return `mailto:${encodeURIComponent(adresse).replace('%40', '@')}?subject=${objet}&body=${corps}`;
}
