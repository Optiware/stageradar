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
      <h1 className="text-2xl font-semibold">{title}</h1>
      <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-6 dark:border-slate-700">
        <p className="text-sm font-medium text-accent-700 dark:text-accent-300">
          Prévu au lot {lot}
        </p>
        <p className="mt-2 text-slate-600 dark:text-slate-300">{children}</p>
      </div>
    </>
  );
}
