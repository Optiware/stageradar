import type { Session } from '@supabase/supabase-js';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AuthContext, type AuthState } from './auth-context';
import { supabase } from './supabase';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null);

  useEffect(() => {
    if (!supabase) return;
    // Émet INITIAL_SESSION dès l'abonnement, puis chaque connexion / déconnexion,
    // y compris le retour depuis le lien magique.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      async signIn(email) {
        if (!supabase) throw new Error('Supabase non configuré');
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
      },
      async signOut() {
        await supabase?.auth.signOut();
      },
    }),
    [session],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
