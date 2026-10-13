import { useState, type FormEvent } from 'react';
import { useAuth } from '../lib/auth-context';
import { authErrorMessage } from '../lib/auth-errors';
import { BOUTON_PRINCIPAL, CARTE, CHAMP, SECONDAIRE } from '../lib/ui';

type Status = { step: 'idle' } | { step: 'sending' } | { step: 'error'; message: string };

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
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-8">
      <div className={`${CARTE} sm:p-8`}>
        <img src="/logo.svg" alt="" width={64} height={64} className="rounded-2xl" />
        <h1 className="mt-6 text-2xl font-extrabold tracking-tight">StageRadar</h1>
        <p className={`mt-1 ${SECONDAIRE}`}>Alternance et stages à l'étranger, au même endroit.</p>

        <form onSubmit={onSubmit} className="mt-8">
          <label htmlFor="email" className="block text-sm font-bold">
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
            className={CHAMP}
          />
          <label htmlFor="password" className="mt-4 block text-sm font-bold">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={CHAMP}
          />
          <button
            type="submit"
            disabled={status.step === 'sending'}
            className={`mt-6 w-full ${BOUTON_PRINCIPAL}`}
          >
            {status.step === 'sending' ? 'Connexion…' : 'Se connecter'}
          </button>
          {status.step === 'error' && (
            <p role="alert" className="mt-3 text-sm font-bold text-red-700 dark:text-red-400">
              {status.message}
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
