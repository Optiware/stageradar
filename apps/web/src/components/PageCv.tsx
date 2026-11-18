import {
  ACCENTS,
  BLOCS_COLONNE,
  POLICES,
  type BlocCv,
  type CvGenere,
  type ElementCv,
  type MiseEnPageCv,
  type SectionCv,
} from '@stageradar/shared';
import type { DragEvent, ReactNode } from 'react';

export type ModeCv = 'design' | 'robot';

/** Glisser-déposer des blocs sur la page (mode Design, à l'écran seulement). */
export interface Glisser {
  depart: (id: SectionCv) => void;
  depot: (id: SectionCv) => void;
}

function Element({ element, compact }: { element: ElementCv; compact: boolean }) {
  return (
    <div className={`${compact ? 'mt-1' : 'mt-2'} break-inside-avoid`}>
      {(element.titre || element.dates) && (
        <div className="flex items-baseline justify-between gap-4">
          <p className="font-bold">{element.titre}</p>
          {element.dates && <p className="shrink-0 text-[0.9em] opacity-75">{element.dates}</p>}
        </div>
      )}
      {element.sousTitre && <p className="text-[0.9em] opacity-75">{element.sousTitre}</p>}
      {element.texte && (
        <p className="mt-0.5 whitespace-pre-line">
          {element.enAvant && element.enAvant.length > 0
            ? element.texte.split(' · ').map((competence, position) => (
                <span key={competence}>
                  {position > 0 && ' · '}
                  {element.enAvant?.includes(competence) ? (
                    <strong>{competence}</strong>
                  ) : (
                    competence
                  )}
                </span>
              ))
            : element.texte}
        </p>
      )}
      {element.points && element.points.length > 0 && (
        <ul className="mt-0.5 list-disc pl-4">
          {element.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Section({
  section,
  couleur,
  compact,
  robot,
  glisser,
}: {
  section: BlocCv;
  couleur: string;
  compact: boolean;
  robot: boolean;
  glisser?: Glisser;
}) {
  const proprietes = glisser
    ? {
        draggable: true,
        onDragStart: (evenement: DragEvent) => {
          evenement.dataTransfer.effectAllowed = 'move';
          glisser.depart(section.id);
        },
        onDragOver: (evenement: DragEvent) => evenement.preventDefault(),
        onDrop: (evenement: DragEvent) => {
          evenement.preventDefault();
          glisser.depot(section.id);
        },
        title: 'Glisse ce bloc pour le déplacer',
      }
    : {};
  return (
    <section
      {...proprietes}
      data-bloc={section.id}
      className={`${compact ? 'mt-2.5' : 'mt-4'} ${glisser ? 'cursor-grab rounded outline-dashed outline-1 outline-transparent hover:outline-gray-300' : ''}`}
    >
      <h3
        className="break-after-avoid border-b pb-0.5 text-[1.05em] font-extrabold tracking-wide uppercase"
        style={{ color: robot ? '#000' : couleur, borderColor: robot ? '#000' : '#d1d5db' }}
      >
        {section.titre}
      </h3>
      {section.elements.map((element, rang) => (
        <Element key={rang} element={element} compact={compact} />
      ))}
    </section>
  );
}

/**
 * Le CV mis en page : toujours noir sur blanc, à la largeur d'une feuille A4 sans ses marges.
 * Le mode Robot impose une colonne, Arial et des titres noirs, quel que soit le modèle.
 */
export function PageCv({
  cv,
  sections,
  miseEnPage,
  mode,
  glisser,
  marges,
}: {
  cv: CvGenere;
  sections: BlocCv[];
  miseEnPage: MiseEnPageCv;
  mode: ModeCv;
  glisser?: Glisser;
  marges: number;
}) {
  const robot = mode === 'robot';
  const couleur = ACCENTS[miseEnPage.accent].couleur;
  const compact = !robot && miseEnPage.modele === 'compact';
  const moderne = !robot && miseEnPage.modele === 'moderne';
  const style = {
    width: `${210 - 2 * marges}mm`,
    fontSize: `${miseEnPage.taille}pt`,
    lineHeight: miseEnPage.interligne,
    fontFamily: robot ? POLICES.arial.css : POLICES[miseEnPage.police].css,
  };
  const coordonnees = [
    ...cv.coordonnees,
    ...cv.liens.map((lien) => lien.url.replace(/^https?:\/\//, '')),
  ];
  const rendre = (liste: BlocCv[]): ReactNode =>
    liste.map((section) => (
      <Section
        key={section.id}
        section={section}
        couleur={couleur}
        compact={compact}
        robot={robot}
        glisser={glisser}
      />
    ));

  const entete = (
    <header className={robot ? 'pb-2' : 'border-b-2 pb-3'} style={{ borderColor: couleur }}>
      <h2 className="text-[2em] leading-tight font-extrabold tracking-tight">
        {cv.nom || 'Prénom NOM'}
      </h2>
      {cv.titre && (
        <p className="mt-0.5 text-[1.2em] font-bold" style={{ color: robot ? '#000' : couleur }}>
          {cv.titre}
        </p>
      )}
      {!moderne && (
        <p className="mt-1.5 text-[0.9em] opacity-80">
          {coordonnees.join(robot ? ' | ' : '  ·  ')}
        </p>
      )}
    </header>
  );

  if (moderne) {
    const gauche = sections.filter((section) => BLOCS_COLONNE.includes(section.id));
    const droite = sections.filter((section) => !BLOCS_COLONNE.includes(section.id));
    return (
      <div lang={cv.langue} style={style} className="grid grid-cols-[32%_1fr] gap-5 text-gray-950">
        <aside className="rounded-md p-3" style={{ backgroundColor: `${couleur}12` }}>
          <h3
            className="text-[1.05em] font-extrabold tracking-wide uppercase"
            style={{ color: couleur }}
          >
            {cv.langue === 'fr' ? 'Contact' : cv.langue === 'es' ? 'Contacto' : 'Contact'}
          </h3>
          <ul className="mt-1.5 flex flex-col gap-0.5 text-[0.9em] break-words">
            {coordonnees.map((ligne) => (
              <li key={ligne}>{ligne}</li>
            ))}
          </ul>
          {rendre(gauche)}
        </aside>
        <div>
          {entete}
          {rendre(droite)}
        </div>
      </div>
    );
  }
  return (
    <div lang={cv.langue} style={style} className="text-gray-950">
      {entete}
      {rendre(sections)}
    </div>
  );
}
