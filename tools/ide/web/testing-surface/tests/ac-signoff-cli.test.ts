/**
 * ac-signoff-cli.test.ts — ADR-307 Phase 5: the acceptance bar proven end to
 * end, two real consumers, one document (rule 13a — nothing stubbed).
 *
 * AC-2: a suite authored through the tab's real model (driven by the real
 * engine, RECORDING persisting synthesis into the JSON — David 2026-08-10:
 * the JSON is the source of truth) runs through the REAL `sharpee test
 * --tree` CLI subprocess with the tab's exact arguments; derived labels,
 * failure citations, and per-assertion detail must be identical between the
 * tab's fold and the CLI's stream/report, and the document bytes must be
 * untouched by the run.
 *
 * AC-3: tail-cut, splice-in, splice-out, and branch — each followed by a
 * whole-path replay through the real CLI — yield EXACTLY the specified tree
 * (byte-level, via the shared serializer; claim content is what record-time
 * synthesis persisted, structure is specified explicitly), with seams
 * surfacing as failed assertions, never corruption or lost nodes.
 *
 * The CLI is spawned as a child process on the compiled devkit dist — the
 * same `node cli.js test <story> --tree --capture-output --capture-world
 * --json` the Swift shell spawns (TestRunner.treeRunArguments).
 *
 * The story deliberately declares NO `auto-assertion:` header: recording
 * synthesizes under the PLATFORM default (the fresh-start case) and the
 * document carries everything a run needs — nothing is assumed at run time.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  DEFAULT_AUTO_ASSERTION_POLICY,
  proseTextLinesOf,
} from '@sharpee/branch-tester/auto-assertion';
import {
  serializeTreeDocument,
  type TreeAssertions,
  type TreeCard,
  type TreeChannelAssertion,
  type TreeDocument,
} from '@sharpee/branch-tester/tree-document';
import { openingDefaultClaims, recordedTurnAssertions } from '../src/compose';
import { MAIN_LINE, TreeSessionModel } from '../src/model';
import { beginRun, createRunState, finishRun, foldRunLine, type RunColumnState } from '../src/run';

const testsDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testsDir, '../../../../..');
const devkitCli = join(repoRoot, 'packages/devkit/dist/cli.js');

const requireCompiled = createRequire(import.meta.url);
const { loadAuthorGame } = requireCompiled(
  join(repoRoot, 'packages/devkit/dist/standalone/author-game.js'),
) as {
  loadAuthorGame: (
    target: string,
    opts?: { seed?: number; channels?: string[] },
  ) => Promise<RealGame>;
};

interface RealGame {
  executeCommand(input: string): Promise<string> | string;
  lastChannelValues?: Record<string, unknown[]>;
  bootChannelValues?: Record<string, unknown[]>;
}

const STORY = `story
  title: Mini
  authors:
    T
  id: mini
  story-version: 0.0.1
  description: A small square test story.
  prologue: Night falls on the den.

create the Den
  a room
  north to the Garden

  A small square den.

create the Garden
  a room

  Roses everywhere.

create the brass lamp
  in the Den

  It gleams dully.

create Alex
  a person
  playable
  starts in the Den

  You.

before the game starts
  change the player to Alex
end before

`;

let projectDir: string;
let storyPath: string;
let docPath: string;

beforeAll(() => {
  projectDir = mkdtempSync(join(tmpdir(), 'ac-signoff-'));
  storyPath = join(projectDir, 'mini.story');
  docPath = join(projectDir, 'mini.tests.json');
  writeFileSync(storyPath, STORY);
});

afterAll(() => rmSync(projectDir, { recursive: true, force: true }));

const loadGame = (): Promise<RealGame> =>
  loadAuthorGame(projectDir, {
    seed: 42,
    channels: ['room-name', 'room-description', 'info', 'prologue'],
  });

let ordinal = 0;
/** What recording persisted per ordinal — the expected trees read these
 *  (structure is specified explicitly; claim CONTENT is what the real
 *  engine's captures synthesized, and the CLI proves it holds on replay). */
const recordedLog = new Map<number, TreeAssertions | undefined>();
let openingLog: TreeChannelAssertion[] = [];

