import type { Session } from '@supabase/supabase-js';
import { createContext, useContext } from 'react';

export interface AuthState {
  /** `undefined` pendant la lecture de la session stockée, `null` si déconnecté. */
  session: Session | null | undefined;
  /** Connexion par adresse e-mail et mot de passe. */
  signIn(email: string, password: string): Promise<void>;
  /** Change le mot de passe du compte connecté. */
  changePassword(password: string): Promise<void>;
  signOut(): Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth doit être utilisé sous <AuthProvider>');
  return value;
}
