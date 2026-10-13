import { describe, expect, it } from 'vitest';
import { findLieux } from './geo';

describe('findLieux', () => {
  it('reconnaît Londres comme destination de stage', () => {
    expect(findLieux('London, England, United Kingdom')).toEqual([
      { pays: 'GB', ville: 'Londres' },
    ]);
    expect(findLieux('Londres')).toEqual([{ pays: 'GB', ville: 'Londres' }]);
  });

  it('laisse hors zone le reste du Royaume-Uni', () => {
    expect(findLieux('Manchester, United Kingdom')).toEqual([]);
    expect(findLieux('Remote - UK')).toEqual([]);
  });

  it('cite plusieurs pays dans l’ordre du texte', () => {
    expect(findLieux('Tokyo, Japan; London, UK')).toEqual([
      { pays: 'JP', ville: 'Tokyo' },
      { pays: 'GB', ville: 'Londres' },
    ]);
  });
});