/** Plays one command on the real engine and folds it into the model the way
 *  the tab's feed does — recorded assertions persisted (JSON = truth). */
async function playReal(
  model: TreeSessionModel,
  game: RealGame,
  command: string,
  boot = false,
): Promise<number> {
  const output = String(await game.executeCommand(command));
  ordinal += 1;
  const room = proseTextLinesOf(game.lastChannelValues?.['room-name']).at(-1);
  const recorded = recordedTurnAssertions(DEFAULT_AUTO_ASSERTION_POLICY, {
    output,
    ...(game.lastChannelValues !== undefined ? { channelValues: game.lastChannelValues } : {}),
  });
  recordedLog.set(ordinal, recorded.assertions);
  const openingClaims = boot
    ? openingDefaultClaims(DEFAULT_AUTO_ASSERTION_POLICY, {
        ...(game.lastChannelValues ?? {}),
        ...(game.bootChannelValues ?? {}),
      })
    : [];
  if (boot) openingLog = openingClaims;
  model.addTurn({
    ordinal,
    command: boot ? '' : command,
    boot,
    ...(room !== undefined ? { room } : {}),
    ...(recorded.assertions !== undefined ? { assertions: recorded.assertions } : {}),
    ...(recorded.skip === true ? { skip: true } : {}),
    ...(openingClaims.length > 0 ? { openingAssertions: { channels: openingClaims } } : {}),
  });
  return ordinal;
}

/** Deep-clone a recorded assertions object and append authored contains. */
function withContains(
  recorded: TreeAssertions | undefined,
  ...authored: string[]
): TreeAssertions | undefined {
  const base: TreeAssertions = recorded === undefined ? {} : JSON.parse(JSON.stringify(recorded));
  if (authored.length > 0) (base.contains ??= []).push(...authored);
  return Object.keys(base).length > 0 ? base : undefined;
}

/** A card literal with optional assertions. */
function card(type: TreeCard['type'], command?: string, assertions?: TreeAssertions): TreeCard {
  return {
    type,
    ...(command !== undefined ? { command } : {}),
    ...(assertions !== undefined ? { assertions } : {}),
  };
}

interface BaseSession {
  model: TreeSessionModel;
  examined: number;
  north: number;
  branchId: number;
  /** The EXACT tree `buildBase` specifies — AC-3's byte-equality target. */
  expected: TreeDocument;
}

/** The base session every gesture starts from: boot look, a claimed examine
 *  (holding a branch with a claimed alternate look), a claimed north. */
async function buildBase(): Promise<BaseSession> {
  const model = new TreeSessionModel('mini', 42);
  const game = await loadGame();
  const boot = await playReal(model, game, 'look', true);
  const examined = await playReal(model, game, 'examine the brass lamp');
  model.addContains(examined, 'gleams dully');
  const north = await playReal(model, game, 'north');
  model.addContains(north, 'Roses everywhere');

  const branchId = model.branch(examined, 'look')!;
  const branchGame = await loadGame();
  await branchGame.executeCommand('look');
  await branchGame.executeCommand('examine the brass lamp');
  const alt = await playReal(model, branchGame, 'look');
  model.addContains(alt, 'A small square den');
  model.activateLine(MAIN_LINE);

  const examineCard = card(
    'turn',
    'examine the brass lamp',
    withContains(recordedLog.get(examined), 'gleams dully'),
  );
  examineCard.branches = [
    {
      branch: branchId,
      cards: [card('turn', 'look', withContains(recordedLog.get(alt), 'A small square den'))],
    },
  ];
  const expected: TreeDocument = {
    version: 1,
    story: 'mini',
    seed: 42,
    cards: [
      card('opening', undefined, openingLog.length > 0 ? { channels: openingLog } : undefined),
      card('boot', undefined, recordedLog.get(boot)),
      examineCard,
      card('turn', 'north', withContains(recordedLog.get(north), 'Roses everywhere')),
    ],
  };
  return { model, examined, north, branchId, expected };
}

