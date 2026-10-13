import { useState, type FormEvent } from 'react';
import { useAuth } from '../lib/auth-context';
import { authErrorMessage } from '../lib/auth-errors';

type Status = { step: 'idle' } | { step: 'sending' } | { step: 'error'; message: string };

const FIELD_CLASS =
  'mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base dark:border-slate-700 dark:bg-slate-900';

export function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<Status>({ step: 'idle' });

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus({ step: 'sending' });
    try {
      // En cas de succès, AuthProvider reçoit la session et l'application remplace cet écran.
      await signIn(email.trim(), password);
    } catch (error) {
      setStatus({ step: 'error', message: authErrorMessage(error) });
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <img src="/logo.svg" alt="" width={64} height={64} className="rounded-2xl" />
      <h1 className="mt-6 text-2xl font-semibold">StageRadar</h1>
      <p className="mt-1 text-slate-600 dark:text-slate-300">
        Alternance et stages à l'étranger, au même endroit.
      </p>

      <form onSubmit={onSubmit} className="mt-8">
        <label htmlFor="email" className="block text-sm font-medium">
          Adresse e-mail
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="username"
          inputMode="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={FIELD_CLASS}
        />
        <label htmlFor="password" className="mt-4 block text-sm font-medium">
          Mot de passe
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={FIELD_CLASS}
        />
        <button
          type="submit"
          disabled={status.step === 'sending'}
          className="mt-4 w-full rounded-lg bg-accent-700 px-4 py-2.5 font-medium text-white hover:bg-accent-600 disabled:opacity-60"
        >
          {status.step === 'sending' ? 'Connexion…' : 'Se connecter'}
        </button>
        {status.step === 'error' && (
          <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-400">
            {status.message}
          </p>
        )}
      </form>
    </main>
  );
}
