// Préparation d'entretien : questions fréquentes recopiées mot pour mot depuis des pages citées,
// lues le 18 novembre 2026. Aucune question n'est écrite de mémoire.

export interface SourceQuestions {
  id: string;
  libelle: string;
  url: string;
  verifiee: string;
  /** Langue des questions telles qu'elles sont écrites sur la page. */
  langue: 'fr' | 'en';
  questions: { id: string; texte: string }[];
}

const VERIFIEE = '18 novembre 2026';

function liste(prefixe: string, textes: string[]) {
  return textes.map((texte, rang) => ({ id: `${prefixe}-${rang + 1}`, texte }));
}

export const SOURCES_QUESTIONS: SourceQuestions[] = [
  {
    id: 'umbc',
    libelle: 'UMBC Career Center, « Common Interview Questions »',
    url: 'https://careers.umbc.edu/students/interview/questions/common',
    verifiee: VERIFIEE,
    langue: 'en',
    questions: liste('umbc', [
      'Tell me about yourself.',
      'Why were you attracted to this opportunity?',
      'Why do you want to work for this company?',
      'Which of your courses or projects have helped prepare you for this internship?',
      'Give an example of when you were able to learn a new skill in a short period of time.',
      'Tell me about a time when you experienced failure.',
      'What is your greatest strength/weakness?',
      'Do you have any questions for me?',
    ]),
  },
  {
    id: 'japan-dev',
    libelle: 'Japan Dev, « Top Interview Questions in Japan: Are You Ready? »',
    url: 'https://japan-dev.com/blog/japan-job-interview-questions',
    verifiee: VERIFIEE,
    langue: 'en',
    questions: liste('japan-dev', [
      'Please Tell Us About Yourself',
      'Why Did You Apply For This Job?',
      'Why did you choose to work in Japan?',
      'What Are Your Skills?',
      'What Did You Work on the Hardest in College?',
      'How Would You Solve a Problem at Work?',
    ]),
  },
  {
    id: 'cidj',
    libelle: 'CIDJ, « Décrocher et réussir ses entretiens de stage »',
    url: 'https://www.cidj.com/emploi-jobs-stages/nos-conseils-pour-trouver-un-stage/reussir-son-entretien-de-stage',
    verifiee: VERIFIEE,
    langue: 'fr',
    questions: liste('cidj', [
      'Parlez-moi de vous ?',
      'Pouvez-vous vous présenter rapidement en quelques phrases ?',
      'Vous avez des questions ?',
    ]),
  },
];

/**
 * Sources adaptées au pays de l'offre : le Japon a sa page, la France la sienne, ailleurs la liste
 * générale en anglais (aucune source en espagnol ou en coréen n'a encore été vérifiée).
 */
export function sourcesPourPays(pays: string | null): SourceQuestions[] {
  const parId = (id: string) => SOURCES_QUESTIONS.find((source) => source.id === id)!;
  if (pays === 'JP') return [parId('japan-dev'), parId('umbc')];
  if (pays === 'FR') return [parId('cidj')];
  return [parId('umbc')];
}

/** Check-list du jour J : simples rappels, pas des conseils sourcés. */
export const CHECKLIST_ENTRETIEN = [
  { id: 'micro', libelle: 'Micro et caméra testés' },
  { id: 'cv', libelle: 'CV envoyé sous les yeux' },
  { id: 'lien', libelle: 'Lien de visio ouvert' },
  { id: 'questions', libelle: 'Questions prêtes' },
] as const;

/** « dans 9 h 20 », « dans 3 jours », « maintenant », « passé ». */
export function compteARebours(debut: Date, maintenant: Date): string {
  const minutes = Math.round((debut.getTime() - maintenant.getTime()) / 60_000);
  if (minutes < -60) return 'passé';
  if (minutes <= 0) return 'maintenant';
  if (minutes < 60) return `dans ${minutes} min`;
  if (minutes < 48 * 60) {
    const heures = Math.floor(minutes / 60);
    const reste = minutes % 60;
    return reste > 0 ? `dans ${heures} h ${String(reste).padStart(2, '0')}` : `dans ${heures} h`;
  }
  return `dans ${Math.round(minutes / (24 * 60))} jours`;
}
