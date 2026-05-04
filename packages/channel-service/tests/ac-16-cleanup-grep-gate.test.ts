/**
 * AC-16 — ADR-101 emission cleanup grep gate.
 *
 * After R5–R7 migrated all first-party platform consumers to ADR-163
 * channel-driven rendering, ADR-101 media event types should appear
 * ONLY inside the channel-system itself (closures that listen for
 * them, tests that drive them). A reference outside that allow-list
 * means a consumer is still emitting raw media events instead of
 * routing through the appropriate channel.
 *
 * The gate runs `grep -rn` for the ten ADR-101 event-type strings
 * across `packages/` and `stories/`, filters out:
 *  - source files in the channel-system (`packages/stdlib/src/channels/`,
 *    `packages/channel-service/src/`),
 *  - tests for that system (`packages/stdlib/tests/channels/`,
 *    `packages/channel-service/tests/`),
 *  - the AC-15 fixture story (`stories/channel-service-test/`),
 *  - dist / dist-esm / coverage artifacts,
 *  - documentation files (`docs/` directory mentions in code comments
 *    are flagged as the docstrings of allow-listed source files; bare
 *    `.md` matches inside packages/ are also allow-listed).
 *
 * Anything left over is an unexpected emission and fails the gate.
 *
 * Per ADR-163 R8 and CLAUDE.md rule 12a — this is a static gate; the
 * runtime regression gate is the Dungeo walkthrough chain.
 */

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '../../..');

const ADR_101_EVENT_TYPES = [
  'media.image.show',
  'media.image.hide',
  'media.image.preload',
  'media.sound.play',
  'media.music.play',
  'media.music.stop',
  'media.ambient.play',
  'media.ambient.stop',
  'media.animation.play',
  'media.animate',
  'media.transition',
  'media.layout.configure',
  'media.clear',
];

/**
 * Files / directories that LEGITIMATELY contain ADR-101 event-type
 * references — the channel-system itself, its tests, and the fixture
 * story.
 */
const ALLOW_LIST_PREFIXES = [
  'packages/stdlib/src/channels/',
  'packages/stdlib/tests/channels/',
  'packages/channel-service/src/',
  'packages/channel-service/tests/',
  'stories/channel-service-test/',
  'packages/sharpee/docs/genai-api/', // auto-generated API docs
];

/**
 * Build artifact directories — exclude entirely.
 */
const ARTIFACT_INFIX = ['/dist/', '/dist-esm/', '/coverage/', '/node_modules/', '/.archived/'];

interface Match {
  path: string;
  line: number;
  text: string;
}

function runGrep(): Match[] {
  // Build a single grep pattern joining the event types with `\|`.
  const pattern = ADR_101_EVENT_TYPES.map((s) => s.replace(/\./g, '\\.')).join('\\|');
  const result = spawnSync(
    'grep',
    [
      '-rn',
      '--include=*.ts',
      '--include=*.js',
      pattern,
      'packages',
      'stories',
      'scripts',
    ],
    { cwd: REPO_ROOT, encoding: 'utf-8', maxBuffer: 16 * 1024 * 1024 },
  );

  // grep exits 1 when no matches; that's not an error.
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(
      `grep failed (status ${result.status}): ${result.stderr || '(no stderr)'}`,
    );
  }

  const stdout = result.stdout ?? '';
  return stdout
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line): Match | null => {
      const m = /^([^:]+):(\d+):(.*)$/.exec(line);
      if (!m) return null;
      return { path: m[1], line: Number(m[2]), text: m[3] };
    })
    .filter((m): m is Match => m !== null);
}

function isAllowed(match: Match): boolean {
  if (ARTIFACT_INFIX.some((infix) => match.path.includes(infix))) return true;
  return ALLOW_LIST_PREFIXES.some((prefix) => match.path.startsWith(prefix));
}

describe('AC-16 — ADR-101 emission cleanup grep gate', () => {
  it('finds every ADR-101 event-type only in allow-listed locations', () => {
    const matches = runGrep();
    const unexpected = matches.filter((m) => !isAllowed(m));

    if (unexpected.length > 0) {
      const formatted = unexpected
        .map((m) => `  ${m.path}:${m.line}: ${m.text.trim()}`)
        .join('\n');
      throw new Error(
        `AC-16 grep gate found ${unexpected.length} unexpected ADR-101 event reference(s):\n${formatted}\n\n` +
          'Expected: zero references outside the channel-system (stdlib/src/channels, ' +
          'channel-service/src, stdlib/tests/channels, channel-service/tests, stories/channel-service-test). ' +
          'Migrate the offending consumer to use the appropriate channel, or extend the allow-list ' +
          'in this test file if the location is legitimate.',
      );
    }

    expect(unexpected).toEqual([]);
  });

  it('event-type list covers the canonical ADR-101 vocabulary', () => {
    // Sanity check — keep the grep pattern aligned with the channel
    // definitions in stdlib. If a new media event type is added, both
    // this list AND the corresponding stdlib channel definition must
    // be updated.
    expect(ADR_101_EVENT_TYPES).toHaveLength(13);
    expect(ADR_101_EVENT_TYPES).toContain('media.image.show');
    expect(ADR_101_EVENT_TYPES).toContain('media.clear');
  });
});
