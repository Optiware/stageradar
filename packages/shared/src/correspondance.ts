// Correspondance entre le profil du CV et une offre : les technologies que l'offre cite, celles que
// le profil mentionne déjà, et celles qu'il ne mentionne pas. Rien n'est ajouté au profil.
import { technologiesCitees, texteProfil, type OffreCiblee, type ProfilCv } from './cv';
import { formePrincipale, formesTechnologie, nomTechnologie } from './portfolio';
import { containsWord } from './text';

/** En dessous, la comparaison porterait sur trop peu de mots pour dire quelque chose. */
export const MOTS_CLES_MINIMUM = 3;

export type Correspondance =
  | { etat: 'profil_vide' }
  | { etat: 'trop_peu'; nombre: number }
  | { etat: 'ok'; pourcent: number; presentes: string[]; absentes: string[] };

/** Le profil a-t-il de quoi être comparé : des compétences ou au moins une formation ? */
export function profilComparable(profil: ProfilCv): boolean {
  return profil.competences.length > 0 || profil.formations.length > 0;
}

export function correspondance(profil: ProfilCv, offre: OffreCiblee): Correspondance {
  if (!profilComparable(profil)) return { etat: 'profil_vide' };
  const termes = [...new Set(technologiesCitees(offre).map(formePrincipale))];
  if (termes.length < MOTS_CLES_MINIMUM) return { etat: 'trop_peu', nombre: termes.length };
  const texte = texteProfil(profil);
  const present = (terme: string) =>
    formesTechnologie(terme).some(
      (forme) => containsWord(texte, forme) || containsWord(texte, forme.replace(/ /g, '')),
    );
  const presentes = termes.filter(present);
  const absentes = termes.filter((terme) => !present(terme));
  return {
    etat: 'ok',
    pourcent: Math.round((presentes.length / termes.length) * 100),
    presentes: presentes.map(nomTechnologie),
    absentes: absentes.map(nomTechnologie),
  };
}
