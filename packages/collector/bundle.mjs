// Empaquette pour le serveur, chacun en un seul fichier exécutable sans sources ni `npm install` :
// - dist/collect.mjs : la collecte, lancée par cron (`node collect.mjs`) ;
// - dist/api.mjs : le service appelé par l'application (`node api.mjs`).
import { build } from 'esbuild';

await build({
  entryPoints: { collect: 'src/cli/run.ts', api: 'src/cli/api.ts' },
  outdir: 'dist',
  outExtension: { '.js': '.mjs' },
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  logLevel: 'warning',
  // Certaines dépendances sont en CommonJS et appellent `require` : il n'existe pas dans un module ES.
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module';\nconst require = __createRequire(import.meta.url);",
  },
});
