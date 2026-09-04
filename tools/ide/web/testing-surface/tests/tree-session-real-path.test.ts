/**
 * tree-session-real-path.test.ts — the tree-session model against the REAL
 * platform (rule 13a, the Phase 3 exit bar): a real chord compile →
 * bootstrap → engine session at the pinned seed drives the model exactly as
 * the tab's feed does, and the produced document must (a) match the Phase 1
 * schema byte-for-byte through the shared reader, and (b) run green through
 * branch-tester's real tree-walker with identical derived labels — the
 * one-document-two-consumers contract (AC-2) at model level.
 *
 * Also real here: the opening defaults' whole chain (prologue, title,
 * description — open question D) from real boot captures, and the D4 splice
 * seam — a structural repair followed by a whole-path replay surfaces an
 * invalidated downstream claim as that turn's failed assertion, never a
 * crash, while the branch keeps passing.
 *
 * The compiled platform packages are loaded via createRequire (dist), so
 * this exercises the production code path, not a vitest-aliased shadow.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { proseTextLinesOf } from '@sharpee/branch-tester/auto-assertion';
import { deserializeTreeDocument } from '@sharpee/branch-tester/tree-document';
import { openingDefaultClaims, recordedTurnAssertions } from '../src/compose';
import { MAIN_LINE, TreeSessionModel } from '../src/model';

const requireCompiled = createRequire(import.meta.url);
const { loadAuthorGame } = requireCompiled(
  '../../../../../packages/devkit/dist/standalone/author-game.js',
) as {
  loadAuthorGame: (
    target: string,
    opts?: { seed?: number; channels?: string[] },
  ) => Promise<RealGame>;
};
const { runTreeDocument } = requireCompiled(
  '../../../../../packages/branch-tester/dist/index.js',
) as {
  runTreeDocument: (
    document: unknown,
    loadGame: () => Promise<RealGame>,
    options?: Record<string, unknown>,
  ) => Promise<{
    lines: {
      id: string;
      label: string;
      status: string;
      result?: {
        commands: {
          command: { input: string };
          passed: boolean;
          failure?: string;
          assertionResults?: { passed: boolean; message?: string }[];
        }[];
      };
    }[];
    defects: unknown[];
  }>;
};

/** The compiled game surface this test drives (bootstrap's assembled game). */
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
  auto-assertion: room-name-and-description

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

const CHANNELS = ['room-name', 'room-description', 'info', 'prologue'];

/** The story's declared policy — what RECORDING persists (David 2026-08-10:
 *  the JSON is the source of truth; runs read only the document). */
const POLICY = 'room-name-and-description' as const;
let projectDir: string;

const loadGame = (): Promise<RealGame> =>
  loadAuthorGame(projectDir, { seed: 42, channels: CHANNELS });

beforeAll(() => {
  projectDir = mkdtempSync(join(tmpdir(), 'surface-tree-real-'));
  writeFileSync(join(projectDir, 'mini.story'), STORY);
});

afterAll(() => rmSync(projectDir, { recursive: true, force: true }));

/** Executes a command on the real game and folds it into the model the way
 *  the tab's feed does: output + room from the real captures, and RECORDED
 *  assertions persisted into the card (the JSON is the source of truth). */
