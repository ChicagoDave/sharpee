/**
 * capture-parity.test.ts — ADR-282 Acceptance 5, the capture half.
 *
 * The claim under test: **what the Play pane records for a turn is
 * character-for-character what the headless runner will compare that turn
 * against.** ADR-282's blessed verbatim assertions are captured through the
 * browser turn-events bridge and replayed through `sharpee test`; if the two
 * text projections differ by so much as a blank line, every multi-paragraph
 * bless fails on its first headless run — which is exactly what happened
 * before the 2026-07-28 amendment (the bridge read DOM `textContent` and
 * joined every node with `'\n'`, the harness joined non-tight entries with
 * `'\n\n'`).
 *
 * `turn-events.test.ts` pins the join RULE against a fake engine. This test
 * pins the OUTCOME against two real runs, because a shared helper only proves
 * parity if both sides genuinely reach it:
 *
 *  - **Headless side** — the shipped CLI bundle (`dist/cli/sharpee.js`) in a
 *    fresh process, `--exec`ing the commands. That is `@sharpee/bootstrap`'s
 *    real `executeCommand`, whose return value is the exact string
 *    `runner.ts` normalizes and compares a `[OK]` fence against. No stub, no
 *    in-process re-implementation of the harness.
 *  - **Browser side** — a real `BrowserClient` driving a real `GameEngine`
 *    over the same story, wired exactly the way devkit's shipped
 *    `chord-browser-entry.ts.template` wires it at boot, with a real
 *    `window.webkit.messageHandlers.turnEvents` bridge installed the way
 *    `PlayViewController` installs one. The recorded response is whatever
 *    that bridge actually posts.
 *
 * Both sides run the SAME `.story` source bytes: the CLI compiles the file,
 * the browser side compiles the same text through `@sharpee/chord`. A Chord
 * fixture rather than a compiled story package precisely so no build step
 * sits between the fixture and either path.
 *
 * Skips (loudly) when `dist/cli/sharpee.js` is absent — build it with
 * `./repokit build dungeo`.
 *
 * @see ADR-282 — Play-to-test — D2, Acceptance 5, and the 2026-07-28 amendment
 * @see ADR-287 — fenced payloads (what the captured text is serialized into)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

import { GameEngine, type Story } from '@sharpee/engine';
import { WorldModel, EntityType } from '@sharpee/world-model';
import { Parser } from '@sharpee/parser-en-us';
import { LanguageProvider } from '@sharpee/lang-en-us';
import { PerceptionService } from '@sharpee/stdlib';
import { compile } from '@sharpee/chord';
import { createStory } from '@sharpee/story-loader';

import { BrowserClient } from '../src/BrowserClient';
import type { DOMElements } from '../src/types';

const REPO_ROOT = resolve(__dirname, '../../..');
const CLI_BUNDLE = resolve(REPO_ROOT, 'dist/cli/sharpee.js');
const FIXTURE = resolve(__dirname, 'fixtures/capture-parity.story');

const BUNDLE_PRESENT = existsSync(CLI_BUNDLE);

/**
 * The turns being compared.
 *
 * `look` is deliberately NOT in here even though both sides execute it: the
 * browser client's `start()` runs its own opening `look` through
 * `engine.executeTurn` rather than `client.executeCommand`, so that turn
 * never reaches the bridge and is never blessable. The headless side runs it
 * as its first `--exec` command purely to reach the same world state, and its
 * output is discarded. Everything after it is compared.
 */
const COMMANDS = ['x lectern', 'read notice', 'look'] as const;
const PRIMING_COMMAND = 'look';

// ────────────────────────────────────────────────────────────────────
//  Headless side — the real shipped CLI, in its own process
// ────────────────────────────────────────────────────────────────────

/**
 * Run the fixture through `dist/cli/sharpee.js --exec` and return one entry
 * per command, in order.
 *
 * The CLI prints `> <command>`, then the command's output, then one blank
 * line. Blocks are cut on the `> ` markers; the single trailing blank line is
 * the CLI's own separator, not part of the response (a channel-flattened
 * response never ends blank — `joinProseEntries` skips blank entries and joins
 * without a trailing newline).
 *
 * @param commands — commands to run, in order.
 * @returns each command's captured output.
 * @throws if the CLI exits non-zero or prints fewer blocks than commands.
 */
