import { stringify } from 'yaml';
import { ATS_IDS, atsConnector, type AtsId, type WatchlistEntry } from '../connectors/ats';

// Devine l'ATS d'un site carrière et propose l'entrée à ajouter à config/watchlist.yaml :
//   npm run detect-ats -- https://jobs.lever.co/woven-by-toyota
//   npm run detect-ats -- https://job-boards.greenhouse.io/datadog
//   npm run detect-ats -- datadog            (essaie ce nom sur chaque ATS)
//
// Rien n'est deviné sans preuve : l'entrée n'est proposée que si l'API publique répond.

const MOTIFS: [AtsId, RegExp][] = [
  [
    'greenhouse',
    /(?:job-boards|boards)(?:\.eu)?\.greenhouse\.io\/(?:embed\/job_board\?for=)?([\w-]+)/i,
  ],
  ['lever', /jobs\.lever\.co\/([\w-]+)/i],
  ['ashby', /jobs\.ashbyhq\.com\/([\w.-]+)/i],
];

const PAGE: Record<AtsId, (slug: string) => string> = {
  greenhouse: (slug) => `https://job-boards.greenhouse.io/${slug}`,
  lever: (slug) => `https://jobs.lever.co/${slug}`,
  ashby: (slug) => `https://jobs.ashbyhq.com/${slug}`,
};

const entree = process.argv[2];
if (!entree) {
  console.error('Usage : npm run detect-ats -- <url-carrière ou nom>');
  process.exit(1);
}

const candidats: [AtsId, string][] = [];
for (const [ats, motif] of MOTIFS) {
  const trouve = motif.exec(entree);
  if (trouve?.[1]) candidats.push([ats, trouve[1]]);
}
if (candidats.length === 0) {
  if (/^https?:/i.test(entree)) {
    console.error(
      "Adresse non reconnue. Ouvre la page carrière, clique sur une offre et regarde l'adresse : " +
        'si elle contient greenhouse.io, lever.co ou ashbyhq.com, relance avec cette adresse.',
    );
    process.exit(1);
  }
  for (const ats of ATS_IDS) candidats.push([ats, entree.toLowerCase()]);
}

let trouve = false;
for (const [ats, slug] of candidats) {
  const proposition: WatchlistEntry = {
    nom: slug,
    pays: [],
    ats,
    slug,
    url_carriere: PAGE[ats](slug),
    verifie_le: new Date().toISOString().slice(0, 10),
  };
  const connecteur = atsConnector(proposition);
  let annonces: unknown[];
  try {
    annonces = await connecteur.fetch({ pays: [] });
  } catch {
    console.error(`${ats} : pas de site carrière public pour « ${slug} »`);
    continue;
  }

  const parPays = new Map<string, number>();
  let stages = 0;
  for (const brute of annonces) {
    const offre = connecteur.normalize(brute as never);
    if (offre.type === 'stage' || /\bintern|stage|co-?op|인턴|インターン/i.test(offre.titre))
      stages++;
    const code = offre.pays ?? '??';
    parPays.set(code, (parPays.get(code) ?? 0) + 1);
  }
  proposition.pays = [...parPays.keys()].filter((code) => code !== '??' && code !== 'FR');
  trouve = true;

  console.log(`\n${ats} « ${slug} » : ${annonces.length} annonce(s), dont ${stages} stage(s)`);
  console.log(
    `Par pays suivi (?? = ailleurs ou non reconnu) : ${[...parPays].map(([code, n]) => `${code}=${n}`).join(' ')}`,
  );
  if (proposition.pays.length === 0) {
    console.log('Aucun poste dans les pays visés : entrée sans intérêt pour le moment.');
    continue;
  }
  console.log('\nÀ coller dans config/watchlist.yaml (corriger `nom`) :\n');
  console.log(stringify([proposition]));
}
if (!trouve) process.exitCode = 1;
