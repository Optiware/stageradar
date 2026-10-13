import { describe, expect, it } from 'vitest';
import { adresseDans, extraireOffre, lectureInterdite, offreDepuisPartage } from './jobposting';

// Pages fabriquées pour le test, à la forme décrite par https://schema.org/JobPosting.
const URL_OFFRE = 'https://carrieres.exemple.test/postes/42?utm_source=partage';

function page(jsonLd: unknown): string {
  return `<!doctype html><html><head><title>Poste | Exemple</title>
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script></head><body></body></html>`;
}

const POSTE = {
  '@context': 'https://schema.org',
  '@type': 'JobPosting',
  title: 'Software Engineer Intern &amp; Researcher',
  description: '<p>Join the platform team.</p><ul><li>Build APIs</li><li>Write tests</li></ul>',
  datePosted: '2026-10-01',
  validThrough: '2026-12-31T23:59:00+09:00',
  employmentType: 'INTERN',
  hiringOrganization: { '@type': 'Organization', name: 'Exemple KK' },
  jobLocation: {
    '@type': 'Place',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Tokyo',
      addressCountry: { '@type': 'Country', name: 'Japan' },
    },
  },
  baseSalary: {
    '@type': 'MonetaryAmount',
    currency: 'JPY',
    value: { '@type': 'QuantitativeValue', minValue: 200000, maxValue: 250000, unitText: 'MONTH' },
  },
};

describe('extraireOffre', () => {
  it('remplit l’offre à partir du JobPosting de la page', () => {
    expect(extraireOffre(page(POSTE), URL_OFFRE)).toMatchObject({
      source: 'manuel',
      source_id: 'https://carrieres.exemple.test/postes/42',
      url: URL_OFFRE,
      titre: 'Software Engineer Intern & Researcher',
      entreprise: 'Exemple KK',
      pays: 'JP',
      ville: 'Tokyo',
      type: 'stage',
      contrat: 'intern',
      description: 'Join the platform team.\n\n• Build APIs\n• Write tests',
      date_publication: '2026-10-01T00:00:00.000Z',
      date_expiration: '2026-12-31T14:59:00.000Z',
      remuneration_texte: '200000 à 250000 JPY par month',
      remuneration_montant: 200000,
      remuneration_devise: 'JPY',
    });
  });

  it('trouve le JobPosting dans un @graph et reconnaît le télétravail', () => {
    const offre = extraireOffre(
      page({
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'WebSite', name: 'Exemple' },
          { ...POSTE, employmentType: ['FULL_TIME'], jobLocationType: 'TELECOMMUTE' },
        ],
      }),
      URL_OFFRE,
    );
    expect(offre).toMatchObject({ type: 'autre', contrat: 'full_time', teletravail: 'remote' });
  });

  it('garde le code d’un pays hors de la liste suivie', () => {
    const offre = extraireOffre(
      page({
        ...POSTE,
        jobLocation: { address: { addressLocality: 'Berlin', addressCountry: 'de' } },
      }),
      URL_OFFRE,
    );
    expect(offre).toMatchObject({ pays: 'DE', ville: 'Berlin' });
  });

  it('se rabat sur le titre et la description de la page sans JobPosting', () => {
    const html = `<html><head><title>Ignoré</title>
      <meta property="og:title" content="Stage d&#39;été — Exemple">
      <meta content="Exemple" property="og:site_name">
      <meta name="description" content="Une équipe de trois personnes."></head></html>`;
    expect(extraireOffre(html, URL_OFFRE)).toMatchObject({
      titre: "Stage d'été — Exemple",
      entreprise: 'Exemple',
      description: 'Une équipe de trois personnes.',
      type: 'autre',
    });
  });

  it('ignore un JSON-LD mal formé et rend null pour une page sans titre', () => {
    const html = '<script type="application/ld+json">{ pas du json</script>';
    expect(extraireOffre(html, URL_OFFRE)).toBeNull();
  });
});

describe('sites sans lecture automatique', () => {
  it('reconnaît les domaines interdits et leurs sous-domaines', () => {
    for (const url of [
      'https://www.linkedin.com/jobs/view/123',
      'https://jp.indeed.com/viewjob?jk=abc',
      'https://fr.indeed.com/voir-emploi?jk=abc',
      'https://www.welcometothejungle.com/fr/companies/x/jobs/y',
      'pas une adresse',
    ]) {
      expect(lectureInterdite(url), url).toBe(true);
    }
    expect(lectureInterdite('https://jobs.lever.co/exemple/123')).toBe(false);
    expect(lectureInterdite('https://notlinkedin.com/jobs')).toBe(false);
  });

  it('crée l’offre avec ce qui a été partagé', () => {
    expect(
      offreDepuisPartage({
        url: 'https://www.linkedin.com/jobs/view/123',
        titre: '  Backend Intern chez Exemple ',
        texte: 'Vu sur LinkedIn',
      }),
    ).toMatchObject({
      titre: 'Backend Intern chez Exemple',
      description: 'Vu sur LinkedIn',
      source: 'manuel',
      type: 'autre',
    });
    expect(offreDepuisPartage({ url: 'https://exemple.test/a' }).titre).toBe(
      'https://exemple.test/a',
    );
  });

  it('retrouve l’adresse dans un texte partagé', () => {
    expect(adresseDans('Regarde ce poste https://exemple.test/a?b=1 !')).toBe(
      'https://exemple.test/a?b=1',
    );
    expect(adresseDans('rien ici')).toBeNull();
  });
});
