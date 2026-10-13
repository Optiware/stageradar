import type { ReactNode } from 'react';

/** Écran plein, centré : chargement, configuration manquante, compte non autorisé. */
export function StatusScreen({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <img src="/logo.svg" alt="" width={64} height={64} className="mb-6 rounded-2xl" />
      <h1 className="text-xl font-extrabold tracking-tight">{title}</h1>
      {children && (
        <div className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400 [&_code]:rounded [&_code]:bg-gray-200 [&_code]:px-1 [&_code]:py-0.5 dark:[&_code]:bg-gray-800">
          {children}
        </div>
      )}
    </main>
  );
}
