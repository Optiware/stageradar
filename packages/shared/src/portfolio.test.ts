import { describe, expect, it } from 'vitest';
import {
  completude,
  ideeProjet,
  nomTechnologie,
  projetsAFaire,
  projetsPourOffre,
  type ProjetPortfolio,
} from './portfolio';

function projet(champs: Partial<ProjetPortfolio>): ProjetPortfolio {
  return {
    titre: 'Projet',
    description: '',
    technologies: [],
    url_demo: null,
    image: null,
    a_readme: false,
    a_captures: false,
    a_tests: false,
    ...champs,
  };
}

describe('completude', () => {
  it('compte README, captures, démo et tests', () => {
    const resultat = completude(
      projet({ a_readme: true, url_demo: 'https://demo.test', a_tests: true }),
    );
    expect(resultat.pourcent).toBe(75);
    expect(resultat.points.find((point) => point.libelle === 'Captures')?.fait).toBe(false);
  });

  it('considère une image enregistrée comme une capture', () => {
    expect(completude(projet({ image: 'data:image/jpeg;base64,AA' })).pourcent).toBe(25);
  });
});

describe('projetsAFaire', () => {
  const demandes = [
    { terme: 'docker', nombre: 9 },
    { terme: 'go', nombre: 7 },
    { terme: 'golang', nombre: 12 },
    { terme: 'react', nombre: 5 },
    { terme: 'node js', nombre: 3 },
  ];

  it('retire ce que le portfolio montre et regroupe les alias', () => {
    const resultat = projetsAFaire(demandes, [
      projet({ technologies: ['React', 'Node.js'], description: 'Déployé avec Docker.' }),
    ]);
    expect(resultat).toEqual([{ terme: 'go', nom: 'Go', nombre: 12, idee: ideeProjet('go') }]);
  });

  it('reconnaît une forme collée (« NodeJS ») ou un alias (« Golang »)', () => {
    const resultat = projetsAFaire(demandes, [projet({ technologies: ['NodeJS', 'Golang'] })]);
    expect(resultat.map((item) => item.terme)).toEqual(['docker', 'react']);
  });
});

describe('projetsPourOffre', () => {
  it('classe les projets par technologies en commun', () => {
    const a = projet({ titre: 'A', technologies: ['React'] });
    const b = projet({ titre: 'B', technologies: ['Go', 'PostgreSQL', 'Docker'] });
    const resultat = projetsPourOffre([a, b], 'Backend en Go avec PostgreSQL.');
    expect(resultat.map((item) => [item.projet.titre, item.communes])).toEqual([
      ['B', ['Go', 'PostgreSQL']],
      ['A', []],
    ]);
  });
});

describe('noms', () => {
  it('affiche les technologies avec leur casse habituelle', () => {
    expect(nomTechnologie('node js')).toBe('Node.js');
    expect(nomTechnologie('kubernetes')).toBe('Kubernetes');
  });
});
