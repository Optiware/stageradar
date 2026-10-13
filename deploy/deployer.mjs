// Déploie StageRadar sur le VPS : `npm run deploy`.
//
// 1. empaquette le collecteur, puis copie deploy/serveur et les migrations dans /opt/stageradar ;
// 2. y lance installer.sh (base, authentification, API, nginx, certificat, sauvegardes, collecte) ;
// 3. construit le front avec l'adresse et la clé publique du serveur ;
// 4. remplace /var/www/stageradar par la nouvelle version ;
// 5. vérifie que le site répond.
//
// Rejouable : relancer la commande met à jour sans rien perdre.
import { spawn, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const RACINE = join(import.meta.dirname, '..');
const DISTANT = '/opt/stageradar';
const WEB = '/var/www/stageradar';
// Jamais de question posée en cours de route : une clé SSH doit déjà être en place.
const SSH = ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=15'];

if (existsSync(join(RACINE, '.env'))) process.loadEnvFile(join(RACINE, '.env'));
const { DEPLOY_SSH, DEPLOY_DOMAINE, PROPRIETAIRE_EMAIL } = process.env;

// Ces valeurs sont insérées dans des commandes exécutées sur le serveur : format strict.
const FORMATS = {
  DEPLOY_SSH: /^[a-z0-9_-]+@[a-z0-9.-]+$/i,
  DEPLOY_DOMAINE: /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/,
  PROPRIETAIRE_EMAIL: /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i,
};
for (const [nom, format] of Object.entries(FORMATS)) {
  if (!format.test(process.env[nom] ?? '')) {
    console.error(`Variable ${nom} absente ou invalide. Voir .env.example.`);
    process.exit(1);
  }
}

function etape(titre) {
  console.log(`\n== ${titre}`);
}

function executer(commande, args, options = {}) {
  const resultat = spawnSync(commande, args, { stdio: 'inherit', ...options });
  if (resultat.status !== 0) {
    console.error(`Échec : ${commande} ${args.join(' ')}`);
    process.exit(1);
  }
  return resultat;
}

function distant(commande, options = {}) {
  return executer('ssh', [...SSH, DEPLOY_SSH, commande], options);
}

/** Envoie le contenu d'un dossier local, par tar à travers SSH, dans un dossier du serveur. */
function envoyer(dossierLocal, dossierDistant) {
  return new Promise((resolve, reject) => {
    const tar = spawn('tar', ['-cf', '-', '.'], {
      cwd: dossierLocal,
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    const ssh = spawn(
      'ssh',
      [
        ...SSH,
        DEPLOY_SSH,
        `mkdir -p ${dossierDistant} && tar -xf - --no-same-owner --no-same-permissions -C ${dossierDistant}`,
      ],
      { stdio: ['pipe', 'inherit', 'inherit'] },
    );
    tar.stdout.pipe(ssh.stdin);
    tar.on('error', reject);
    ssh.on('error', reject);
    ssh.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`Envoi de ${dossierLocal} : code ${code}`)),
    );
  });
}

async function verifier(chemin, attendu, init) {
  const url = `https://${DEPLOY_DOMAINE}${chemin}`;
  const reponse = await fetch(url, init);
  const ok = reponse.status === attendu;
  console.log(`${ok ? 'ok ' : 'KO '} ${reponse.status} ${chemin}`);
  return ok;
}

etape('Empaquetage du collecteur');
// Un seul fichier JavaScript : le serveur n'a besoin ni des sources ni de `npm install`.
const COLLECTEUR = join(RACINE, 'packages', 'collector', 'dist');
executer('npm', ['run', 'bundle', '-w', '@stageradar/collector'], { cwd: RACINE, shell: true });
copyFileSync(join(RACINE, 'config', 'watchlist.yaml'), join(COLLECTEUR, 'watchlist.yaml'));

etape('Copie des fichiers du serveur');
// Migrations et collecteur sont remplacés en bloc ; le reste (.env, sauvegardes) n'est jamais effacé.
distant(`mkdir -p ${DISTANT} && rm -rf ${DISTANT}/migrations ${DISTANT}/collecteur`);
await envoyer(join(RACINE, 'deploy', 'serveur'), DISTANT);
await envoyer(join(RACINE, 'supabase', 'migrations'), `${DISTANT}/migrations`);
await envoyer(COLLECTEUR, `${DISTANT}/collecteur`);

etape('Installation sur le serveur');
distant(
  `cd ${DISTANT} && DOMAINE=${DEPLOY_DOMAINE} PROPRIETAIRE_EMAIL=${PROPRIETAIRE_EMAIL} bash installer.sh`,
);

etape('Construction du front');
const cle = distant(`grep '^ANON_KEY=' ${DISTANT}/.env`, {
  stdio: ['ignore', 'pipe', 'inherit'],
  encoding: 'utf8',
})
  .stdout.trim()
  .replace(/^ANON_KEY=/, '');
executer('npm', ['run', 'build'], {
  cwd: RACINE,
  shell: true,
  env: {
    ...process.env,
    VITE_SUPABASE_URL: `https://${DEPLOY_DOMAINE}`,
    VITE_SUPABASE_KEY: cle,
  },
});

etape('Mise en ligne du front');
distant(`rm -rf ${WEB}.nouveau`);
await envoyer(join(RACINE, 'apps', 'web', 'dist'), `${WEB}.nouveau`);
distant(
  [
    `chmod -R u=rwX,go=rX ${WEB}.nouveau`,
    `rm -rf ${WEB}.ancien`,
    `mv ${WEB} ${WEB}.ancien`,
    `mv ${WEB}.nouveau ${WEB}`,
    `rm -rf ${WEB}.ancien`,
  ].join(' && '),
);

etape('Vérifications');
const resultats = [
  await verifier('/', 200),
  await verifier('/manifest.webmanifest', 200),
  await verifier('/robots.txt', 200),
  await verifier('/auth/v1/health', 200),
  await verifier('/api/sante', 200),
  // Le service de l'application ne répond qu'au propriétaire.
  await verifier('/api/importer', 401, { method: 'POST' }),
  // Sans compte : aucun accès aux données, et l'administration des comptes est invisible.
  await verifier('/rest/v1/rpc/is_owner', 401, { method: 'POST' }),
  await verifier('/rest/v1/offers', 401),
  await verifier('/auth/v1/admin/users', 404),
];
if (resultats.includes(false)) {
  console.error('\nLe déploiement est en place mais une vérification a échoué.');
  process.exit(1);
}
console.log(`\nStageRadar est en ligne : https://${DEPLOY_DOMAINE}`);
