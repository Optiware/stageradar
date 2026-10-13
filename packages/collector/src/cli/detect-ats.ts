import { stringify } from 'yaml';
import { ATS_IDS, type AtsId, type WatchlistEntry } from '../connectors/ats';
import { essayerSite, reconnaitreAts } from '../connectors/detecter';

// Devine l'ATS d'un site carrière et propose l'entrée à ajouter à config/watchlist.yaml :
//   npm run detect-ats -- https://jobs.lever.co/woven-by-toyota
//   npm run detect-ats -- https://job-boards.greenhouse.io/datadog
//   npm run detect-ats -- datadog            (essaie ce nom sur chaque ATS)
//
// Rien n'est deviné sans preuve : l'entrée n'est proposée que si l'API publique répond.
// Depuis l'application, la même vérification se fait sur la fiche d'une entreprise (Démarchage).

const entree = process.argv[2];
if (!entree) {
  console.error('Usage : npm run detect-ats -- <url-carrière ou nom>');
  process.exit(1);
}

let candidats: [AtsId, string][] = reconnaitreAts(entree);
if (candidats.length === 0) {
  if (/^https?:/i.test(entree)) {
    console.error(
      "Adresse non reconnue. Ouvre la page carrière, clique sur une offre et regarde l'adresse : " +
        'si elle contient greenhouse.io, lever.co ou ashbyhq.com, relance avec cette adresse.',
    );
    process.exit(1);
  }
  candidats = ATS_IDS.map((ats) => [ats, entree.toLowerCase()]);
}

let trouve = false;
for (const [ats, slug] of candidats) {
  const site = await essayerSite(ats, slug);
  if (!site) {
    console.error(`${ats} : pas de site carrière public pour « ${slug} »`);
    continue;
  }
  trouve = true;
  const pays = site.pays.filter((code) => code !== 'FR');
  console.log(`\n${ats} « ${slug} » : ${site.annonces} annonce(s), dont ${site.stages} stage(s)`);
  console.log(`Pays suivis où elle recrute : ${site.pays.join(' ') || 'aucun'}`);
  if (pays.length === 0) {
    console.log('Aucun poste dans les pays visés : entrée sans intérêt pour le moment.');
    continue;
  }
  const proposition: WatchlistEntry = {
    nom: slug,
    pays,
    ats,
    slug,
    url_carriere: site.url_carriere,
    verifie_le: new Date().toISOString().slice(0, 10),
  };
  console.log('\nÀ coller dans config/watchlist.yaml (corriger `nom`) :\n');
  console.log(stringify([proposition]));
}
if (!trouve) process.exitCode = 1;