interface CliRun {
  exitCode: number;
  /** Decoded run-event stream (unknown lines dropped, as the fold does). */
  events: Record<string, unknown>[];
  /** The tab's own fold over the raw stream — the real consumer. */
  state: RunColumnState;
  stdout: string;
}

/** Spawns the REAL CLI with the tab's exact arguments (`--json`), folds the
 *  stream through the tab's real fold, and returns both consumers' views. */
function runCliJson(): CliRun {
  const spawned = spawnSync(
    'node',
    [devkitCli, 'test', storyPath, '--tree', '--capture-output', '--capture-world', '--json'],
    { cwd: projectDir, encoding: 'utf-8', maxBuffer: 256 * 1024 * 1024, timeout: 240_000 },
  );
  expect(spawned.error).toBeUndefined();
  const state = createRunState();
  beginRun(state);
  const events: Record<string, unknown>[] = [];
  for (const line of spawned.stdout.split('\n')) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line) as Record<string, unknown>);
    } catch {
      /* non-event noise stays out of both consumers */
    }
    foldRunLine(state, line);
  }
  finishRun(state, spawned.status === 0);
  return { exitCode: spawned.status ?? -1, events, state, stdout: spawned.stdout };
}

/** Spawns the real CLI without `--json` — the human report the CLI user reads. */
function runCliReport(): { exitCode: number; report: string } {
  const spawned = spawnSync('node', [devkitCli, 'test', storyPath, '--tree'], {
    cwd: projectDir,
    encoding: 'utf-8',
    maxBuffer: 64 * 1024 * 1024,
    timeout: 240_000,
  });
  expect(spawned.error).toBeUndefined();
  return { exitCode: spawned.status ?? -1, report: spawned.stdout };
}

/** The labels the CLI announced, in run order (`transcript-end` files). */
function cliLabels(events: Record<string, unknown>[]): string[] {
  return events.filter((e) => e.type === 'transcript-end').map((e) => e.file as string);
}

/** Every failed assertion message in a folded line's detail. */
function failedMessagesOf(state: RunColumnState, label: string): string[] {
  return (state.results.get(label)?.commands ?? []).flatMap((command) =>
    command.assertions.filter((entry) => !entry.passed).map((entry) => entry.message ?? ''),
  );
}

