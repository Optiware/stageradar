import { containsWord, normalizeText } from './text';

interface PaysConnu {
  code: string;
  /** Noms du pays, normalisés (FR / EN / ES / langue locale). */
  noms: string[];
  /** Villes et provinces qui suffisent à identifier le pays, normalisées. Libellé affiché en valeur. */
  villes: Record<string, string>;
}

// Volontairement limité aux pays visés (§1) : tout le reste est « hors zone » pour l'application.
const PAYS: PaysConnu[] = [
  {
    code: 'JP',
    noms: ['japan', 'japon', '日本'],
    villes: {
      tokyo: 'Tokyo',
      東京: 'Tokyo',
      osaka: 'Osaka',
      大阪: 'Osaka',
      kyoto: 'Kyoto',
      yokohama: 'Yokohama',
      fukuoka: 'Fukuoka',
      nagoya: 'Nagoya',
      sapporo: 'Sapporo',
      kobe: 'Kobe',
    },
  },
  {
    code: 'KR',
    noms: ['south korea', 'korea', 'coree du sud', 'coree', 'corea del sur', '대한민국', '한국'],
    villes: {
      seoul: 'Séoul',
      서울: 'Séoul',
      pangyo: 'Pangyo',
      seongnam: 'Seongnam',
      busan: 'Busan',
      incheon: 'Incheon',
      daejeon: 'Daejeon',
    },
  },
  {
    code: 'CO',
    noms: ['colombia', 'colombie'],
    villes: {
      bogota: 'Bogota',
      medellin: 'Medellín',
      cali: 'Cali',
      barranquilla: 'Barranquilla',
      cartagena: 'Carthagène',
      bucaramanga: 'Bucaramanga',
    },
  },
  {
    code: 'CA',
    noms: ['canada'],
    villes: {
      toronto: 'Toronto',
      montreal: 'Montréal',
      vancouver: 'Vancouver',
      ottawa: 'Ottawa',
      calgary: 'Calgary',
      edmonton: 'Edmonton',
      waterloo: 'Waterloo',
      kitchener: 'Kitchener',
      'quebec city': 'Québec',
      winnipeg: 'Winnipeg',
      halifax: 'Halifax',
      mississauga: 'Mississauga',
      ontario: '',
      quebec: '',
      'british columbia': '',
      alberta: '',
    },
  },
  {
    // Seule Londres est visée au Royaume-Uni : le pays n'est reconnu que par cette ville, et non
    // par son nom (« Manchester, United Kingdom » reste hors zone).
    code: 'GB',
    noms: [],
    villes: {
      london: 'Londres',
      londres: 'Londres',
    },
  },
  {
    code: 'FR',
    noms: ['france'],
    villes: {
      paris: 'Paris',
      lyon: 'Lyon',
      marseille: 'Marseille',
      toulouse: 'Toulouse',
      nantes: 'Nantes',
      bordeaux: 'Bordeaux',
      lille: 'Lille',
      rennes: 'Rennes',
      strasbourg: 'Strasbourg',
      grenoble: 'Grenoble',
      montpellier: 'Montpellier',
      nice: 'Nice',
    },
  },
];

export interface Lieu {
  /** Code ISO 3166-1 alpha-2, ou `null` si le pays n'est pas l'un des pays suivis. */
  pays: string | null;
  ville: string | null;
}

/**
 * Tous les pays suivis reconnus dans un libellé de lieu (« Tokyo, Japan », « Toronto, ON »…),
 * dans l'ordre du texte. Un libellé peut en citer plusieurs (« Tokyo; Seoul »).
 */
export function findLieux(libelle: string | null | undefined): Lieu[] {
  const texte = normalizeText(libelle);
  if (!texte) return [];
  const trouves: (Lieu & { position: number })[] = [];
  for (const pays of PAYS) {
    let ville: string | null = null;
    let position = Infinity;
    for (const [cle, nom] of Object.entries(pays.villes)) {
      if (!containsWord(texte, cle)) continue;
      const ici = texte.indexOf(cle);
      if (ici < position) position = ici;
      if (!ville && nom) ville = nom;
    }
    for (const nom of pays.noms) {
      if (containsWord(texte, nom)) position = Math.min(position, texte.indexOf(nom));
    }
    if (position !== Infinity) trouves.push({ pays: pays.code, ville, position });
  }
  return trouves
    .sort((a, b) => a.position - b.position)
    .map(({ pays, ville }) => ({ pays, ville }));
}
