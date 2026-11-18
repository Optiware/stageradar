import { expect, OWNER_EMAIL, test } from './fixtures';

function candidature(id: string, statut: string, cv: string | null) {
  return {
    id,
    offer_id: null,
    company_id: null,
    statut,
    position: 1,
    date_candidature: '2026-11-02',
    prochaine_relance: null,
    notes: null,
    cv_document_id: cv,
    lettre_document_id: null,
    contact_nom: null,
    contact_email: null,
    notes_entretien: null,
    created_at: '2026-11-02T09:00:00Z',
  };
}

test('compte envois, réponses et entretiens par version de CV', async ({ page, backend }) => {
  backend.documents = [
    {
      id: 'cv-1',
      type: 'cv',
      langue: 'en',
      titre: 'Japon Robot',
      version: 3,
      chemin_stockage: null,
      notes: null,
    },
  ];
  backend.applications = [
    candidature('a', 'postule', 'cv-1'),
    candidature('b', 'entretien', 'cv-1'),
    candidature('c', 'refus', 'cv-1'),
    candidature('d', 'postule', null),
  ];
  await backend.signInAs(OWNER_EMAIL);
  await page.goto('/statistiques');
  const section = page.getByRole('region', { name: 'Par version de CV' });
  const ligne = section.getByRole('row', { name: /CV anglais v3 : Japon Robot/ });
  await expect(ligne.getByRole('cell')).toContainText(['3', '2', '1', 'Moins de 5 envois']);
});
