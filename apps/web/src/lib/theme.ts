export type Theme = 'clair' | 'sombre';

const CLE = 'stageradar-theme';
// Couleur de la barre du système (Android) et de la barre de titre (Windows).
const COULEUR_BARRE: Record<Theme, string> = { clair: '#ffffff', sombre: '#030712' };

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

export function choisirTheme(theme: Theme): void {
  try {
    localStorage.setItem(CLE, theme);
  } catch {
    // Stockage indisponible (navigation privée) : le choix vaut pour cette visite.
  }
  appliquerTheme(theme);
}
