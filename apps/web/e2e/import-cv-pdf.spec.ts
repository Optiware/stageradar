import { expect, OWNER_EMAIL, test } from './fixtures';

/**
 * Petit PDF écrit à la main (Helvetica, texte ASCII) : chaque ligne est posée à sa position,
 * comme dans un CV en deux colonnes. Les données sont inventées.
 */
function pdfDeTest(lignes: [string, number, number, number][]): Buffer {
  const texte = lignes
    .map(
      ([contenu, x, y, taille]) =>
        `BT /F1 ${taille} Tf ${x} ${y} Td (${contenu.replace(/[()\\]/g, '\\$&')}) Tj ET`,
    )
    .join('\n');
  const objets = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 596 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(texte)} >>\nstream\n${texte}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ];
  let pdf = '%PDF-1.4\n';
  const positions: number[] = [];
  objets.forEach((objet, rang) => {
    positions.push(Buffer.byteLength(pdf));
    pdf += `${rang + 1} 0 obj\n${objet}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objets.length + 1}\n0000000000 65535 f \n`;
  pdf += positions.map((position) => `${String(position).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objets.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

const CV = pdfDeTest([
  ['CAMILLE MARTIN', 32, 780, 30],
  ['DEVELOPPEUSE WEB', 32, 745, 14],
  ['CONTACT', 32, 650, 14],
  ['06 12 34 56 78', 32, 625, 10],
  ['camille@example.test', 32, 610, 10],
  ['COMPETENCES', 32, 560, 14],
  ['React, TypeScript, PostgreSQL', 32, 540, 10],
  ['LANGUES', 32, 500, 14],
  ['Anglais (B2)', 32, 480, 10],
  ['EXPERIENCE', 300, 650, 14],
  ['Stage developpeuse', 300, 625, 11],
  ['2025', 520, 625, 10],
  ['Orbitane, Lyon', 300, 610, 10],
  ['- Developpement d une API', 300, 595, 10],
  ['FORMATION', 300, 560, 14],
  ['BTS SIO - Les Chartreux', 300, 540, 11],
  ['2024 - 2026', 500, 540, 10],
]);

test('glisse un CV en PDF, vérifie ce qui a été trouvé et l’enregistre dans le profil', async ({
  page,
  backend,
}) => {
  await backend.signInAs(OWNER_EMAIL);
  await page.goto('/cv?onglet=profil');
  const section = page.getByRole('region', { name: 'Remplir mon profil depuis mon CV (PDF)' });
  await section
    .getByLabel('CV en PDF')
    .setInputFiles({ name: 'cv.pdf', mimeType: 'application/pdf', buffer: CV });

  const trouve = section.getByRole('definition');
  await expect(section.getByText('cv.pdf')).toBeVisible({ timeout: 15000 });
  await expect(section).toContainText('Camille Martin');
  await expect(section).toContainText('Stage developpeuse, Orbitane, 2025–2025');
  await expect(section).toContainText('BTS SIO, Les Chartreux, 2024–2026');
  await expect(trouve.filter({ hasText: 'React · TypeScript · PostgreSQL' })).toBeVisible();

  await section.getByRole('button', { name: 'Appliquer à mon profil' }).click();
  await expect(section.getByRole('status')).toContainText('Profil rempli depuis ton CV');
  const profil = backend.settings.cv as Record<string, unknown>;
  expect(profil).toMatchObject({
    prenom: 'Camille',
    nom: 'Martin',
    email: 'camille@example.test',
    competences: ['React', 'TypeScript', 'PostgreSQL'],
  });
  expect((profil.experiences as unknown[]).length).toBe(1);

  // Le CV mis en page part aussitôt de ce profil.
  await page.getByRole('tab', { name: 'Mise en page' }).click();
  await expect(page.getByTestId('cv-feuille')).toContainText('Camille MARTIN');
});

test('explique qu’un PDF sans texte (scan) ne peut pas être lu', async ({ page, backend }) => {
  await backend.signInAs(OWNER_EMAIL);
  await page.goto('/cv?onglet=profil');
  await page
    .getByLabel('CV en PDF')
    .setInputFiles({ name: 'scan.pdf', mimeType: 'application/pdf', buffer: pdfDeTest([]) });
  await expect(page.getByRole('alert')).toContainText('Ce PDF ne contient pas de texte', {
    timeout: 15000,
  });
});
