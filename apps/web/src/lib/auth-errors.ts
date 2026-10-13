import { isAuthError } from '@supabase/supabase-js';

/** Longueur minimale imposée par le serveur (GOTRUE_PASSWORD_MIN_LENGTH). */
export const PASSWORD_MIN_LENGTH = 12;

/** Message en français pour une erreur renvoyée par le service d'authentification. */
export function authErrorMessage(error: unknown): string {
  if (isAuthError(error)) {
    if (error.code === 'invalid_credentials') return 'Adresse ou mot de passe incorrect.';
    if (error.code === 'weak_password') {
      return `Mot de passe trop court : ${PASSWORD_MIN_LENGTH} caractères au moins.`;
    }
    if (error.code === 'same_password') return "C'est déjà ton mot de passe actuel.";
    if (error.status === 429) return "Trop d'essais. Réessaie dans une minute.";
  }
  return 'Le serveur ne répond pas. Vérifie ta connexion et réessaie.';
}
