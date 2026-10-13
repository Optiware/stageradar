import type { ReactNode } from 'react';
import { BADGE, CARTE, SECONDAIRE } from '../lib/ui';

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
      <div className={`mt-6 max-w-3xl ${CARTE}`}>
        <p>
          <span className={BADGE.vert}>Prévu au lot {lot}</span>
        </p>
        <p className={`mt-3 ${SECONDAIRE}`}>{children}</p>
      </div>
    </>
  );
}
