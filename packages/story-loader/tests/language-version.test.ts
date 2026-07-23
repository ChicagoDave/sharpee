/**
 * language-version.test.ts — ADR-257 D3/Q2: the loader treats the IR's
 * `languageVersion` as INFORMATIONAL. Only `IR_FORMAT` (the wire stamp) gates
 * loadability; a `languageVersion` the loader has never heard of must load
 * without warning or refusal. REAL-PATH: real compile → real createStory.
 */
import { describe, expect, it, vi } from 'vitest';
import { compile, CHORD_LANGUAGE_VERSION } from '@sharpee/chord';
import { createStory } from '../src';

const STORY = `story "T" by "T"
  id: t
  version: 0.0.1

create the Hall
  a room

  A hall.

create the player
  starts in the Hall`;

const irOf = (src: string) => {
  const r = compile(src);
  if (!r.ok) throw new Error(r.diagnostics.map((d) => `${d.code} ${d.message}`).join('; '));
  return r.ir;
};

describe('IR languageVersion is informational (ADR-257 D3)', () => {
  it('the compiler stamps the live CHORD_LANGUAGE_VERSION into the IR', () => {
    expect(irOf(STORY).languageVersion).toBe(CHORD_LANGUAGE_VERSION);
  });

  it('the loader loads a story whose languageVersion it does not recognize — no warn, no refuse', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const ir = irOf(STORY);
    // A future language version the loader has never heard of — format stays valid.
    (ir as { languageVersion: string }).languageVersion = '99.0.0';

    expect(() => createStory(ir)).not.toThrow();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();

    warn.mockRestore();
    error.mockRestore();
  });
});
