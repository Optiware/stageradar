import type { PagePdf } from '@stageradar/shared';
import urlTravailleur from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

/** Le PDF ne contient pas de texte lisible : c'est sans doute une image (scan, export en image). */
export class PdfSansTexte extends Error {}

/**
 * Lit le texte d'un PDF sur l'appareil, avec la position de chaque morceau. pdf.js n'est chargé
 * qu'à ce moment-là ; le fichier ne quitte pas l'appareil.
 */
export async function lirePdf(fichier: File): Promise<PagePdf[]> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = urlTravailleur;
  const tache = pdfjs.getDocument({ data: new Uint8Array(await fichier.arrayBuffer()) });
  const document = await tache.promise;
  const pages: PagePdf[] = [];
  for (let numero = 1; numero <= Math.min(document.numPages, 6); numero++) {
    const page = await document.getPage(numero);
    const contenu = await page.getTextContent();
    pages.push({
      largeur: page.getViewport({ scale: 1 }).width,
      morceaux: contenu.items.flatMap((item) =>
        'str' in item && item.str.trim()
          ? [
              {
                texte: item.str,
                x: item.transform[4] as number,
                y: item.transform[5] as number,
                largeur: item.width,
                hauteur: item.height,
              },
            ]
          : [],
      ),
    });
  }
  await tache.destroy();
  if (pages.every((page) => page.morceaux.length === 0)) throw new PdfSansTexte();
  return pages;
}
