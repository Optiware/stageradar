import { useState, type FormEvent } from 'react';
import { useAuth } from '../lib/auth-context';

type Status =
  | { step: 'idle' }
  | { step: 'sending' }
  | { step: 'sent'; email: string }
  | { step: 'error'; message: string };

export function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>({ step: 'idle' });

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const address = email.trim();
    setStatus({ step: 'sending' });
    try {
      await signIn(address);
      setStatus({ step: 'sent', email: address });
    } catch (error) {
      setStatus({
        step: 'error',
        message: error instanceof Error ? error.message : "L'envoi a échoué.",
      });
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <img src="/logo.svg" alt="" width={64} height={64} className="rounded-2xl" />
      <h1 className="mt-6 text-2xl font-semibold">StageRadar</h1>
      <p className="mt-1 text-slate-600 dark:text-slate-300">
        Alternance et stages à l'étranger, au même endroit.
      </p>

      {status.step === 'sent' ? (
        <div
          role="status"
          className="mt-8 rounded-xl border border-accent-600/40 bg-accent-50 p-4 dark:bg-accent-900/30"
        >
          <p className="font-medium">Lien envoyé</p>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
            Ouvre l'e-mail reçu sur <strong className="break-all">{status.email}</strong> et clique
            sur le lien, depuis cet appareil.
          </p>
          <button
            type="button"
            onClick={() => setStatus({ step: 'idle' })}
            className="mt-3 text-sm font-medium text-accent-700 underline dark:text-accent-300"
          >
            Utiliser une autre adresse
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-8">
          <label htmlFor="email" className="block text-sm font-medium">
            Adresse e-mail
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base dark:border-slate-700 dark:bg-slate-900"
          />
          <button
            type="submit"
            disabled={status.step === 'sending'}
            className="mt-4 w-full rounded-lg bg-accent-700 px-4 py-2.5 font-medium text-white hover:bg-accent-600 disabled:opacity-60"
          >
            {status.step === 'sending' ? 'Envoi…' : 'Recevoir un lien de connexion'}
          </button>
          {status.step === 'error' && (
            <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-400">
              {status.message}
            </p>
          )}
        </form>
      )}
    </main>
  );
}
