import { describe, expect, it } from 'vitest';
import { classify, DEFAULT_PROFIL, detecterLangue } from './classify';
import { findLieux } from './geo';
import { decodeEntities, htmlToText } from './html';
import { DEFAULT_KEYWORDS } from './keywords';
import { DEFAULT_POIDS, scoreOffer } from './score';
import { canonicalUrl } from './url';

const classer = (titre: string, description: string | null = null) =>
  classify({ titre, description }, DEFAULT_KEYWORDS, DEFAULT_PROFIL);

describe('classify — type', () => {
  it.each([
    ['Software Engineer Intern (Summer 2027)', 'stage'],
    ['Stagiaire développeur web', 'stage'],
    ['Software Engineer, Backend (인턴)', 'stage'],
    ['バックエンドエンジニア インターン', 'stage'],
    ['Practicante de desarrollo de software', 'stage'],
    ['Developer Co-op, Winter 2027', 'stage'],
    ['Alternance - Développeur fullstack', 'alternance'],
    ['Apprenti ingénieur cybersécurité', 'alternance'],
    ['Senior Software Engineer', 'autre'],
    ['Late-Stage Growth Analyst', 'autre'],
    ['Early Stage Startups Engineer', 'autre'],
    ['Internal Tools Engineer', 'autre'],
  ])('%s → %s', (titre, type) => {
    expect(classer(titre).type).toBe(type);
  });

  it('ne lit pas « stage » dans une description en anglais comme un stage', () => {
    expect(classer('Backend Engineer', 'You will own every stage of the pipeline.').type).toBe(
      'autre',
    );
  });

  it('retient le type annoncé par la source quand le titre ne dit rien', () => {
    const resultat = classify(
      { titre: 'Gateway Program | Class of 2027', description: null, type_source: 'stage' },
      DEFAULT_KEYWORDS,
      DEFAULT_PROFIL,
    );
    expect(resultat.type).toBe('stage');
  });
});

describe('classify — domaines', () => {
  it.each([
    ['Software Engineer Intern', ['dev']],
    ['Security Engineer Intern', ['cyber']],
    ['Stagiaire analyste SOC', ['cyber']],
    ['SRE Intern', ['devops']],
    ['DevSecOps Intern', ['devops']],
    ['Cloud Engineering Intern', ['devops']],
    ['Stagiaire DevOps / développeur backend', ['dev', 'devops']],
  ])('%s → %j', (titre, domaines) => {
    expect(classer(titre).domaines).toEqual(domaines);
  });

  it('reconnaît un domaine dans la description quand le titre est vague', () => {
    const resultat = classer(
      'Summer Intern 2027',
      'You will build backend services in Python and TypeScript with our software engineering team, write code and ship an API.',
    );
    expect(resultat.domaines).toContain('dev');
    expect(resultat.exclue_raison).toBeNull();
  });

  it.each([
    'Marketing Intern',
    'Finance Intern - Corporate Accounting',
    'Sales Development Intern',
  ])('masque « %s » comme hors domaine, même dans une entreprise de logiciel', (titre) => {
    const resultat = classer(
      titre,
      'We build cloud software on Kubernetes and AWS. Our security and infrastructure teams love Python and Docker.',
    );
    expect(resultat.exclue_raison).toBe('Hors domaine');
    expect(resultat.domaines).toEqual([]);
  });
});

