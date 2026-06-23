/**
 * fixture.ts — generates real-path test pages for the theme-engine harness.
 *
 * Owner: @sharpee/platform-browser visual QA.
 *
 * A fixture is the platform's OWN browser shell (`devkit/.../index.html` —
 * the published `.sharpee-*` DOM contract, ADR-170) re-headed to link the
 * REAL engine CSS we are testing:
 *
 *     <link href="styles/base.css">   (structural)
 *     <link href="styles/engine.css">  (tokens + un-scoped consumer layer)
 *
 * The story-specific links (decorations.css, the per-theme styles.css, the
 * author override) and the game script are stripped — Phase 1 tests the
 * engine layer in isolation. Callers control the `<html data-theme>` value
 * and may inject an extra `<style>` block to simulate a theme package.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(HERE, '../..');
const SHELL_HTML = resolve(
  PKG_ROOT,
  '../devkit/templates/browser/index.html',
);
const BASE_CSS = resolve(PKG_ROOT, 'styles/base.css');
const ENGINE_CSS = resolve(PKG_ROOT, 'styles/engine.css');
const FIXTURE_DIR = resolve(HERE, '.fixtures');

export interface FixtureOptions {
  /** Value for `<html data-theme>`. `null`/omitted removes the attribute
   *  entirely (engine + `:root` only — the AC-1 zero-theme case). */
  dataTheme?: string | null;
  /** Extra CSS injected as an inline `<style>` AFTER the engine link, to
   *  stand in for a theme package's token override (AC-7 cases). */
  extraStyle?: string;
}

/**
 * Build a fixture HTML file and return its file:// URL.
 *
 * @param name unique fixture name (becomes `<name>.html`)
 * @param opts data-theme value and optional injected theme CSS
 * @returns a file:// URL suitable for `page.goto`
 */
export function buildFixture(name: string, opts: FixtureOptions = {}): string {
  const raw = readFileSync(SHELL_HTML, 'utf8');

  const headLinks =
    `  <link rel="stylesheet" href="${pathToFileURL(BASE_CSS).href}">\n` +
    `  <link rel="stylesheet" href="${pathToFileURL(ENGINE_CSS).href}">` +
    (opts.extraStyle ? `\n  <style>${opts.extraStyle}</style>` : '');

  let html = raw
    // Replace the entire run of story-specific stylesheet links + the
    // author-override comment with the engine links.
    .replace(
      /  <link rel="stylesheet" href="base\.css">[\s\S]*?<link rel="stylesheet" href="\{\{STORY_ID\}\}\.css">/,
      headLinks,
    )
    // Drop the game script — no JS in the engine fixture.
    .replace(/\s*<script src="game\.js"><\/script>/, '');

  // Set or remove the data-theme attribute on <html>.
  if (opts.dataTheme == null) {
    html = html.replace(/<html lang="en" data-theme="[^"]*">/, '<html lang="en">');
  } else {
    html = html.replace(
      /<html lang="en" data-theme="[^"]*">/,
      `<html lang="en" data-theme="${opts.dataTheme}">`,
    );
  }

  mkdirSync(FIXTURE_DIR, { recursive: true });
  const out = join(FIXTURE_DIR, `${name}.html`);
  writeFileSync(out, html, 'utf8');
  return pathToFileURL(out).href;
}
