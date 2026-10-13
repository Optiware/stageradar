import { useState, type FormEvent } from 'react';
import { useAuth } from '../lib/auth-context';
import { authErrorMessage, PASSWORD_MIN_LENGTH } from '../lib/auth-errors';

type Status =
  { step: 'idle' } | { step: 'sending' } | { step: 'done' } | { step: 'error'; message: string };

const FIELD_CLASS =
  'mt-1.5 block w-full rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-base dark:border-gray-700 dark:bg-gray-950';

/** Formulaire de changement de mot de passe du compte connecté. */
export function ChangePassword() {
  const { changePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [status, setStatus] = useState<Status>({ step: 'idle' });

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirmation) {
      setStatus({ step: 'error', message: 'Les deux mots de passe sont différents.' });
      return;
    }
    setStatus({ step: 'sending' });
    try {
      await changePassword(password);
      setPassword('');
      setConfirmation('');
      setStatus({ step: 'done' });
    } catch (error) {
      setStatus({ step: 'error', message: authErrorMessage(error) });
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-6 max-w-sm border-t border-gray-200 pt-4 dark:border-gray-800"
    >
      <h3 className="text-sm font-medium">Changer le mot de passe</h3>
      <label htmlFor="new-password" className="mt-3 block text-sm">
        Nouveau mot de passe
      </label>
      <input
        id="new-password"
        type="password"
        required
        minLength={PASSWORD_MIN_LENGTH}
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        className={FIELD_CLASS}
      />
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {PASSWORD_MIN_LENGTH} caractères au moins.
      </p>
      <label htmlFor="confirm-password" className="mt-3 block text-sm">
        Confirmation
      </label>
      <input
        id="confirm-password"
        type="password"
        required
        autoComplete="new-password"
        value={confirmation}
        onChange={(event) => setConfirmation(event.target.value)}
        className={FIELD_CLASS}
      />
      <button
        type="submit"
        disabled={status.step === 'sending'}
        className="mt-4 rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold hover:bg-gray-100 disabled:opacity-60 dark:border-gray-700 dark:hover:bg-gray-800"
      >
        {status.step === 'sending' ? 'Enregistrement…' : 'Changer le mot de passe'}
      </button>
      {status.step === 'done' && (
        <p role="status" className="mt-3 text-sm text-primary-700 dark:text-primary-400">
          Mot de passe changé.
        </p>
      )}
      {status.step === 'error' && (
        <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-400">
          {status.message}
        </p>
      )}
    </form>
  );
}