describe('AC-2 — one document, two consumers (tab-authored suite through the real CLI)', () => {
  it('runs green in the real CLI with identical derived labels, untouched bytes, detail on every card', async () => {
    const { model, branchId, expected } = await buildBase();
    expect(model.serialize()).toBe(serializeTreeDocument(expected));
    writeFileSync(docPath, model.serialize());
    const bytesBefore = readFileSync(docPath, 'utf-8');

    const run = runCliJson();
    expect(run.exitCode).toBe(0);

    // Identical labels: the model's own derived labels ARE the CLI's row keys.
    const tabLabels = [model.labelOf(MAIN_LINE), model.labelOf(branchId)];
    expect(tabLabels).toEqual(['opening-den', 'den · look']);
    expect(cliLabels(run.events)).toEqual(tabLabels);
    expect([...run.state.results.keys()]).toEqual(tabLabels);
    for (const label of tabLabels) expect(run.state.results.get(label)?.status).toBe('passed');
    expect(run.state.tally).toEqual({
      cardsPassed: 5,
      cardsFailed: 0,
      assertionsPassed: 12,
      assertionsFailed: 0,
      errors: 0,
      unreached: 0,
    });

    // The detail view's data (David 2026-08-10): every executed command
    // carries every assertion's verdict, all passing — including the
    // persisted opening claims.
    const mainDetail = run.state.results.get('opening-den')!.commands;
    expect(mainDetail.length).toBeGreaterThanOrEqual(4); // (opening) + boot + 2 turns
    expect(mainDetail.every((command) => command.assertions.length > 0)).toBe(true);
    expect(mainDetail.every((command) => command.assertions.every((entry) => entry.passed))).toBe(
      true,
    );
    const openingDetail = mainDetail.find((command) => command.input === '(opening)')!;
    expect(openingDetail.assertions.map((entry) => entry.description)).toEqual([
      'channel prologue contains "Night falls on the den."',
      'channel info.title is "Mini"',
      'channel info.description is "A small square test story."',
    ]);

    // The run consumed the tab's bytes and wrote nothing back.
    expect(readFileSync(docPath, 'utf-8')).toBe(bytesBefore);

    // The human report shows the same lines by the same labels.
    const { exitCode, report } = runCliReport();
    expect(exitCode).toBe(0);
    expect(report).toContain('✓ opening-den');
    expect(report).toContain('✓ den · look');
    expect(report).toContain('5 cards passing, 12 assertions passing');
  }, 600_000);

  it('a failing claim is cited identically by the tab fold, the stream, and the report', async () => {
    const { model, north } = await buildBase();
    model.addContains(north, 'no roses at all');
    writeFileSync(docPath, model.serialize());

    const run = runCliJson();
    expect(run.exitCode).toBe(1);

    // The one failure message on the wire is THE citation…
    const failedEvents = run.events.filter(
      (e) => e.type === 'command-result' && e.passed === false,
    );
    expect(failedEvents).toHaveLength(1);
    const message = (failedEvents[0].failure ?? failedEvents[0].error) as string;
    expect(message).toContain('no roses at all');

    // …the tab's fold carries it verbatim, with the failing assertion's own
    // detail row alongside the card's passing ones…
    const tabRow = run.state.results.get('opening-den');
    expect(tabRow?.status).toBe('failed');
    expect(tabRow?.firstFailure?.endsWith(message)).toBe(true);
    const failing = failedMessagesOf(run.state, 'opening-den');
    expect(failing.some((entry) => entry.includes('no roses at all'))).toBe(true);
    // …the branch is unaffected and the tally counts lines.
    expect(run.state.results.get('den · look')?.status).toBe('passed');
    expect(run.state.tally).toEqual({
      cardsPassed: 4,
      cardsFailed: 1,
      assertionsPassed: 12,
      assertionsFailed: 1,
      errors: 0,
      unreached: 0,
    });

    // …and the human report cites the same message on the same label.
    const { exitCode, report } = runCliReport();
    expect(exitCode).toBe(1);
    const failLine = report.split('\n').find((line) => line.startsWith('✗ opening-den'));
    expect(failLine).toBeDefined();
    expect(failLine).toContain(message);
    expect(report).toContain('4 cards passing, 12 assertions passing, 1 card failing, 1 assertion failing');
  }, 600_000);
});

describe('AC-2 — the fresh-start session (no header, nothing hand-authored)', () => {
  it('a purely-recorded session persists its truth and runs green in the real CLI', async () => {
    // The fresh-start reality (2026-08-10): tests deleted, tab opened, turns
    // played, nothing hand-authored. Recording persists the platform
    // default's synthesis into the JSON — the document IS complete, and the
    // CLI agrees without assuming anything.
    const model = new TreeSessionModel('mini', 42);
    const game = await loadGame();
    await playReal(model, game, 'look', true);
    await playReal(model, game, 'examine the brass lamp');
    await playReal(model, game, 'north');
    const text = model.serialize();
    writeFileSync(docPath, text);

    // The JSON carries the recorded truth — visibly.
    expect(text).toContain('"assertions"');
    expect(text).toContain('"channels"');

    const run = runCliJson();
    expect(run.exitCode).toBe(0);
    expect(cliLabels(run.events)).toEqual(['opening-den']);
    expect(run.state.results.get('opening-den')?.status).toBe('passed');
    expect(run.state.tally).toEqual({
      cardsPassed: 3,
      cardsFailed: 0,
      assertionsPassed: 7,
      assertionsFailed: 0,
      errors: 0,
      unreached: 0,
    });
    expect(run.stdout).not.toContain('has no assertion');
  }, 600_000);
});