describe('classify — niveau, expérience, période', () => {
  it.each([
    ['PhD Software Engineer Intern', null],
    ['Stage de fin d’études - développeur backend', null],
    ['Software Engineer Intern', 'Must be pursuing a Master’s degree in Computer Science.'],
    ['Stagiaire développeur', 'Vous préparez un Bac+5 en informatique.'],
  ])('masque « %s » pour niveau trop élevé', (titre, description) => {
    const resultat = classer(titre, description);
    expect(resultat.niveau).toBe('trop_eleve');
    expect(resultat.exclue_raison).toMatch(/^Niveau trop élevé/);
  });

  it('reconnaît une ouverture explicite aux premières années', () => {
    const resultat = classer(
      'Software Engineer Intern',
      'Open to undergraduate students in any year. Graduate students may also apply.',
    );
    expect(resultat.niveau).toBe('accessible');
    expect(resultat.exclue_raison).toBeNull();
  });

  it('masque une offre qui demande plusieurs années d’expérience', () => {
    const resultat = classer(
      'Software Engineer Intern',
      'Requirements: 3+ years of professional experience with distributed systems.',
    );
    expect(resultat.exclue_raison).toBe('3 ans d’expérience exigés');
  });

  it.each([
    ['Software Engineer Intern (Summer 2027)', 'explicite', null],
    ['Software Engineering Intern (2027)', 'explicite', null],
    ['Software Engineer Intern', 'non_precisee', null],
    ['Software Engineer Intern (Winter 2027)', 'incompatible', 'Période incompatible'],
    ['Software Engineer Intern - Summer 2026', 'incompatible', 'Période incompatible'],
    ['2026 Software Engineer Intern', 'incompatible', 'Période incompatible'],
  ])('%s → période %s', (titre, periode, raison) => {
    const resultat = classer(titre);
    expect(resultat.periode).toBe(periode);
    expect(resultat.exclue_raison).toBe(raison);
  });

  it('fait primer l’été annoncé dans le titre sur une autre saison citée dans la description', () => {
    const resultat = classer(
      'Software Engineer Intern, Summer 2027',
      'We also hire for Fall 2026 and Winter 2027 terms.',
    );
    expect(resultat.periode).toBe('explicite');
  });
});

describe('classify — langues', () => {
  const anglais =
    'You will work with our engineering team and build the services that our customers use. We will support you with a mentor for the whole internship.';

  it('n’exige rien de plus pour une annonce en anglais', () => {
    expect(classer('Software Engineer Intern', anglais).langues_requises).toEqual([]);
  });

  it('exige le japonais quand un niveau est demandé', () => {
    const resultat = classer(
      'Software Engineer Intern',
      `${anglais} Business level Japanese (JLPT N2) is required.`,
    );
    expect(resultat.langues_requises).toEqual(['ja']);
  });

  it('n’exige pas le japonais quand l’annonce dit qu’il est facultatif', () => {
    const resultat = classer(
      'Software Engineer Intern',
      `${anglais} Japanese proficiency is a plus but not required.`,
    );
    expect(resultat.langues_requises).toEqual([]);
  });

  it('exige la langue d’une annonce rédigée en coréen ou en japonais', () => {
    const coreen =
      '당근 팀은 지역 생활 커뮤니티 서비스를 만들고 있어요. 백엔드 개발 인턴으로 함께 성장할 분을 찾고 있어요. 서비스 개발 경험이 있으신 분을 환영해요.';
    const japonais =
      '私たちのチームでは、決済サービスのバックエンド開発を担当するインターンを募集しています。エンジニアと一緒にサービスを開発します。';
    expect(classer('Software Engineer (인턴)', coreen).langues_requises).toEqual(['ko']);
    expect(classer('エンジニア インターン', japonais).langues_requises).toEqual(['ja']);
  });

  it('détecte la langue de rédaction', () => {
    expect(detecterLangue(anglais)).toBe('en');
    expect(
      detecterLangue(
        'Vous rejoindrez notre équipe pour développer les services que nous proposons à nos clients, avec une équipe qui vous accompagnera pour toute la durée du stage.',
      ),
    ).toBe('fr');
    expect(
      detecterLangue(
        'Buscamos una persona para nuestro equipo de desarrollo, con ganas de aprender y trabajar con los clientes de la empresa, para una práctica del semestre.',
      ),
    ).toBe('es');
    expect(detecterLangue('Trop court')).toBeNull();
  });
});

