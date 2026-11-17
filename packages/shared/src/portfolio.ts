// Portfolio : mes projets, leur complétude, et les technologies que demandent mes offres sans que
// le portfolio les montre. Les idées de projet sont des propositions écrites à la main, pas des
// conseils sourcés : elles le disent dans l'interface.
import { TECHNOLOGIES } from './cv';
import { containsWord, normalizeText } from './text';

export interface ProjetPortfolio {
  titre: string;
  description: string;
  technologies: string[];
  url_demo: string | null;
  image: string | null;
  a_readme: boolean;
  a_captures: boolean;
  a_tests: boolean;
}

export interface PointCompletude {
  libelle: string;
  fait: boolean;
}

/** Ce qui rend un projet présentable : README, captures, démo en ligne, tests. */
export function completude(projet: ProjetPortfolio): {
  points: PointCompletude[];
  pourcent: number;
} {
  const points = [
    { libelle: 'README', fait: projet.a_readme },
    { libelle: 'Captures', fait: projet.a_captures || projet.image !== null },
    { libelle: 'Démo en ligne', fait: Boolean(projet.url_demo?.trim()) },
    { libelle: 'Tests', fait: projet.a_tests },
  ];
  const faits = points.filter((point) => point.fait).length;
  return { points, pourcent: Math.round((faits / points.length) * 100) };
}

/** Formes d'écriture d'une même technologie : comptées ensemble. */
const ALIAS: Record<string, string> = {
  golang: 'go',
  nodejs: 'node js',
  'google cloud': 'gcp',
  'spring boot': 'spring',
  'github actions': 'ci cd',
};

/** Noms d'affichage ; à défaut, le terme avec une majuscule. */
const NOMS: Record<string, string> = {
  go: 'Go',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  'c#': 'C#',
  'c++': 'C++',
  php: 'PHP',
  sql: 'SQL',
  mysql: 'MySQL',
  postgresql: 'PostgreSQL',
  'pl sql': 'PL/SQL',
  mongodb: 'MongoDB',
  html: 'HTML',
  css: 'CSS',
  'react native': 'React Native',
  'next js': 'Next.js',
  'node js': 'Node.js',
  fastapi: 'FastAPI',
  'asp net': 'ASP.NET',
  graphql: 'GraphQL',
  rest: 'API REST',
  aws: 'AWS',
  gcp: 'Google Cloud',
  powershell: 'PowerShell',
  github: 'GitHub',
  gitlab: 'GitLab',
  'ci cd': 'CI/CD',
  ios: 'iOS',
  'machine learning': 'Machine learning',
  pytorch: 'PyTorch',
  tensorflow: 'TensorFlow',
  llm: 'LLM',
  elasticsearch: 'Elasticsearch',
};

export function nomTechnologie(terme: string): string {
  return NOMS[terme] ?? terme.charAt(0).toUpperCase() + terme.slice(1);
}

