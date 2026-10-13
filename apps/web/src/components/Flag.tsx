import type { ReactNode } from 'react';

// Drapeaux dessinés ici plutôt qu'en émojis : Windows n'affiche pas les émojis de drapeaux.
// Tracés simplifiés, au format 3:2.
const DRAPEAUX: Record<string, ReactNode> = {
  FR: (
    <>
      <rect width="10" height="20" fill="#0055a4" />
      <rect x="10" width="10" height="20" fill="#fff" />
      <rect x="20" width="10" height="20" fill="#ef4135" />
    </>
  ),
  JP: (
    <>
      <rect width="30" height="20" fill="#fff" />
      <circle cx="15" cy="10" r="6" fill="#bc002d" />
    </>
  ),
  KR: (
    <>
      <rect width="30" height="20" fill="#fff" />
      <g transform="rotate(33.69 15 10)">
        <path d="M10 10a5 5 0 0 1 10 0z" fill="#cd2e3a" />
        <path d="M10 10a5 5 0 0 0 10 0z" fill="#0047a0" />
        <circle cx="12.5" cy="10" r="2.5" fill="#cd2e3a" />
        <circle cx="17.5" cy="10" r="2.5" fill="#0047a0" />
        <path d="M4.6 7.5v5M5.9 7.5v5M7.2 7.5v5M22.8 7.5v5M24.1 7.5v5M25.4 7.5v5" stroke="#111" />
      </g>
      <g transform="rotate(-33.69 15 10)">
        <path d="M4.6 7.5v5M5.9 7.5v5M7.2 7.5v5M22.8 7.5v5M24.1 7.5v5M25.4 7.5v5" stroke="#111" />
      </g>
    </>
  ),
  CO: (
    <>
      <rect width="30" height="10" fill="#fcd116" />
      <rect y="10" width="30" height="5" fill="#003893" />
      <rect y="15" width="30" height="5" fill="#ce1126" />
    </>
  ),
  CA: (
    <>
      <rect width="30" height="20" fill="#fff" />
      <rect width="7.5" height="20" fill="#d52b1e" />
      <rect x="22.5" width="7.5" height="20" fill="#d52b1e" />
      <polygon
        transform="translate(7.5 2.3) scale(1.5)"
        fill="#d52b1e"
        points="5,.5 4.2,2.2 3.2,1.7 3.7,4.6 2.3,3.2 2,4 .6,3.7 1.1,5.3 .5,5.8 3,7.7 2.7,8.6 4.8,8.3 4.8,9.8 5.2,9.8 5.2,8.3 7.3,8.6 7,7.7 9.5,5.8 8.9,5.3 9.4,3.7 8,4 7.7,3.2 6.3,4.6 6.8,1.7 5.8,2.2"
      />
    </>
  ),
};

/** Drapeau d'un pays (code ISO) ; pour un pays sans dessin, son code. Purement décoratif. */
export function Flag({ code, className = '' }: { code: string | null; className?: string }) {
  if (!code) return null;
  const dessin = DRAPEAUX[code];
  if (!dessin) {
    return (
      <span
        aria-hidden="true"
        className={`inline-flex h-3.5 items-center rounded-sm bg-gray-200 px-1 text-[0.625rem] leading-none font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200 ${className}`}
      >
        {code}
      </span>
    );
  }
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 30 20"
      className={`inline-block h-3.5 w-[1.3125rem] shrink-0 rounded-[3px] ring-1 ring-gray-900/10 dark:ring-white/20 ${className}`}
    >
      {dessin}
    </svg>
  );
}