let ordinal = 0;
async function playReal(
  model: TreeSessionModel,
  game: RealGame,
  command: string,
  boot = false,
): Promise<number> {
  const output = String(await game.executeCommand(command));
  ordinal += 1;
  const room = proseTextLinesOf(game.lastChannelValues?.['room-name']).at(-1);
  const recorded = recordedTurnAssertions(POLICY, {
    output,
    ...(game.lastChannelValues !== undefined ? { channelValues: game.lastChannelValues } : {}),
  });
  const openingClaims = boot
    ? openingDefaultClaims(POLICY, {
        ...(game.lastChannelValues ?? {}),
        ...(game.bootChannelValues ?? {}),
      })
    : [];
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

describe('a real play session produces the document, and the real walker consumes it', () => {
  it('records, branches, labels, round-trips, and runs green through the real CLI walker', async () => {
    const model = new TreeSessionModel('mini', 42);
    const game = await loadGame();

    // The session as the tab plays it: boot look, examine (with a claim),
    // north (with a claim).
    const bootLook = await playReal(model, game, 'look', true);
    // The boot flush (banner, prologue, info) rides the boot look's turn
    // captures on the real engine — exactly what the tab's boot record
    // carries.
    const bootCaptures = {
      ...(game.lastChannelValues ?? {}),
      ...(game.bootChannelValues ?? {}),
    };
    const examined = await playReal(model, game, 'examine the brass lamp');
    model.addContains(examined, 'gleams dully');
    await playReal(model, game, 'north');

    // The opening defaults' REAL chain (question D): prologue, title,
    // description straight from the real boot captures.
    expect(openingDefaultClaims('room-name-and-description', bootCaptures)).toEqual([
      { id: 'prologue', contains: ['Night falls on the den.'] },
      { id: 'info.title', is: 'Mini' },
      { id: 'info.description', is: 'A small square test story.' },
    ]);

    // Branch on the examine card with an alternate `look`: fresh boot,
    // prefix replayed suppressed (no model folds), alternate lands live.
    const branchId = model.branch(examined, 'look')!;
    expect(branchId).toBeGreaterThan(0);
    const branchGame = await loadGame();
    await branchGame.executeCommand('look');
    await branchGame.executeCommand('examine the brass lamp');
    const alt = await playReal(model, branchGame, 'look');
    model.addContains(alt, 'A small square den');

    expect(model.labelOf(MAIN_LINE)).toBe('opening-den');
    expect(model.labelOf(branchId)).toBe('den · look');
    expect(model.cardAt(bootLook)?.type).toBe('boot');

    // The document matches the Phase 1 schema and round-trips (AC-1).
    const text = model.serialize();
    const read = deserializeTreeDocument(text);
    expect(read.status).toBe('ok');

    // One document, two consumers (AC-2 at model level): the real walker
    // runs the tab's document green with IDENTICAL derived labels.
    const run = await runTreeDocument(JSON.parse(text), loadGame);
    expect(run.defects).toEqual([]);
    expect(run.lines.map((line) => [line.label, line.status])).toEqual([
      ['opening-den', 'passed'],
      ['den · look', 'passed'],
    ]);
  }, 120_000);

  it('a splice repair replays whole: the replay fills the spliced card, the seam is a failed claim, the branch still passes (D4)', async () => {
    const model = new TreeSessionModel('mini', 42);
    const game = await loadGame();
    await playReal(model, game, 'look', true);
    const examined = await playReal(model, game, 'examine the brass lamp');
    const north = await playReal(model, game, 'north');
    model.addContains(north, 'Roses everywhere');
    const branchId = model.branch(examined, 'look')!;
    const branchGame = await loadGame();
    await branchGame.executeCommand('look');
    await branchGame.executeCommand('examine the brass lamp');
    const alt = await playReal(model, branchGame, 'look');
    model.addContains(alt, 'A small square den');
    model.activateLine(MAIN_LINE);
    const beforeSplice = model.serialize();

    // The repair: splice an extra `north` in after the examine. The spliced
    // card was never played — it has NO truth yet (the JSON says so) — and
    // the whole-path replay is where its truth records (void-fill).
    expect(model.spliceIn(examined, 'north')).toBe(true);
    expect(model.serialize()).toContain('"command": "north"');

    model.beginRebindAll();
    ordinal += 10;
    const rebindGame = await loadGame();
    await playReal(model, rebindGame, 'look', true);
    await playReal(model, rebindGame, 'examine the brass lamp');
    const splicedOrdinal = await playReal(model, rebindGame, 'north');
    await playReal(model, rebindGame, 'north');
    expect(model.cardAt(splicedOrdinal)?.command).toBe('north');
    // The replay filled the spliced card with its recorded claims.
    expect(model.cardAt(splicedOrdinal)?.assertions).toBeDefined();

    // The walker now surfaces the SEAM: the downstream card's recorded and
    // authored claims run from the wrong room and fail — never a crash —
    // while the branch (forked before the seam) still passes.
    const spliced = await runTreeDocument(JSON.parse(model.serialize()), loadGame);
    expect(spliced.defects).toEqual([]);
    const main = spliced.lines.find((line) => line.id === 'main')!;
    expect(main.status).toBe('failed');
    const failedRows = main.result!.commands.filter((row) => !row.passed);
    expect(failedRows.length).toBeGreaterThan(0);
    const failedMessages = failedRows.flatMap((row) =>
      (row.assertionResults ?? [])
        .filter((entry) => !entry.passed)
        .map((entry) => entry.message ?? ''),
    );
    expect(failedMessages.some((message) => message.includes('Roses everywhere'))).toBe(true);
    expect(spliced.lines.find((line) => line.id !== 'main')!.status).toBe('passed');

    // Splice-out by the bound ordinal restores the tree byte-identically —
    // and the walker runs it green again.
    expect(model.spliceOut(splicedOrdinal)).toBe(true);
    expect(model.serialize()).toBe(beforeSplice);
    const repaired = await runTreeDocument(JSON.parse(model.serialize()), loadGame);
    expect(repaired.lines.map((line) => line.status)).toEqual(['passed', 'passed']);
    expect(model.lineIds().includes(branchId)).toBe(true);
  }, 180_000);

  it('tail-cut leaves a document the walker still runs clean (D4/Q-4)', async () => {
    const model = new TreeSessionModel('mini', 42);
    const game = await loadGame();
    await playReal(model, game, 'look', true);
    const examined = await playReal(model, game, 'examine the brass lamp');
    const north = await playReal(model, game, 'north');
    model.addContains(north, 'nowhere to be seen');   // a claim that would fail

    expect(model.tailCut(north)).toEqual({ lineId: MAIN_LINE, activeSurvived: true });
    expect(model.cardAt(examined)).toBeDefined();

    const run = await runTreeDocument(JSON.parse(model.serialize()), loadGame);
    expect(run.lines.map((line) => [line.label, line.status])).toEqual([
      ['opening-den', 'passed'],
    ]);
  }, 120_000);
});