describe('scoreOffer', () => {
  const maintenant = new Date('2026-10-13T12:00:00Z');
  const noter = (titre: string, pays: string | null, description: string | null = null) => {
    const classe = classer(titre, description);
    return scoreOffer(
      { type: classe.type, pays, date_publication: '2026-10-13T08:00:00Z' },
      classe,
      DEFAULT_PROFIL,
      DEFAULT_POIDS,
      maintenant,
    );
  };

  it('donne le maximum à un stage d’été au Japon, ouvert aux premières années, publié aujourd’hui', () => {
    const { score, details } = noter(
      'Software Engineer Intern (Summer 2027)',
      'JP',
      'Open to undergraduate students in any year.',
    );
    expect(score).toBe(100);
    expect(details.map((detail) => detail.critere)).toEqual([
      'domaine',
      'periode',
      'pays',
      'niveau',
      'langue',
      'fraicheur',
    ]);
    expect(details.every((detail) => detail.points === detail.max)).toBe(true);
  });

  it('classe les pays dans l’ordre du profil', () => {
    const scores = ['JP', 'KR', 'CO', 'CA', 'US'].map(
      (pays) => noter('Software Engineer Intern', pays).score,
    );
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
    expect(new Set(scores).size).toBe(5);
  });

  it('retire des points quand le japonais est exigé, et l’explique', () => {
    const sans = noter('Software Engineer Intern', 'JP');
    const avec = noter('Software Engineer Intern', 'JP', 'Native level Japanese is required.');
    const langue = avec.details.find((detail) => detail.critere === 'langue');
    expect(langue).toMatchObject({ points: -10, libelle: 'japonais exigé' });
    expect(avec.score).toBe(sans.score - 20);
  });

  it('perd la fraîcheur avec le temps', () => {
    const classe = classer('Software Engineer Intern');
    const points = (date: string | null) =>
      scoreOffer(
        { type: 'stage', pays: 'CA', date_publication: date },
        classe,
        DEFAULT_PROFIL,
        DEFAULT_POIDS,
        maintenant,
      ).details.find((detail) => detail.critere === 'fraicheur')?.points;
    expect(points('2026-10-13T00:00:00Z')).toBe(10);
    expect(points('2026-09-20T12:00:00Z')).toBe(5);
    expect(points('2026-06-01T00:00:00Z')).toBe(0);
    expect(points(null)).toBe(5);
  });

  it('reste entre 0 et 100', () => {
    const { score } = noter('Finance Intern (Winter 2027)', 'US', 'PhD required. 한국어 필수.');
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe('findLieux', () => {
  it.each([
    ['Tokyo, Japan', [{ pays: 'JP', ville: 'Tokyo' }]],
    ['東京都渋谷区', [{ pays: 'JP', ville: 'Tokyo' }]],
    ['SEOUL', [{ pays: 'KR', ville: 'Séoul' }]],
    ['Seoul, South Korea', [{ pays: 'KR', ville: 'Séoul' }]],
    ['Bogotá, Colombia', [{ pays: 'CO', ville: 'Bogota' }]],
    ['Toronto, ON', [{ pays: 'CA', ville: 'Toronto' }]],
    ['Montréal, Québec', [{ pays: 'CA', ville: 'Montréal' }]],
    ['Remote - Canada', [{ pays: 'CA', ville: null }]],
    ['San Francisco, CA', []],
    ['Menlo Park, California, United States', []],
    ['', []],
  ])('%s', (libelle, attendu) => {
    expect(findLieux(libelle)).toEqual(attendu);
  });

  it('renvoie plusieurs pays dans l’ordre du texte', () => {
    expect(findLieux('Seoul, Korea; Tokyo, Japan').map((lieu) => lieu.pays)).toEqual(['KR', 'JP']);
  });
});

describe('htmlToText', () => {
  it('retire les balises et garde la structure', () => {
    expect(htmlToText('<p>Bonjour <b>à tous</b></p><ul><li>Un</li><li>Deux</li></ul>')).toBe(
      'Bonjour à tous\n\n• Un\n• Deux',
    );
  });

  it('ignore scripts et styles', () => {
    expect(htmlToText('<style>p{}</style><p>Texte</p><script>alert(1)</script>')).toBe('Texte');
  });

  it('décode les entités', () => {
    expect(decodeEntities('R&amp;D &#39;ici&#x27; &eacute;t&eacute; &inconnue;')).toBe(
      "R&D 'ici' été &inconnue;",
    );
  });

  it('lit le HTML encodé en entités de Greenhouse en deux passes', () => {
    expect(htmlToText(htmlToText('&lt;p&gt;About &amp;amp; more&lt;/p&gt;'))).toBe('About & more');
  });
});

describe('canonicalUrl', () => {
  it.each([
    [
      'https://www.Example.com/jobs/123/?utm_source=x&gh_src=abc#apply',
      'https://example.com/jobs/123',
    ],
    ['https://about.daangn.com?gh_jid=5458903003', 'https://about.daangn.com?gh_jid=5458903003'],
    ['http://example.com/a?b=2&a=1', 'https://example.com/a?a=1&b=2'],
    ['pas une adresse', null],
    ['javascript:alert(1)', null],
    [null, null],
  ])('%s → %s', (entree, attendu) => {
    expect(canonicalUrl(entree)).toBe(attendu);
  });
});
