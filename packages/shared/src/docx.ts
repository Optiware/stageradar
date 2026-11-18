// Export .docx du CV en mode Robot, sans bibliothèque : un document Word est une archive ZIP de
// quelques fichiers XML. Ici, l'archive est écrite sans compression (méthode « stored »).
import type { BlocCv, CvGenere } from './cv';

const TABLE_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(octets: Uint8Array): number {
  let crc = 0xffffffff;
  for (const octet of octets) crc = TABLE_CRC[(crc ^ octet) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** Archive ZIP non compressée. */
export function zip(fichiers: { nom: string; contenu: string }[]): Uint8Array<ArrayBuffer> {
  const encodeur = new TextEncoder();
  const morceaux: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let position = 0;
  for (const fichier of fichiers) {
    const nom = encodeur.encode(fichier.nom);
    const donnees = encodeur.encode(fichier.contenu);
    const crc = crc32(donnees);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // noms en UTF-8
    local.setUint32(14, crc, true);
    local.setUint32(18, donnees.length, true);
    local.setUint32(22, donnees.length, true);
    local.setUint16(26, nom.length, true);
    morceaux.push(new Uint8Array(local.buffer), nom, donnees);

    const entree = new DataView(new ArrayBuffer(46));
    entree.setUint32(0, 0x02014b50, true);
    entree.setUint16(4, 20, true);
    entree.setUint16(6, 20, true);
    entree.setUint16(8, 0x0800, true);
    entree.setUint32(16, crc, true);
    entree.setUint32(20, donnees.length, true);
    entree.setUint32(24, donnees.length, true);
    entree.setUint16(28, nom.length, true);
    entree.setUint32(42, position, true);
    central.push(new Uint8Array(entree.buffer), nom);
    position += 30 + nom.length + donnees.length;
  }
  const tailleCentral = central.reduce((total, morceau) => total + morceau.length, 0);
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true);
  fin.setUint16(8, fichiers.length, true);
  fin.setUint16(10, fichiers.length, true);
  fin.setUint32(12, tailleCentral, true);
  fin.setUint32(16, position, true);
  const tout = [...morceaux, ...central, new Uint8Array(fin.buffer)];
  const resultat = new Uint8Array(tout.reduce((total, morceau) => total + morceau.length, 0));
  let decalage = 0;
  for (const morceau of tout) {
    resultat.set(morceau, decalage);
    decalage += morceau.length;
  }
  return resultat;
}

function echapper(texte: string): string {
  return texte.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Paragraphe Word : Arial, taille en demi-points. */
function paragraphe(
  texte: string,
  options: { gras?: boolean; taille?: number; espaceAvant?: number } = {},
) {
  const proprietes = [
    '<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>',
    options.gras ? '<w:b/>' : '',
    `<w:sz w:val="${options.taille ?? 20}"/>`,
  ].join('');
  const espace = options.espaceAvant
    ? `<w:pPr><w:spacing w:before="${options.espaceAvant}"/></w:pPr>`
    : '';
  return `<w:p>${espace}<w:r><w:rPr>${proprietes}</w:rPr><w:t xml:space="preserve">${echapper(texte)}</w:t></w:r></w:p>`;
}

/** Document Word d'une seule colonne, titres standard, sans tableau ni image. */
export function docxCv(cv: CvGenere, sections: BlocCv[]): Uint8Array<ArrayBuffer> {
  const corps: string[] = [];
  if (cv.nom) corps.push(paragraphe(cv.nom, { gras: true, taille: 32 }));
  if (cv.titre) corps.push(paragraphe(cv.titre, { taille: 22 }));
  const coordonnees = [
    ...cv.coordonnees,
    ...cv.liens.map((lien) => lien.url.replace(/^https?:\/\//, '')),
  ].join(' | ');
  if (coordonnees) corps.push(paragraphe(coordonnees));
  for (const section of sections) {
    corps.push(
      paragraphe(section.titre.toUpperCase(), { gras: true, taille: 22, espaceAvant: 240 }),
    );
    for (const element of section.elements) {
      const entete = [element.titre, element.dates].filter(Boolean).join(' · ');
      if (entete) corps.push(paragraphe(entete, { gras: true, espaceAvant: 80 }));
      if (element.sousTitre) corps.push(paragraphe(element.sousTitre));
      if (element.texte) corps.push(paragraphe(element.texte));
      for (const point of element.points ?? []) corps.push(paragraphe(`- ${point}`));
    }
  }
  const document =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' +
    corps.join('') +
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>' +
    '<w:pgMar w:top="907" w:right="907" w:bottom="907" w:left="907" w:header="0" w:footer="0" w:gutter="0"/>' +
    '</w:sectPr></w:body></w:document>';
  return zip([
    {
      nom: '[Content_Types].xml',
      contenu:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
        '</Types>',
    },
    {
      nom: '_rels/.rels',
      contenu:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
        '</Relationships>',
    },
    { nom: 'word/document.xml', contenu: document },
  ]);
}
