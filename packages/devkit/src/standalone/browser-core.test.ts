/**
 * Unit tests for the browser-build core's IR-derived metadata + client config
 * (ADR-252 D2/D3). Pure functions over `IRMeta` — no filesystem, no build. Each
 * DOES/REJECTS line of readBrowserMeta / readClientConfig becomes an assertion.
 */
import { describe, it, expect } from 'vitest';
import type { IRMeta } from '@sharpee/chord';
import { readBrowserMeta, readClientConfig, KNOWN_HEADER_KEYS } from './browser-core.js';

/** Build an IRMeta with the given header fields (title/author defaulted). */
function meta(fields: Record<string, string>, title = 'The Folly at Fernhill', author = 'The Sharpee Project'): IRMeta {
  return { title, author, fields };
}

describe('readBrowserMeta (D2 — identity from the IR)', () => {
  it('maps each identity field from meta.title/author + meta.fields', () => {
    const m = meta({ id: 'fernhill', version: '0.1.0', blurb: 'One winter night.' });
    expect(readBrowserMeta(m)).toEqual({
      storyId: 'fernhill',
      storyTitle: 'The Folly at Fernhill',
      author: 'The Sharpee Project',
      version: '0.1.0',
      blurb: 'One winter night.',
    });
  });

  it('trims surrounding whitespace on id/version/blurb', () => {
    const m = meta({ id: '  fernhill ', version: ' 0.1.0', blurb: 'x  ' });
    const bm = readBrowserMeta(m);
    expect(bm.storyId).toBe('fernhill');
    expect(bm.version).toBe('0.1.0');
    expect(bm.blurb).toBe('x');
  });

  it('defaults version/blurb to empty string when the header omits them', () => {
    const bm = readBrowserMeta(meta({ id: 'bare' }));
    expect(bm.version).toBe('');
    expect(bm.blurb).toBe('');
  });

  it('throws when the header declares no id', () => {
    expect(() => readBrowserMeta(meta({ version: '1.0.0' }))).toThrow(/no `id:`/);
  });

  it('throws when id is present but blank', () => {
    expect(() => readBrowserMeta(meta({ id: '   ' }))).toThrow(/no `id:`/);
  });
});

describe('readClientConfig (D3 — client config from header fields)', () => {
  it('applies every default for a bare header (id only)', () => {
    const { config, warnings } = readClientConfig(meta({ id: 'fernhill' }));
    expect(config).toEqual({
      client: 'browser',
      theme: null,
      template: null,
      themes: [],
      defaultTheme: 'classic',
      storagePrefix: 'fernhill',
    });
    expect(warnings).toEqual([]);
  });

  it('reads client/theme/template and comma-splits themes with trimming', () => {
    const { config } = readClientConfig(
      meta({
        id: 'fernhill',
        client: 'browser',
        theme: 'parchment',
        template: 'estate-layout',
        themes: 'parchment,  paper ,  ',
      }),
    );
    expect(config.theme).toBe('parchment');
    expect(config.template).toBe('estate-layout');
    expect(config.themes).toEqual(['parchment', 'paper']);
  });

  it('defaults default-theme to the declared theme when present', () => {
    const { config } = readClientConfig(meta({ id: 'x', theme: 'parchment' }));
    expect(config.defaultTheme).toBe('parchment');
  });

  it('honors an explicit default-theme over the declared theme', () => {
    const { config } = readClientConfig(meta({ id: 'x', theme: 'parchment', 'default-theme': 'paper' }));
    expect(config.defaultTheme).toBe('paper');
  });

  it('falls default-theme to classic when no theme is declared', () => {
    const { config } = readClientConfig(meta({ id: 'x' }));
    expect(config.defaultTheme).toBe('classic');
  });

  it('defaults storage-prefix to the story id, honoring an explicit override', () => {
    expect(readClientConfig(meta({ id: 'fernhill' })).config.storagePrefix).toBe('fernhill');
    expect(readClientConfig(meta({ id: 'fernhill', 'storage-prefix': 'ff' })).config.storagePrefix).toBe('ff');
  });

  it('warns once per unrecognized header field (the tempate typo case)', () => {
    const { warnings } = readClientConfig(meta({ id: 'x', tempate: 'estate-layout' }));
    expect(warnings).toEqual(["unrecognized header field 'tempate' — ignored"]);
  });

  it('does not warn on any known header key', () => {
    for (const key of KNOWN_HEADER_KEYS) {
      const { warnings } = readClientConfig(meta({ id: 'x', [key]: 'v' }));
      expect(warnings).toEqual([]);
    }
  });
});
