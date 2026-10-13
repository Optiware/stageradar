import { supabase } from './supabase';

// Service de l'application sur le serveur (packages/collector/src/api) : il fait ce que le
// navigateur ne peut pas faire seul, comme lire la page d'une offre à importer.

const BASE = `${import.meta.env.VITE_SUPABASE_URL ?? ''}/api`;

export class ErreurApi extends Error {
  constructor(
    readonly statut: number,
    message: string,
  ) {
    super(message);
  }
}

/** Appelle le service avec le jeton de la session : il ne répond qu'au propriétaire. */
export async function appelerApi<T>(chemin: string, corps: unknown = {}): Promise<T> {
  const { data } = await supabase!.auth.getSession();
  const jeton = data.session?.access_token;
  if (!jeton) throw new ErreurApi(401, 'Session expirée.');
  const reponse = await fetch(`${BASE}${chemin}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
  });
  const resultat = (await reponse.json().catch(() => null)) as (T & { message?: string }) | null;
  if (!reponse.ok || resultat === null) {
    throw new ErreurApi(reponse.status, resultat?.message ?? 'Le serveur ne répond pas.');
  }
  return resultat;
}

export interface ResultatImport {
  id: string;
  nouvelle: boolean;
  origine: 'page' | 'partage' | 'illisible';
  titre: string;
}

export interface BilanCollecte {
  sources: number;
  en_erreur: number;
  lues: number;
  retenues: number;
  nouvelles: number;
}