function runHeadless(commands: readonly string[]): string[] {
  const result = spawnSync(
    process.execPath,
    [CLI_BUNDLE, '--exec', commands.join('/'), '--story', FIXTURE],
    { cwd: REPO_ROOT, encoding: 'utf-8', timeout: 60_000 },
  );

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`CLI exited ${result.status}\nstderr:\n${result.stderr}`);
  }

  const lines = (result.stdout ?? '').replace(/\r\n/g, '\n').split('\n');
  const markers: number[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i] === `> ${commands[markers.length]}`) markers.push(i);
  }
  if (markers.length !== commands.length) {
    throw new Error(
      `expected ${commands.length} command markers, found ${markers.length}\n`
      + `stdout:\n${result.stdout}`,
    );
  }

  return markers.map((start, i) => {
    const end = i + 1 < markers.length ? markers[i + 1] : lines.length;
    return lines.slice(start + 1, end).join('\n').replace(/\n+$/, '');
  });
}

// ────────────────────────────────────────────────────────────────────
//  Browser side — the real client, wired as the shipped entry wires it
// ────────────────────────────────────────────────────────────────────

/** Mount the element set `chord-browser-entry.ts.template` looks up by id. */
function mountHostElements(): DOMElements {
  const make = <T extends HTMLElement>(tag: string): T => {
    const el = document.createElement(tag) as T;
    document.body.appendChild(el);
    return el;
  };
  const mainWindow = make<HTMLElement>('div');
  const textContent = document.createElement('div');
  mainWindow.appendChild(textContent);
  return {
    statusLocation: make<HTMLElement>('span'),
    statusScore: make<HTMLElement>('span'),
    textContent,
    mainWindow,
    commandInput: make<HTMLInputElement>('input'),
    saveDialog: make<HTMLElement>('div') as unknown as HTMLDialogElement,
    restoreDialog: make<HTMLElement>('div') as unknown as HTMLDialogElement,
    startupDialog: make<HTMLElement>('div') as unknown as HTMLDialogElement,
    saveNameInput: make<HTMLInputElement>('input'),
    saveSlotsListEl: make<HTMLElement>('ul'),
    restoreSlotsListEl: make<HTMLElement>('ul'),
    noSavesMessage: make<HTMLElement>('div'),
    startupSaveInfo: make<HTMLElement>('div'),
    menuBar: make<HTMLElement>('div'),
  };
}

/**
 * Play the fixture through a real `BrowserClient` and return what the
 * turn-events bridge posted for each command, in order.
 *
 * @param source — the `.story` source both sides share.
 * @param commands — commands to type, in order.
 * @returns each command's recorded response, as the IDE would receive it.
 * @throws if the fixture fails its Chord load-time gate, or if the bridge
 *         posts a different number of turns than commands typed.
 */
async function runInBrowserClient(
  source: string,
  commands: readonly string[],
): Promise<string[]> {
  const compiled = compile(source);
  if (!compiled.ok) {
    const errors = compiled.diagnostics.filter((d) => d.severity === 'error');
    throw new Error(
      `fixture failed the Chord load-time gate:\n`
      + errors.map((d) => `  ${d.span.line}:${d.span.column} [${d.code}] ${d.message}`).join('\n'),
    );
  }
  const story = createStory(compiled.ir) as unknown as Story;

  // The bridge PlayViewController installs. Same shape, same handler name.
  const posted: Array<{ command: string; response: string }> = [];
  (window as any).webkit = {
    messageHandlers: {
      turnEvents: { postMessage: (body: string) => posted.push(JSON.parse(body)) },
    },
  };

  const client = new BrowserClient({
    // Unique per run: a shared prefix would let one run's autosave restore
    // into the next and silently replay a stale world.
    storagePrefix: `capture-parity-${process.pid}-`,
    // The one deliberate departure from the shipped entry. happy-dom's
    // `localStorage` here rejects writes, so leaving autosave on buries the
    // run in `[autosave] Failed` traces. It plays no part in turn capture:
    // the recorded text is accumulated by the `main` renderer during the
    // turn and posted by `executeCommand`, on a path that never consults
    // the save manager.
    autoSave: false,
    defaultTheme: 'modern-dark',
    themes: [{ id: 'modern-dark', name: 'Modern Dark' }],
    storyInfo: {
      title: story.config.title,
      description: story.config.description || '',
      authors: story.config.authors.join(', '),
      version: '1.0.0',
    },
  });
  client.initialize(mountHostElements());

  const world = new WorldModel();
  const player = world.createEntity('player', EntityType.ACTOR);
  world.setPlayer(player.id);

  const language = new LanguageProvider();
  const parser = new Parser(language);
  if (story.extendParser) story.extendParser(parser);
  if (story.extendLanguage) story.extendLanguage(language);

  const perceptionService = new PerceptionService();
  const engine = new GameEngine({ world, player, parser, language, perceptionService });

  client.connectEngine(engine, world);
  engine.setStory(story);
  engine.registerSaveRestoreHooks(client.getSaveRestoreHooks());

  await client.start();

  for (const command of commands) {
    await client.executeCommand(command);
  }

  // The boot look is a real feed record now (ADR-305 D3: replay turn numbers
  // must align with play), so the bridge posts commands.length + 1 records
  // and the first one is the echo-less boot turn.
  if (posted.length !== commands.length + 1) {
    throw new Error(
      `bridge posted ${posted.length} turns for ${commands.length} commands + boot look: `
      + JSON.stringify(posted.map((p) => p.command)),
    );
  }
  expect(posted[0].command).toBe('look');
  for (let i = 0; i < commands.length; i += 1) {
    // A misaligned pairing would compare the wrong turns and could pass by
    // accident, so pin the pairing itself rather than assuming it.
    expect(posted[i + 1].command).toBe(commands[i]);
  }
  return posted.map((p) => p.output);
}

