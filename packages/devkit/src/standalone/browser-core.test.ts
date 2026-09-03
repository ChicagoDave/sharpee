/**
 * Unit tests for the browser-build core's IR-derived metadata + client config
 * (ADR-252 D2/D3, over ADR-298's typed closed-schema fields — GH #221). Pure
 * functions over `IRMeta` — no filesystem, no build. Each DOES/REJECTS line of
 * readBrowserMeta / readClientConfig becomes an assertion.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { IRMeta, IRStoryFields } from '@sharpee/chord';
import { stripClientMenu, injectThemes, readBrowserMeta, readClientConfig } from './browser-core.js';

/** Build an IRMeta with the given typed header fields (title/authors defaulted). */
function meta(
  fields: Partial<IRStoryFields> = {},
  title = 'The Folly at Fernhill',
  authors = ['The Sharpee Project'],
): IRMeta {
  return { title, fields: { authors, testers: [], themes: [], ...fields } };
}

describe('readBrowserMeta (D2 — identity from the IR)', () => {
  it('maps each identity field from meta.title + the typed fields', () => {
    const m = meta({
      id: 'fernhill',
      storyVersion: '0.1.0',
      description: { kind: 'literal', value: 'One winter night.' },
    });
    expect(readBrowserMeta(m)).toEqual({
      storyId: 'fernhill',
      storyTitle: 'The Folly at Fernhill',
      author: 'The Sharpee Project',
      version: '0.1.0',
      description: 'One winter night.',
      // Absent `publish-source:` reads as false — the build owns the default.
      publishSource: false,
    });
  });

  it('reads publish-source from the header, defaulting to false when absent', () => {
    expect(readBrowserMeta(meta({ id: 'fernhill' })).publishSource).toBe(false);
    expect(readBrowserMeta(meta({ id: 'fernhill', publishSource: false })).publishSource).toBe(false);
    expect(readBrowserMeta(meta({ id: 'fernhill', publishSource: true })).publishSource).toBe(true);
  });

  it('joins multiple authors with ", " for the display string (ADR-298)', () => {
    const m = meta({ id: 'x' }, 'T', ['Ada Lovelace', 'Charles Babbage']);
    expect(readBrowserMeta(m).author).toBe('Ada Lovelace, Charles Babbage');
  });

  it('trims surrounding whitespace on id/version/description', () => {
    const m = meta({
      id: '  fernhill ',
      storyVersion: ' 0.1.0',
      description: { kind: 'literal', value: 'x  ' },
    });
    const bm = readBrowserMeta(m);
    expect(bm.storyId).toBe('fernhill');
    expect(bm.version).toBe('0.1.0');
    expect(bm.description).toBe('x');
  });

  it('defaults version/description to empty string when the header omits them', () => {
    const bm = readBrowserMeta(meta({ id: 'bare' }));
    expect(bm.version).toBe('');
    expect(bm.description).toBe('');
  });

  it('throws when the header declares no id', () => {
    expect(() => readBrowserMeta(meta({ storyVersion: '1.0.0' }))).toThrow(/no `id:`/);
  });

  it('throws when id is present but blank', () => {
    expect(() => readBrowserMeta(meta({ id: '   ' }))).toThrow(/no `id:`/);
  });
});

describe('readClientConfig (D3 — client config from typed header fields)', () => {
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

  it('reads client/theme/template and passes the typed themes list through', () => {
    // Comma-splitting/trimming of `themes:` is the PARSER's job now
    // (ADR-298 closed schema) — this function receives the typed list.
    const { config } = readClientConfig(
      meta({
        id: 'fernhill',
        client: 'browser',
        theme: 'parchment',
        template: 'estate-layout',
        themes: ['parchment', 'paper'],
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
    const { config } = readClientConfig(
      meta({ id: 'x', theme: 'parchment', defaultTheme: 'paper' }),
    );
    expect(config.defaultTheme).toBe('paper');
  });

  it('falls default-theme to classic when no theme is declared', () => {
    const { config } = readClientConfig(meta({ id: 'x' }));
    expect(config.defaultTheme).toBe('classic');
  });

  it('defaults storage-prefix to the story id, honoring an explicit override', () => {
    expect(readClientConfig(meta({ id: 'fernhill' })).config.storagePrefix).toBe('fernhill');
    expect(
      readClientConfig(meta({ id: 'fernhill', storagePrefix: 'ff' })).config.storagePrefix,
    ).toBe('ff');
  });

  it('never warns — unknown keys are compile-time parse errors now (ADR-298 D4)', () => {
    const { warnings } = readClientConfig(
      meta({ id: 'x', client: 'browser', theme: 'v', template: 'v', defaultTheme: 'v', storagePrefix: 'v' }),
    );
    expect(warnings).toEqual([]);
  });
});

describe('injectThemes — the wired-themes data block (P-4)', () => {
  const PAGE = '<html><head>\n  <!-- THEME_LINKS: filled by the build -->\n</head><body></body></html>';

  it('a hostile author-theme name cannot break out of the JSON script block', () => {
    // Author theme names come from the story's own config — the one line
    // written to defend the block is the one under test here.
    const hostile = '</script><script>alert(1)</script>';
    const html = injectThemes(PAGE, [{ id: 'x', name: hostile, cssPath: null, srcDir: null } as never]);

    const open = '<script id="sharpee-wired-themes" type="application/json">';
    const start = html.indexOf(open) + open.length;
    const block = html.slice(start, html.indexOf('</script>', start));
    // The block's first real close tag comes after the WHOLE payload: the
    // embedded name parses back intact, escapes and all.
    const parsed = JSON.parse(block) as Array<{ id: string; name: string }>;
    expect(parsed).toEqual([{ id: 'x', name: hostile }]);
  });

  it('an empty wired list still yields a valid, empty data block', () => {
    const html = injectThemes(PAGE, []);
    expect(html).toContain('<script id="sharpee-wired-themes" type="application/json">[]</script>');
    expect(html).toContain('<!-- no built-in themes wired -->');
  });
});

describe('stripClientMenu (ADR-290 D6, GH #196)', () => {
  const template = readFileSync(join(__dirname, '..', '..', 'templates', 'browser', 'index.html'), 'utf-8');

  it('removes the menu bar block from the default template and keeps the rest of the page', () => {
    const html = stripClientMenu(template);

    expect(template).toContain('id="menu-bar"');
    expect(html).not.toContain('id="menu-bar"');
    expect(html).not.toContain('id="menu-save"');
    expect(html).not.toContain('id="theme-menu"');
    expect(html).toContain('id="command-input"');
    expect(html).toContain('id="main-window"');
    expect(html).toContain('id="save-dialog"'); // the dialogs stay — inert without the menu
  });

  it('returns a page with no menu bar unchanged', () => {
    const bare = '<!DOCTYPE html><html><body><div id="main-window"></div></body></html>';
    expect(stripClientMenu(bare)).toBe(bare);
  });
});
