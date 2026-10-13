import type { Session } from '@supabase/supabase-js';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AuthContext, type AuthState } from './auth-context';
import { supabase } from './supabase';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null);

  useEffect(() => {
    if (!supabase) return;
    // Émet INITIAL_SESSION dès l'abonnement, puis chaque connexion / déconnexion.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      async signIn(email, password) {
        if (!supabase) throw new Error('Supabase non configuré');
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      async changePassword(password) {
        if (!supabase) throw new Error('Supabase non configuré');
        const { error } = await supabase.auth.updateUser({ password });
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