// ────────────────────────────────────────────────────────────────────
//  The proof
// ────────────────────────────────────────────────────────────────────

describe.skipIf(!BUNDLE_PRESENT)(
  'ADR-282 Acceptance 5 — capture parity (Play pane vs. headless runner)'
  + (BUNDLE_PRESENT ? '' : ' [skipped: dist/cli/sharpee.js missing — ./repokit build dungeo]'),
  () => {
    let headless: string[];
    let recorded: string[];

    beforeAll(async () => {
      const source = readFileSync(FIXTURE, 'utf-8');
      // The priming `look` matches the client's own start()-time look — and
      // since ADR-305 the bridge records that boot turn too, so both arrays
      // carry it at index 0 and the typed turns align 1:1 behind it. The boot
      // turn itself is NOT byte-compared: this harness's runHeadless shim
      // folds the boot banner into the priming look's slice, which the real
      // runner does not do (`bootstrap` resets outputBuffer per command) and
      // the browser prose slot never sees. Alignment of the boot record is
      // pinned in runInBrowserClient; content parity is a typed-turn claim.
      headless = runHeadless([PRIMING_COMMAND, ...COMMANDS]);
      recorded = await runInBrowserClient(source, COMMANDS);
    }, 120_000);

    it('records byte-identical text for every compared typed turn', () => {
      for (let i = 1; i < recorded.length; i += 1) {
        expect(recorded[i], `turn ${i + 1} (\`${COMMANDS[i - 1]}\`)`).toBe(headless[i]);
      }
    });

    it('preserves the blank line between paragraphs on both sides', () => {
      // The 2026-07-28 divergence, stated as an observable fact about the
      // fixture rather than as an argument from the shared helper: `look`
      // answers with two paragraphs. If either side collapsed the boundary
      // to a single newline the equality above could still hold while both
      // sides were wrong together, so assert the boundary is really there.
      const look = recorded[COMMANDS.indexOf('look') + 1];
      expect(look).toContain('\n\n');
      expect(look).toBe(headless[COMMANDS.indexOf('look') + 1]);
    });

    it('captures bracket-shaped lines and quotes intact (the fence content)', () => {
      // Acceptance 5's named content shape. These characters are what
      // ADR-287's fences exist for; a capture that mangled them would make
      // the blessed fence unrunnable no matter how the serializer behaves.
      const notice = recorded[COMMANDS.indexOf('read notice') + 1];
      expect(notice).toContain('[posted by order of the proving board]');
      expect(notice).toContain('She said "take it" and would not look at you.');
      expect(notice).toContain('[the lamp gutters]');
      expect(notice).toBe(headless[COMMANDS.indexOf('read notice') + 1]);
    });

    it('spans a multi-packet turn without dropping or reordering text', () => {
      // `read notice` reports an implicit take BEFORE the notice text, so the
      // turn arrives as several packets. Packet-level accumulation is the
      // half of the capture the DOM read used to hide.
      const notice = recorded[COMMANDS.indexOf('read notice') + 1];
      expect(notice.indexOf('taking the notice'))
        .toBeLessThan(notice.indexOf('[posted by order of the proving board]'));
      expect(notice.indexOf('[posted by order of the proving board]'))
        .toBeLessThan(notice.indexOf('[the lamp gutters]'));
    });

    it('records no turn as empty — an empty capture would pass equality vacuously', () => {
      const labels = [PRIMING_COMMAND, ...COMMANDS];
      for (let i = 0; i < labels.length; i += 1) {
        expect(recorded[i].trim(), `turn ${i + 1} (\`${labels[i]}\`)`).not.toBe('');
      }
    });
  },
);

if (!BUNDLE_PRESENT) {
  // eslint-disable-next-line no-console
  console.log('[capture-parity] Skipping — dist/cli/sharpee.js missing (./repokit build dungeo)');
}
