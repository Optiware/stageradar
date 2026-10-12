import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_KEY;

/** Clé de stockage de la session dans le navigateur. */
export const AUTH_STORAGE_KEY = 'stageradar-auth';

/**
 * Client Supabase, ou `null` tant que `.env` n'est pas rempli.
 * La clé utilisée ici est la clé publique : l'accès aux données est limité par la RLS.
 */
export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key, { auth: { storageKey: AUTH_STORAGE_KEY } }) : null;
