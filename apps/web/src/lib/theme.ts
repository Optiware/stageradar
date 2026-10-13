import { useSyncExternalStore } from 'react';

export type Theme = 'clair' | 'sombre';

const CLE = 'stageradar-theme';
// Couleur de la barre du système (Android) et de la barre de titre (Windows).
const COULEUR_BARRE: Record<Theme, string> = { clair: '#f3f4f6', sombre: '#030712' };

/** Thème choisi sur cet appareil. Clair tant que rien n'a été choisi. */
export function themeEnregistre(): Theme {
  try {
    return localStorage.getItem(CLE) === 'sombre' ? 'sombre' : 'clair';
  } catch {
    return 'clair';
  }
}

export function appliquerTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'sombre');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COULEUR_BARRE[theme]);
}

function themeAffiche(): Theme {
  return document.documentElement.classList.contains('dark') ? 'sombre' : 'clair';
}

// Le thème se change à deux endroits (bouton de la navigation, écran « Plus ») : chacun est
// prévenu quand l'autre le modifie.
const abonnes = new Set<() => void>();

function abonner(prevenir: () => void): () => void {
  abonnes.add(prevenir);
  return () => abonnes.delete(prevenir);
}

export function choisirTheme(theme: Theme): void {
  try {
    localStorage.setItem(CLE, theme);
  } catch {
    // Stockage indisponible (navigation privée) : le choix vaut pour cette visite.
  }
  // Fondu des couleurs uniquement lors d'un changement demandé : au chargement, le thème
  // enregistré doit s'afficher d'emblée, sans passage visible par le thème clair.
  const racine = document.documentElement;
  racine.classList.add('changement-theme');
  appliquerTheme(theme);
  window.setTimeout(() => racine.classList.remove('changement-theme'), 250);
  for (const prevenir of abonnes) prevenir();
}

/** Thème affiché, tenu à jour quand il change. */
export function useTheme(): Theme {
  return useSyncExternalStore(abonner, themeAffiche);
}
