/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { formatEntityTag, parseIfMatch } from './entity-tag';
import { PreconditionFailedException } from './precondition-failed-exception';

describe('formatEntityTag', () => {
  it('builds a strong tag of the version and a digest of the data', () => {
    expect(formatEntityTag(3, { id: 'a', name: 'Editor' })).toMatch(/^"3-[A-Za-z0-9_-]{16}"$/);
  });

  it('is stable for the same data and changes with the data at the same version', () => {
    const tag = formatEntityTag(3, { id: 'a', name: 'Editor' });

    expect(formatEntityTag(3, { id: 'a', name: 'Editor' })).toBe(tag);
    expect(formatEntityTag(3, { id: 'a', name: 'Editor', resources: [{ name: 'renamed' }] })).not.toBe(tag);
  });
});

describe('parseIfMatch', () => {
  it.each([
    ['an absent header', undefined],
    ['an empty header', '  '],
    ['the * wildcard', '*'],
  ])('reads no version from %s', (_case, header) => {
    expect(parseIfMatch(header)).toBeUndefined();
  });

  it.each([
    ['a version-only tag', '"7"', 7],
    ['a tag with a digest', '"7-AbC_d-9"', 7],
    ['a tag with surrounding spaces', '  "0-abc" ', 0],
  ])('reads the version from %s', (_case, header, version) => {
    expect(parseIfMatch(header)).toBe(version);
  });

  it.each([
    ['a weak tag', 'W/"7"'],
    ['a list of tags', '"7", "8"'],
    ['an unquoted version', '7'],
    ['a negative version', '"-1"'],
    ['garbage', 'not-a-tag'],
  ])('rejects %s as a precondition that can never match', (_case, header) => {
    expect(() => parseIfMatch(header)).toThrow(PreconditionFailedException);
  });
});
