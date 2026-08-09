/**
 * nav-bridge.test.mjs — filtering sharpee.net's navigation into what the
 * Documentation tab ships.
 *
 * The unit tests run against small fixture trees; the real-path suite at the
 * bottom runs against the ACTUAL `website/src/lib/nav.ts` and the actual
 * `content.mdx` corpus, because the property that matters — nav and corpus
 * describe the same set of pages — is a property of the real data and cannot be
 * demonstrated by a fixture. Both are needed: the fixtures pin the rules, the
 * real-path test pins that the rules still fit the site.
 * Owner context: tools/ide — Tests.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { shippedNav } from '../src/nav-bridge.mjs';

const NAV_FIXTURE = [
  {
    title: 'Chord Writer',
    version: '1.0.0',
    groups: [
      {
        title: 'Getting Started',
        items: [
          { title: 'Overview', href: '/chord-writer' },
          { title: 'Your first story', href: '/chord-writer/your-first-story' },
        ],
      },
    ],
  },
  {
    title: 'Chord',
    groups: [
      {
        title: 'Getting Started',
        items: [{ title: 'Install', href: '/chord/getting-started/install' }],
      },
      {
        title: 'Project & Files',
        items: [
          {
            title: 'Tooling',
            href: '/chord/guide/tooling',
            children: [{ title: 'sharpee compose', href: '/chord/guide/tooling/sharpee-compose' }],
          },
        ],
      },
    ],
  },
  {
    title: 'Tutorial',
    groups: [{ title: 'Fernhill Tutorial', items: [{ title: 'Overview', href: '/learn/fernhill' }] }],
    items: [
      { title: 'Play', href: '/play' },
      { title: 'Playground', href: '/playground' },
    ],
  },
];

const shipAll = (excludedGroups = []) =>
  shippedNav(NAV_FIXTURE, {
    sections: ['Chord Writer', 'Chord', 'Tutorial'],
    excludedGroups,
  });

describe('shippedNav — ordering and identity', () => {
  it('returns pages in nav order, not alphabetical order', () => {
    const { pages } = shipAll();
    expect(pages.map((p) => p.href)).toEqual([
      '/chord-writer',
      '/chord-writer/your-first-story',
      '/chord/getting-started/install',
      '/chord/guide/tooling',
      '/chord/guide/tooling/sharpee-compose',
      '/learn/fernhill',
    ]);
  });

  it('takes the section from the nav title, not the URL segment', () => {
    const { pages } = shipAll();
    const fernhill = pages.find((p) => p.href === '/learn/fernhill');
    expect(fernhill.section).toBe('Tutorial');
  });

  it('builds the crumb as the trail above the page, excluding the page itself', () => {
    const { pages } = shipAll();
    expect(pages.find((p) => p.href === '/chord/guide/tooling').crumb).toBe('Chord › Project & Files');
  });

  it('includes the parent item in a child page’s crumb', () => {
    const { pages } = shipAll();
    expect(pages.find((p) => p.href === '/chord/guide/tooling/sharpee-compose').crumb).toBe(
      'Chord › Project & Files › Tooling',
    );
  });

  it('carries the nav label separately from the page title it does not replace', () => {
    const { pages } = shipAll();
    expect(pages.find((p) => p.href === '/chord-writer').navTitle).toBe('Overview');
  });
});

describe('shippedNav — what does not ship', () => {
  it("never walks a section's ungrouped items, so app routes stay out", () => {
    const { pages } = shipAll();
    const hrefs = pages.map((p) => p.href);
    expect(hrefs).not.toContain('/play');
    expect(hrefs).not.toContain('/playground');
  });

  it('drops an excluded group while keeping its siblings', () => {
    const { pages } = shipAll([{ section: 'Chord', group: 'Getting Started' }]);
    const hrefs = pages.map((p) => p.href);
    expect(hrefs).not.toContain('/chord/getting-started/install');
    expect(hrefs).toContain('/chord/guide/tooling');
  });

  it('drops an excluded group only from the named section', () => {
    // Both sections have a group called "Getting Started"; excluding Chord's
    // must not take Chord Writer's with it.
    const { pages } = shipAll([{ section: 'Chord', group: 'Getting Started' }]);
    expect(pages.map((p) => p.href)).toContain('/chord-writer');
  });

  it('omits a section that was not asked for', () => {
    const { pages } = shippedNav(NAV_FIXTURE, { sections: ['Chord Writer'] });
    expect(pages.every((p) => p.section === 'Chord Writer')).toBe(true);
  });
});

describe('shippedNav — a filter that matches nothing is an error', () => {
  it('throws when a shipped section title does not exist', () => {
    expect(() => shippedNav(NAV_FIXTURE, { sections: ['Chord Reader'] })).toThrow(
      /no section titled "Chord Reader"/,
    );
  });

  it('throws when an excluded group names a section that does not exist', () => {
    expect(() => shipAll([{ section: 'Nope', group: 'Getting Started' }])).toThrow(
      /names no such section/,
    );
  });

  it('throws when an excluded group does not exist in its section', () => {
    expect(() => shipAll([{ section: 'Chord', group: 'Nope' }])).toThrow(
      /has no group "Nope" to exclude/,
    );
  });
});

describe('shippedNav — the rail tree', () => {
  it('nests children under their item', () => {
    const { tree } = shipAll();
    const chord = tree.find((s) => s.title === 'Chord');
    const tooling = chord.groups.find((g) => g.title === 'Project & Files').items[0];
    expect(tooling).toEqual({
      href: '/chord/guide/tooling',
      title: 'Tooling',
      children: [{ href: '/chord/guide/tooling/sharpee-compose', title: 'sharpee compose' }],
    });
  });

  it('keeps sections in the order they were requested', () => {
    const { tree } = shipAll();
    expect(tree.map((s) => s.title)).toEqual(['Chord Writer', 'Chord', 'Tutorial']);
  });

  it('omits an excluded group from the tree, not just from the page list', () => {
    const { tree } = shipAll([{ section: 'Chord', group: 'Getting Started' }]);
    const chord = tree.find((s) => s.title === 'Chord');
    expect(chord.groups.map((g) => g.title)).toEqual(['Project & Files']);
  });
});

// ── Real path (rule 13a) ─────────────────────────────────────────────────────
// No fixture: the real nav.ts, transpiled the same way build.mjs transpiles it,
// against the real content.mdx tree. This is the assertion the bundler's own
// invariant enforces, restated as a test so the failure names itself.

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../../../..');
const appDir = resolve(repoRoot, 'website/src/app');
const SECTIONS = ['chord-writer', 'chord', 'learn'];
const NAV_SECTIONS = ['Chord Writer', 'Chord', 'Tutorial'];
const EXCLUDED_GROUPS = [{ section: 'Chord', group: 'Getting Started' }];

function findContentFiles(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) findContentFiles(full, acc);
    else if (name === 'content.mdx') acc.push(full);
  }
  return acc;
}

async function loadRealNav() {
  const source = readFileSync(resolve(repoRoot, 'website/src/lib/nav.ts'), 'utf8');
  const { code } = await esbuild.transform(source, { loader: 'ts', format: 'esm' });
  const module = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  return module.NAV;
}

describe('the real site', () => {
  it('places every shipped content.mdx in the nav, and names no page that is missing', async () => {
    const nav = await loadRealNav();
    const { pages } = shippedNav(nav, { sections: NAV_SECTIONS, excludedGroups: EXCLUDED_GROUPS });
    const { pages: unfiltered } = shippedNav(nav, { sections: NAV_SECTIONS, excludedGroups: [] });

    const walked = new Set(
      SECTIONS.flatMap((s) => findContentFiles(join(appDir, s))).map(
        (f) => '/' + relative(appDir, dirname(f)).split(sep).join('/'),
      ),
    );
    const shipped = new Set(pages.map((p) => p.href));
    const excluded = new Set(unfiltered.map((p) => p.href).filter((h) => !shipped.has(h)));

    expect(pages.filter((p) => !walked.has(p.href)).map((p) => p.href)).toEqual([]);
    expect([...walked].filter((h) => !shipped.has(h) && !excluded.has(h))).toEqual([]);
    expect(excluded.size).toBe(3);
    expect(shipped.size).toBe(walked.size - excluded.size);
  });

  it('opens on Chord Writer rather than the alphabetically first page', async () => {
    const nav = await loadRealNav();
    const { pages } = shippedNav(nav, { sections: NAV_SECTIONS, excludedGroups: EXCLUDED_GROUPS });

    const alphabetical = SECTIONS.flatMap((s) => findContentFiles(join(appDir, s))).map(
      (f) => '/' + relative(appDir, dirname(f)).split(sep).join('/'),
    );

    expect(pages[0].href).toBe('/chord-writer');
    // The guard that matters: if someone reverts to directory order this test
    // must fail, and it only can if the two orders genuinely differ.
    expect(pages[0].href).not.toBe(alphabetical[0]);
  });

  it('keeps the command-line Getting Started pages out of the bundle', async () => {
    const nav = await loadRealNav();
    const { pages } = shippedNav(nav, { sections: NAV_SECTIONS, excludedGroups: EXCLUDED_GROUPS });
    expect(pages.filter((p) => p.href.startsWith('/chord/getting-started'))).toEqual([]);
  });
});
