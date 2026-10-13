import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { Connector } from '@stageradar/shared';
import type { Notifieur } from '../notifications/envoi';
import { essayerSite, reconnaitreAts } from '../connectors/detecter';
import { collect } from '../pipeline/collect';
import type { Store } from '../pipeline/store';
import { DemandeInvalide, importerOffre, type DemandeImport } from './importer';
import { lirePage } from './telecharger';

// Petit service appelé par l'application pour ce que le navigateur ne peut pas faire lui-même :
// lire la page d'une offre à importer, lancer une collecte. Il n'écoute que sur le serveur
// (nginx lui transmet /api/) et ne répond qu'au propriétaire.

const CORPS_MAX = 64 * 1024;

export interface Dependances {
  store: Store;
  connecteurs: () => Connector[] | Promise<Connector[]>;
  /** Vrai si ce jeton (en-tête Authorization) est celui du propriétaire. */
  estProprietaire: (autorisation: string) => Promise<boolean>;
  lire?: (url: string) => Promise<string>;
  /** Absent tant que les clés de notification ne sont pas en place. */
  notifieur?: Notifieur | null;
  /** Clé publique que le navigateur doit présenter pour s'abonner aux notifications. */
  clePublique?: string | null;
}

/**
 * Demande à la base si le jeton est celui du propriétaire : la même fonction `is_owner()` que
 * celle des règles de sécurité. Un « oui » est gardé une minute pour ne pas la rappeler sans cesse.
 */
export function verificateur(urlRest: string): Dependances['estProprietaire'] {
  const connus = new Map<string, number>();
  return async (autorisation) => {
    if ((connus.get(autorisation) ?? 0) > Date.now()) return true;
    const reponse = await fetch(`${urlRest}/rpc/is_owner`, {
      method: 'POST',
      headers: { Authorization: autorisation, 'Content-Type': 'application/json' },
      body: '{}',
      signal: AbortSignal.timeout(10_000),
    });
    if (!reponse.ok || (await reponse.json()) !== true) return false;
    if (connus.size > 100) connus.clear();
    connus.set(autorisation, Date.now() + 60_000);
    return true;
  };
}

async function lireJson(requete: IncomingMessage): Promise<unknown> {
  const morceaux: Buffer[] = [];
  let taille = 0;
  for await (const morceau of requete) {
    taille += (morceau as Buffer).length;
    if (taille > CORPS_MAX) throw new DemandeInvalide('Demande trop volumineuse.');
    morceaux.push(morceau as Buffer);
  }
  if (taille === 0) return {};
  try {
    return JSON.parse(Buffer.concat(morceaux).toString('utf8'));
  } catch {
    throw new DemandeInvalide('Demande illisible.');
  }
}

function repondre(reponse: ServerResponse, statut: number, corps: unknown): void {
  reponse.writeHead(statut, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  reponse.end(JSON.stringify(corps));
}

export function creerServeur(dependances: Dependances) {
  // Une seule collecte à la fois : une seconde demande reçoit le résultat de celle en cours.
  let collecteEnCours: Promise<unknown> | null = null;

  async function traiter(requete: IncomingMessage, reponse: ServerResponse): Promise<void> {
    const chemin = new URL(requete.url ?? '/', 'http://localhost').pathname;
    if (requete.method === 'GET' && chemin === '/sante')
      return repondre(reponse, 200, { ok: true });
    if (requete.method !== 'POST') return repondre(reponse, 404, { message: 'Introuvable.' });

    const autorisation = requete.headers.authorization ?? '';
    if (!/^Bearer \S+$/.test(autorisation) || !(await dependances.estProprietaire(autorisation))) {
      return repondre(reponse, 401, { message: 'Réservé au propriétaire.' });
    }

    if (chemin === '/importer') {
      const demande = (await lireJson(requete)) as DemandeImport;
      const resultat = await importerOffre(demande, {
        store: dependances.store,
        lire: dependances.lire ?? lirePage,
        maintenant: new Date(),
      });
      return repondre(reponse, 200, resultat);
    }

    if (chemin === '/collecter') {
      collecteEnCours ??= Promise.resolve(dependances.connecteurs())
        .then((connecteurs) =>
          collect(connecteurs, dependances.store, {
            runId: randomUUID(),
            maintenant: new Date(),
            signal: AbortSignal.timeout(10 * 60_000),
          }),
        )
        .then(async (bilans) => {
          // Une notification manquée ne doit pas faire échouer la collecte.
          await dependances.notifieur
            ?.nouvelles(
              bilans.flatMap((bilan) => bilan.nouvellesOffres),
              new Date(),
            )
            .catch((erreur: unknown) => console.error('Notifications :', erreur));
          return bilans;
        })
        .then((bilans) => ({
          sources: bilans.length,
          en_erreur: bilans.filter((bilan) => bilan.statut === 'erreur').length,
          lues: bilans.reduce((somme, bilan) => somme + bilan.lues, 0),
          retenues: bilans.reduce((somme, bilan) => somme + bilan.retenues, 0),
          nouvelles: bilans.reduce((somme, bilan) => somme + bilan.nouvelles, 0),
        }))
        .finally(() => {
          collecteEnCours = null;
        });
      return repondre(reponse, 200, await collecteEnCours);
    }

    if (chemin === '/sources/detecter') {
      const { url } = (await lireJson(requete)) as { url?: string };
      if (!url || !/^https?:\/\//i.test(url)) {
        throw new DemandeInvalide("Donne l'adresse de la page carrière (https://…).");
      }
      // D'abord l'adresse elle-même ; sinon la page, qui renvoie souvent vers le site carrière.
      let candidats = reconnaitreAts(url);
      if (candidats.length === 0) {
        const html = await (dependances.lire ?? lirePage)(url).catch(() => '');
        candidats = reconnaitreAts(html).slice(0, 3);
      }
      for (const [ats, slug] of candidats) {
        const site = await essayerSite(ats, slug);
        if (site) return repondre(reponse, 200, { site });
      }
      return repondre(reponse, 200, { site: null });
    }

    if (chemin === '/push/cle') {
      return repondre(reponse, 200, { cle: dependances.clePublique ?? null });
    }

    if (chemin === '/push/essai') {
      if (!dependances.notifieur) {
        return repondre(reponse, 503, { message: 'Notifications non configurées sur le serveur.' });
      }
      return repondre(reponse, 200, { appareils: await dependances.notifieur.essai() });
    }

    return repondre(reponse, 404, { message: 'Introuvable.' });
  }

  return createServer((requete, reponse) => {
    traiter(requete, reponse).catch((erreur: unknown) => {
      if (erreur instanceof DemandeInvalide) {
        return repondre(reponse, 400, { message: erreur.message });
      }
      console.error(new Date().toISOString(), requete.method, requete.url, erreur);
      if (!reponse.headersSent) repondre(reponse, 500, { message: 'Erreur du serveur.' });
    });
  });
}
