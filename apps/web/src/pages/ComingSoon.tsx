import type { ReactNode } from 'react';

/** Écran pas encore réalisé : annonce son contenu et le lot qui le livrera. */
export function ComingSoon({
  title,
  lot,
  children,
}: {
  title: string;
  lot: number;
  children: ReactNode;
}) {
  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
      <div className="mt-6 rounded-3xl border border-dashed border-gray-300 p-6 dark:border-gray-700">
        <p className="text-sm font-medium text-primary-700 dark:text-primary-400">
          Prévu au lot {lot}
        </p>
        <p className="mt-2 text-gray-600 dark:text-gray-300">{children}</p>
      </div>
    </>
  );
}
