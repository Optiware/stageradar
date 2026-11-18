import { describe, expect, it } from 'vitest';
import { genererCv, PROFIL_CV_VIDE } from './cv';
import { docxCv, zip } from './docx';

/** Sommes CRC-32 de référence, calculées avec zlib.crc32 de Node. */
const CRC_ATTENDUS: Record<string, number> = { bonjour: 2780229832, '<x/>': 304514091 };

/** Lit une archive ZIP non compressée : nom et contenu de chaque fichier. */
function lire(archive: Uint8Array): Map<string, string> {
  const vue = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
  const fichiers = new Map<string, string>();
  let position = 0;
  while (vue.getUint32(position, true) === 0x04034b50) {
    const taille = vue.getUint32(position + 18, true);
    const longueurNom = vue.getUint16(position + 26, true);
    const nom = new TextDecoder().decode(
      archive.subarray(position + 30, position + 30 + longueurNom),
    );
    const debut = position + 30 + longueurNom;
    const contenu = archive.subarray(debut, debut + taille);
    const texte = new TextDecoder().decode(contenu);
    if (CRC_ATTENDUS[texte] !== undefined) {
      expect(vue.getUint32(position + 14, true)).toBe(CRC_ATTENDUS[texte]);
    }
    fichiers.set(nom, texte);
    position = debut + taille;
  }
  return fichiers;
}

describe('zip', () => {
  it('écrit une archive lisible avec des sommes de contrôle justes', () => {
    const archive = zip([
      { nom: 'a.txt', contenu: 'bonjour' },
      { nom: 'dossier/é.xml', contenu: '<x/>' },
    ]);
    expect([...lire(archive)]).toEqual([
      ['a.txt', 'bonjour'],
      ['dossier/é.xml', '<x/>'],
    ]);
  });
});

describe('docxCv', () => {
  it('produit un document Word d’une colonne avec le texte du CV, échappé', () => {
    const cv = genererCv(
      { ...PROFIL_CV_VIDE, prenom: 'Camille', nom: 'Martin', competences: ['C++ & Rust'] },
      'GB',
      { langue: 'en' },
    );
    const fichiers = lire(docxCv(cv, cv.sections));
    expect([...fichiers.keys()]).toEqual([
      '[Content_Types].xml',
      '_rels/.rels',
      'word/document.xml',
    ]);
    const document = fichiers.get('word/document.xml')!;
    expect(document).toContain('Camille MARTIN');
    expect(document).toContain('C++ &amp; Rust');
    expect(document).not.toContain('<w:tbl>');
  });
});
