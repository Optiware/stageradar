// Les e-mails ci-dessous sont des exemples écrits pour les tests, pas de vraies alertes.
import { describe, expect, it } from 'vitest';
import {
  decoderQuotedPrintable,
  lireAlerte,
  rechercheIndeed,
  rechercheLinkedin,
  urlOffreAlerte,
} from './alertes';

describe('urlOffreAlerte', () => {
  it('ramène les liens LinkedIn et Indeed à une adresse canonique', () => {
    expect(
      urlOffreAlerte('https://www.linkedin.com/comm/jobs/view/4012345678/?trackingId=abc&refId=x'),
    ).toEqual({ source: 'linkedin', url: 'https://www.linkedin.com/jobs/view/4012345678/' });
    expect(urlOffreAlerte('https://fr.indeed.com/rc/clk?jk=0a1b2c3d4e5f6a7b&from=ja')).toEqual({
      source: 'indeed',
      url: 'https://fr.indeed.com/viewjob?jk=0a1b2c3d4e5f6a7b',
    });
    expect(urlOffreAlerte('https://www.linkedin.com/feed/')).toBeNull();
    expect(urlOffreAlerte('https://exemple.test/jobs/view/4012345678')).toBeNull();
  });
});

describe('lireAlerte', () => {
  it('prend le texte du lien comme titre dans un e-mail HTML', () => {
    const html = `<html><body>
      <a href="https://www.linkedin.com/comm/jobs/view/4012345678/?refId=1">Backend Intern</a>
      <p>Hoshi Labs · Tokyo</p>
      <a href="https://www.linkedin.com/comm/jobs/view/4012345678/?refId=2">View job</a>
      <a href="https://www.linkedin.com/comm/jobs/view/4099999999/">DevOps Intern &amp; SRE</a>
    </body></html>`;
    expect(lireAlerte(html).map((offre) => [offre.url, offre.titre])).toEqual([
      ['https://www.linkedin.com/jobs/view/4012345678/', 'Backend Intern'],
      ['https://www.linkedin.com/jobs/view/4099999999/', 'DevOps Intern & SRE'],
    ]);
  });

  it('prend les lignes au-dessus de l’adresse dans un e-mail texte', () => {
    const texte = [
      'Your job alert for software engineer intern',
      '',
      'Stage développeur backend',
      'Orbitane',
      'Lyon',
      'Voir l’offre : https://fr.indeed.com/rc/clk?jk=0a1b2c3d4e5f6a7b',
      '',
      'Alternance DevOps',
      'Nuage SAS',
      'https://fr.indeed.com/viewjob?jk=1122334455667788',
    ].join('\n');
    expect(lireAlerte(texte)).toEqual([
      {
        source: 'indeed',
        url: 'https://fr.indeed.com/viewjob?jk=0a1b2c3d4e5f6a7b',
        titre: 'Stage développeur backend',
        contexte: ['Orbitane', 'Lyon'],
      },
      {
        source: 'indeed',
        url: 'https://fr.indeed.com/viewjob?jk=1122334455667788',
        titre: 'Alternance DevOps',
        contexte: ['Nuage SAS'],
      },
    ]);
  });

  it('décode le « message d’origine » quoted-printable de Gmail', () => {
    const brut =
      '<a href=3D"https://www.linkedin.com/comm/jobs/view/40123=\n45678/">D=C3=A9veloppeur stagiaire</a>';
    expect(decoderQuotedPrintable(brut)).toBe(
      '<a href="https://www.linkedin.com/comm/jobs/view/4012345678/">Développeur stagiaire</a>',
    );
    expect(lireAlerte(brut)[0]?.titre).toBe('Développeur stagiaire');
  });
});

describe('recherches prêtes', () => {
  it('construit les adresses de recherche', () => {
    expect(rechercheLinkedin('stage cybersécurité', 'Tokyo')).toBe(
      'https://www.linkedin.com/jobs/search/?keywords=stage+cybers%C3%A9curit%C3%A9&location=Tokyo',
    );
    expect(rechercheIndeed('JP', 'intern', 'Tokyo')).toBe(
      'https://jp.indeed.com/jobs?q=intern&l=Tokyo',
    );
  });
});