/** Petits projets proposés pour montrer une technologie. Écrits à la main, sans source. */
const IDEES: Record<string, string> = {
  go: 'Une petite API REST en Go, avec ses tests et un README.',
  rust: 'Un outil en ligne de commande en Rust (par exemple un renommeur de fichiers), testé.',
  python: 'Un script Python qui automatise une tâche réelle, avec ses tests et un README.',
  java: 'Une API Java avec Spring : quelques routes, une base, des tests.',
  spring: 'Une API Spring Boot avec une base PostgreSQL et des tests d’intégration.',
  typescript: 'Passer un de tes projets JavaScript en TypeScript strict.',
  react: 'Une petite application React publiée en ligne, avec une capture dans le README.',
  vue: 'Une petite application Vue publiée en ligne.',
  angular: 'Une petite application Angular avec un formulaire et des tests.',
  docker: 'Mettre un de tes projets dans Docker, avec un docker-compose pour la base.',
  kubernetes: 'Déployer un de tes projets sur un petit cluster local (kind ou minikube).',
  terraform: 'Décrire en Terraform l’infrastructure d’un petit projet.',
  aws: 'Héberger un petit projet sur l’offre gratuite d’AWS, avec la démarche dans le README.',
  linux: 'Un script d’administration Linux (sauvegarde, surveillance) documenté.',
  'ci cd': 'Ajouter une intégration continue (tests et lint) à un de tes projets.',
  sql: 'Une base de données modélisée avec ses requêtes et un schéma dans le README.',
  postgresql: 'Un projet avec une base PostgreSQL : schéma, migrations et requêtes.',
  mongodb: 'Une API qui stocke ses données dans MongoDB.',
  graphql: 'Une petite API GraphQL au-dessus d’une base existante.',
  'node js': 'Une API Node.js avec Express, testée.',
  'c++': 'Un petit programme C++ (structure de données, jeu en console) avec des tests.',
  'c#': 'Une application console ou web en C# avec des tests.',
  php: 'Une petite application PHP (Symfony ou Laravel) publiée en ligne.',
  kotlin: 'Une petite application Android en Kotlin.',
  flutter: 'Une petite application Flutter qui tourne sur Android.',
  'machine learning': 'Un notebook qui entraîne un modèle simple sur un jeu de données public.',
  git: 'Publier tes projets sur GitHub avec un historique propre et un README.',
};

export function ideeProjet(terme: string): string {
  return (
    IDEES[terme] ??
    `Un petit projet qui utilise ${nomTechnologie(terme)}, publié avec un README et des tests.`
  );
}

/** Termes envoyés à `technologies_demandees`. */
export const TERMES_TECHNOLOGIES: readonly string[] = TECHNOLOGIES;

/** Technologies citées par mes projets, sous forme normalisée et regroupée. */
function technologiesDuPortfolio(projets: ProjetPortfolio[]): string {
  const morceaux = projets.flatMap((projet) => [
    ...projet.technologies.flatMap((technologie) => technologie.split(/[/,]/)),
    projet.titre,
    projet.description,
  ]);
  return normalizeText(morceaux.join(' '));
}

function dansLeTexte(texte: string, terme: string): boolean {
  return containsWord(texte, terme) || containsWord(texte, terme.replace(/ /g, ''));
}

export interface ProjetAFaire {
  terme: string;
  nom: string;
  nombre: number;
  idee: string;
}

/**
 * Les technologies demandées par les offres que le portfolio ne montre pas, de la plus demandée à
 * la moins demandée. Les alias (« golang », « nodejs ») comptent pour leur forme principale : le plus grand compte est gardé, une offre pouvant citer les deux.
 */
export function projetsAFaire(
  demandes: { terme: string; nombre: number }[],
  projets: ProjetPortfolio[],
  limite = 5,
): ProjetAFaire[] {
  const parTerme = new Map<string, number>();
  for (const { terme, nombre } of demandes) {
    const principal = ALIAS[terme] ?? terme;
    parTerme.set(principal, Math.max(parTerme.get(principal) ?? 0, nombre));
  }
  const montre = technologiesDuPortfolio(projets);
  return [...parTerme]
    .filter(([terme]) => {
      const formes = [terme, ...Object.keys(ALIAS).filter((alias) => ALIAS[alias] === terme)];
      return !formes.some((forme) => dansLeTexte(montre, forme));
    })
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limite)
    .map(([terme, nombre]) => ({
      terme,
      nom: nomTechnologie(terme),
      nombre,
      idee: ideeProjet(terme),
    }));
}

/** Projets classés par nombre de technologies en commun avec un texte d'offre. */
export function projetsPourOffre<P extends ProjetPortfolio>(
  projets: P[],
  texteOffre: string,
): { projet: P; communes: string[] }[] {
  const offre = normalizeText(texteOffre);
  return projets
    .map((projet) => ({
      projet,
      communes: projet.technologies.filter((technologie) =>
        technologie
          .split(/[/,]/)
          .map(normalizeText)
          .filter(Boolean)
          .some((terme) => dansLeTexte(offre, terme)),
      ),
    }))
    .sort((a, b) => b.communes.length - a.communes.length);
}
