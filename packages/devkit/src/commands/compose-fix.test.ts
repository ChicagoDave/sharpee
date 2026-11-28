/**
 * compose-fix.test.ts — fillFix (ADR-409 D7.2): a chord fix's form slot is
 * filled from the story language's own numberForms, and a fix whose slot no
 * language can fill is dropped rather than shipped with the marker in it.
 *
 * Owner context: @sharpee/devkit test suite.
 */
import { describe, expect, it } from 'vitest';
import type { DiagnosticFix } from '@sharpee/chord';
import { resolveNounExtractor, type NounsModule } from '@sharpee/if-domain/nouns';
import { fillFix } from './compose-fix.js';

const span = { line: 3, column: 12, endLine: 3, endColumn: 18 };
const english = resolveNounExtractor('en-US', (moduleName) => require(moduleName) as NounsModule);

describe('fillFix', () => {
  it('fills the slot in the edit and the label from lang-en-us, and drops the slot', () => {
    const fix: DiagnosticFix = {
      label: 'Write `plural of glass {form}`',
      edits: [{ span, text: 'plural of glass {form}', slot: { word: 'houses', want: 'singular' } }],
    };
    expect(english.found).toBe(true);
    expect(fillFix(fix, english)).toEqual({
      label: 'Write `plural of glass house`',
      edits: [{ span, text: 'plural of glass house' }],
    });
  });

  it('passes an edit with no slot through as written, with or without a language', () => {
    const fix: DiagnosticFix = { label: 'Remove it', edits: [{ span, text: '' }] };
    expect(fillFix(fix, english)).toEqual({ label: 'Remove it', edits: [{ span, text: '' }] });
    expect(fillFix(fix, { found: false, refusal: 'none' })).toEqual({ label: 'Remove it', edits: [{ span, text: '' }] });
  });

  it('drops a slotted fix when the story language has no nouns module', () => {
    const fix: DiagnosticFix = {
      label: 'Write `plural of {form}`',
      edits: [{ span, text: 'plural of {form}', slot: { word: 'houses', want: 'singular' } }],
    };
    const missing = resolveNounExtractor('xx-XX', (moduleName) => require(moduleName) as NounsModule);
    expect(missing.found).toBe(false);
    expect(fillFix(fix, missing)).toBeUndefined();
  });
});
