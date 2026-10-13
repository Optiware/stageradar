// Empaquette le collecteur en un seul fichier, dist/collect.mjs, pour le serveur :
// il s'y exécute avec `node collect.mjs`, sans sources ni `npm install`.
import { build } from 'esbuild';

await build({
  entryPoints: ['src/cli/run.ts'],
  outfile: 'dist/collect.mjs',
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