describe('AC-3 — each gesture, then a whole-path replay through the real CLI', () => {
  it('branch: the fork lands exactly as specified and both lines replay green', async () => {
    const { model, expected } = await buildBase();
    expect(model.serialize()).toBe(serializeTreeDocument(expected));

    writeFileSync(docPath, model.serialize());
    const run = runCliJson();
    expect(run.exitCode).toBe(0);
    expect(cliLabels(run.events)).toEqual(['opening-den', 'den · look']);
    for (const result of run.state.results.values()) expect(result.status).toBe('passed');
  }, 600_000);

  it('tail-cut: the card leaves, descendants and nothing else; the tree replays green', async () => {
    const { model, north, expected } = await buildBase();
    expect(model.tailCut(north)).toEqual({ lineId: MAIN_LINE, activeSurvived: true });

    // Exactly the base tree minus the north card — the branch is intact.
    expected.cards.pop();
    expect(model.serialize()).toBe(serializeTreeDocument(expected));

    writeFileSync(docPath, model.serialize());
    const run = runCliJson();
    expect(run.exitCode).toBe(0);
    expect(cliLabels(run.events)).toEqual(['opening-den', 'den · look']);
    for (const result of run.state.results.values()) expect(result.status).toBe('passed');
  }, 600_000);

  it('splice-in: one bare turn lands at the seam; the whole-path replay fills it; the run fails THAT seam, the branch passes', async () => {
    const { model, examined, expected } = await buildBase();
    expect(model.spliceIn(examined, 'north')).toBe(true);

    // Exactly the base tree with one BARE `north` after the examine card —
    // the spliced turn was never played, and the JSON says so.
    const bare = JSON.parse(JSON.stringify(expected)) as TreeDocument;
    bare.cards.splice(3, 0, { type: 'turn', command: 'north' });
    expect(model.serialize()).toBe(serializeTreeDocument(bare));

    // The whole-path replay (real commands, real engine) binds the repaired
    // stream back onto the board and FILLS the spliced card's void with its
    // recorded truth.
    model.beginRebindAll();
    const rebindGame = await loadGame();
    await playReal(model, rebindGame, 'look', true);
    await playReal(model, rebindGame, 'examine the brass lamp');
    const splicedOrdinal = await playReal(model, rebindGame, 'north');
    await playReal(model, rebindGame, 'north');
    expect(model.cardAt(splicedOrdinal)?.command).toBe('north');
    const filled = JSON.parse(JSON.stringify(bare)) as TreeDocument;
    filled.cards[3] = card('turn', 'north', recordedLog.get(splicedOrdinal));
    expect(model.serialize()).toBe(serializeTreeDocument(filled));

    writeFileSync(docPath, model.serialize());
    const run = runCliJson();
    expect(run.exitCode).toBe(1);

    // The seam is the downstream card's claim, cited in the detail — never
    // corruption; the branch (forked before the seam) still passes.
    const tabRow = run.state.results.get('opening-den');
    expect(tabRow?.status).toBe('failed');
    const failing = failedMessagesOf(run.state, 'opening-den');
    expect(failing.some((entry) => entry.includes('Roses everywhere'))).toBe(true);
    expect(run.state.results.get('den · look')?.status).toBe('passed');

    // No lost nodes: what the CLI read back is still the exact filled tree.
    expect(readFileSync(docPath, 'utf-8')).toBe(serializeTreeDocument(filled));
  }, 600_000);

  it('splice-out: removing the spliced turn restores the tree byte-identically and it replays green', async () => {
    const { model, examined } = await buildBase();
    const beforeSplice = model.serialize();
    expect(model.spliceIn(examined, 'north')).toBe(true);

    model.beginRebindAll();
    const rebindGame = await loadGame();
    await playReal(model, rebindGame, 'look', true);
    await playReal(model, rebindGame, 'examine the brass lamp');
    const splicedOrdinal = await playReal(model, rebindGame, 'north');
    await playReal(model, rebindGame, 'north');
    expect(model.cardAt(splicedOrdinal)?.command).toBe('north');

    expect(model.spliceOut(splicedOrdinal)).toBe(true);
    expect(model.serialize()).toBe(beforeSplice);

    writeFileSync(docPath, model.serialize());
    const run = runCliJson();
    expect(run.exitCode).toBe(0);
    expect(cliLabels(run.events)).toEqual(['opening-den', 'den · look']);
    for (const result of run.state.results.values()) expect(result.status).toBe('passed');
  }, 600_000);
});
