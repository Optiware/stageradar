import type { Session } from '@supabase/supabase-js';
import { createContext, useContext } from 'react';

export interface AuthState {
  /** `undefined` pendant la lecture de la session stockée, `null` si déconnecté. */
  session: Session | null | undefined;
  /** Envoie un lien magique à cette adresse. */
  signIn(email: string): Promise<void>;
  signOut(): Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth doit être utilisé sous <AuthProvider>');
  return value;
}
