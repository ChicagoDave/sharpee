/**
 * message-override.test.ts — ADR-255 `override message` / `override messages`
 * (chord frontend): the constructs parse reusing the `define phrase` body
 * reader (D1); the IR carries the ACL alias and its phrase body (never a dotted
 * platform id — D4); an alias absent from the catalog raises
 * `analysis.unknown-message-alias` (D4); a dot in the alias is a parse error
 * (ADR-254). Platform binding (alias -> if.action.*) is the loader's job.
 */
import { describe, expect, it } from 'vitest';
import { compile, MESSAGE_OVERRIDE_ALIASES } from '../src';

const HEADER = 'story "T" by "N"\n  id: t\n  version: 0.0.1\n\n';
const ROOM = '\ncreate the Hall\n  a room\n\n  A hall.\n';

function compileSource(body: string) {
  return compile(`${HEADER}${body}${ROOM}`);
}
const errorCodes = (r: ReturnType<typeof compile>) =>
  r.diagnostics.filter((d) => d.severity === 'error').map((d) => d.code);

describe('override message (ADR-255 D1)', () => {
  it('a single-alias override parses and the IR carries the alias + phrase body', () => {
    const r = compileSource('override message taking-fixed-in-place\n  It will not budge.\nend override\n');
    expect(errorCodes(r)).toEqual([]);
    const table = r.ir.messageOverrides.locales['en-US'];
    expect(Object.keys(table)).toEqual(['taking-fixed-in-place']);
    expect(table['taking-fixed-in-place'].variants[0].text).toContain('will not budge');
    // Interface Contract 3: no dotted platform id in the IR.
    expect(JSON.stringify(r.ir.messageOverrides)).not.toContain('if.action');
  });

  it('full define-phrase parity: `, cycling` with `or` variants (D1)', () => {
    const r = compileSource(
      'override message taking-fixed-in-place, cycling\n  It will not budge.\nor\n  You heave; it stays bolted.\nend override\n',
    );
    expect(errorCodes(r)).toEqual([]);
    const entry = r.ir.messageOverrides.locales['en-US']['taking-fixed-in-place'];
    expect(entry.strategy).toBe('cycling');
    expect(entry.variants.map((v) => v.text)).toHaveLength(2);
  });

  it('`override messages <locale>` block of alias: text entries (D1)', () => {
    const r = compileSource(
      'override messages en-US\n  taking-fixed-in-place:\n    It will not budge.\n  wearing-already-wearing:\n    You are already wearing it.\n',
    );
    expect(errorCodes(r)).toEqual([]);
    const table = r.ir.messageOverrides.locales['en-US'];
    expect(Object.keys(table).sort()).toEqual(['taking-fixed-in-place', 'wearing-already-wearing']);
  });
});

describe('override alias validation (ADR-255 D4)', () => {
  it('an alias absent from the catalog raises analysis.unknown-message-alias', () => {
    const r = compileSource('override message not-a-real-alias\n  Nope.\nend override\n');
    expect(errorCodes(r)).toContain('analysis.unknown-message-alias');
  });

  it('the ADR example key that does not exist in lang-en-us is rejected (catalog is live-pinned)', () => {
    // ADR-255's worked example cited `wearing-already-worn`; the real message
    // key is `already_wearing` -> `wearing-already-wearing`. The catalog reflects
    // the LIVE message set, so the stale alias is (correctly) not valid.
    expect(MESSAGE_OVERRIDE_ALIASES.has('wearing-already-worn')).toBe(false);
    expect(MESSAGE_OVERRIDE_ALIASES.has('wearing-already-wearing')).toBe(true);
  });

  it('a duplicate override alias raises analysis.duplicate-message-override', () => {
    const r = compileSource(
      'override message taking-taken\n  Got it.\nend override\n\noverride message taking-taken\n  Again.\nend override\n',
    );
    expect(errorCodes(r)).toContain('analysis.duplicate-message-override');
  });

  it('a dotted alias is a parse error (ADR-254 — an alias is one kebab token)', () => {
    const r = compileSource('override message if.action.taking.fixed_in_place\n  Nope.\nend override\n');
    expect(errorCodes(r)).toContain('parse.dotted-key');
  });
});

describe('catalog shape (ADR-255 D7)', () => {
  it('every alias is a single dotless kebab token', () => {
    for (const alias of MESSAGE_OVERRIDE_ALIASES) {
      expect(alias, alias).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });
});
