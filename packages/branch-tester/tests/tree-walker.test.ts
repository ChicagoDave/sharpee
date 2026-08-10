/**
 * tree-walker.test.ts — ADR-307 D4/D5/D6: the tree document runs as lines,
 * branches replay their prefix from a fresh boot, seams never block, and
 * execution errors do.
 *
 * The engine is a stub of the *engine*, not of the walk: `runTreeDocument`,
 * `flattenTreeLines`, transcript synthesis and `runTranscript` are the real
 * ones. The stub records every command with the state token it ran against,
 * so "which state did this branch start from?" is answerable, and counts
 * boots so replay is observable rather than inferred.
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { describe, expect, it } from 'vitest';
import {
  emptyTreeDocument,
  TreeCard,
  TreeDocument,
} from '../src/tree-document.js';
import {
  flattenTreeLines,
  formatTreeDocumentRun,
  runTreeDocument,
} from '../src/tree-walker.js';

// ---------------------------------------------------------------------------
// Document builders
// ---------------------------------------------------------------------------

const opening = (assertions?: TreeCard['assertions']): TreeCard => ({
  type: 'opening',
  ...(assertions !== undefined ? { assertions } : {}),
});
const boot = (assertions?: TreeCard['assertions']): TreeCard => ({
  type: 'boot',
  ...(assertions !== undefined ? { assertions } : {}),
});
const turn = (command: string, extra?: Partial<TreeCard>): TreeCard => ({
  type: 'turn',
  command,
  ...extra,
});
/** A turn whose claim always holds against the stub's `did <command>` output. */
const okTurn = (command: string, extra?: Partial<TreeCard>): TreeCard =>
  turn(command, { assertions: { contains: [`did ${command}`] }, ...extra });
/** A boot card whose claim holds. The JSON is the source of truth (David
 *  2026-08-10): a bare card fails the assertion boundary, so every card
 *  these tests expect to pass carries its claim in the document. */
const okBoot = (): TreeCard => boot({ contains: ['did look'] });

const doc = (cards: TreeCard[]): TreeDocument => ({
  ...emptyTreeDocument('teststory', 42),
  cards,
});

// ---------------------------------------------------------------------------
// Stub harness
// ---------------------------------------------------------------------------

interface StubOptions {
  /** command → thrown error message, every execution. */
  throwOn?: Record<string, string>;
  /** command → thrown error message, but only from the SECOND boot on. */
  throwOnReplay?: Record<string, string>;
  /** command → room name the player is in after it executes. */
  movesTo?: Record<string, string>;
  /** The story's `auto-assertion:` policy, read off the game by the runner. */
  policy?: 'all-emitted-text';
  /** Per-command structured channel captures (`lastChannelValues`). */
  channelValues?: Record<string, unknown[]>;
}

/**
 * A stub harness: a loader plus the recorders every boot writes into. Each
 * boot is a fresh game whose state token starts at `fresh`; executing moves
 * the token on, so a replayed prefix is distinguishable from a continued one.
 * The world reports a room name so derived labels are real, not fallbacks.
 */
function stubHarness(options: StubOptions = {}) {
  const executed: Array<{ command: string; from: string; boot: number }> = [];
  const counters = { boots: 0 };

  const makeGame = (bootNumber: number) => {
    let token = 'fresh';
    let room = 'Iron Gates';
    const world = {
      getPlayer: () => ({ id: 'player' }),
      getLocation: () => 'room-1',
      getEntity: () => ({ id: 'room-1', name: room }),
      getContents: () => [],
    };
    return {
      executeCommand: async (command: string) => {
        executed.push({ command, from: token, boot: bootNumber });
        token = `${token}+${command}`;
        const thrown =
          options.throwOn?.[command] ??
          (bootNumber > 1 ? options.throwOnReplay?.[command] : undefined);
        if (thrown !== undefined) throw new Error(thrown);
        const moved = options.movesTo?.[command];
        if (moved !== undefined) room = moved;
        return `did ${command}`;
      },
      world,
      bootChannelValues: { banner: ['Fernhill Manor'] },
      ...(options.channelValues !== undefined ? { lastChannelValues: options.channelValues } : {}),
      ...(options.policy !== undefined ? { autoAssertionPolicy: options.policy } : {}),
    };
  };

  return {
    executed,
    counters,
    load: async () => {
      counters.boots += 1;
      return makeGame(counters.boots);
    },
  };
}

const commandsOf = (harness: ReturnType<typeof stubHarness>) =>
  harness.executed.map((e) => e.command);

// ---------------------------------------------------------------------------
// flattenTreeLines
// ---------------------------------------------------------------------------

describe('flattenTreeLines — lines, prefixes, defects', () => {
  it('cuts a branched document into main-then-branches with verbatim prefixes', () => {
    const document = doc([
      opening(),
      boot(),
      okTurn('north'),
      okTurn('north', { branches: [{ branch: 3, cards: [okTurn('east')] }] }),
      okTurn('north'),
    ]);

    const { lines, defects } = flattenTreeLines(document);
    expect(defects).toEqual([]);
    expect(lines.map((l) => l.id)).toEqual(['main', 'main/b3']);

    const branch = lines[1];
    // The prefix is the exact stream the main line executed through the fork
    // card: the boot look, then both norths — the third north is after the
    // fork and is not in it.
    expect(branch.prefix).toEqual(['look', 'north', 'north']);
    expect(branch.forkIndex).toBe(3);
    expect(branch.parentId).toBe('main');
    expect(branch.firstCommand).toBe('east');
  });

  it('orders nested branches depth-first in fork order', () => {
    const document = doc([
      boot(),
      okTurn('a', {
        branches: [
          {
            branch: 1,
            cards: [okTurn('b', { branches: [{ branch: 2, cards: [okTurn('c')] }] })],
          },
        ],
      }),
      okTurn('d', { branches: [{ branch: 5, cards: [okTurn('e')] }] }),
    ]);

    const { lines } = flattenTreeLines(document);
    expect(lines.map((l) => l.id)).toEqual(['main', 'main/b1', 'main/b1/b2', 'main/b5']);
    // The nested branch's prefix threads through its parent branch's cards.
    expect(lines[2].prefix).toEqual(['look', 'a', 'b']);
  });

  it('reports opening/boot cards outside the main line head as defects', () => {
    const document = doc([
      boot(),
      okTurn('north', { branches: [{ branch: 1, cards: [boot(), okTurn('east')] }] }),
      opening(),
    ]);

    const { defects } = flattenTreeLines(document);
    expect(defects).toHaveLength(2);
    expect(defects[0].message).toContain(`'boot' card`);
    expect(defects[1].message).toContain(`'opening' card`);
  });
});

// ---------------------------------------------------------------------------
// runTreeDocument
// ---------------------------------------------------------------------------

describe('runTreeDocument — replay, labels, seams, blocking (ADR-307 D4/D5)', () => {
  it('runs a linear document once, with no replay share', async () => {
    const harness = stubHarness();
    const run = await runTreeDocument(
      doc([opening({ contains: ["Fernhill Manor"] }), okBoot(), okTurn("north"), okTurn("take lamp")]),
      harness.load,
    );

    expect(harness.counters.boots).toBe(1);
    expect(commandsOf(harness)).toEqual(['look', 'north', 'take lamp']);
    expect(run.lines).toHaveLength(1);
    expect(run.lines[0].status).toBe('passed');
    expect(run.lines[0].label).toBe('opening-iron-gates');
    expect(run.lines[0].turnCount).toBe(2);
    // The opening claim read the boot channel captures (banner).
    expect(run.lines[0].result?.commands.some((r) => r.command.input === '(opening)' && r.passed)).toBe(true);
    expect(run.executedCommands).toBe(3);
    expect(run.authoredCommands).toBe(3);
  });

  it('boots a branch fresh, replays its prefix verbatim, and labels it fork-room · command', async () => {
    const harness = stubHarness({ movesTo: { north: 'Gravel Drive' } });
    const run = await runTreeDocument(
      doc([
        okBoot(),
        okTurn('north', { branches: [{ branch: 1, cards: [okTurn('east')] }] }),
        okTurn('north'),
      ]),
      harness.load,
    );

    expect(harness.counters.boots).toBe(2);
    // Main line continuous, then the branch's fresh boot replays look+north
    // before its own east.
    expect(commandsOf(harness)).toEqual(['look', 'north', 'north', 'look', 'north', 'east']);
    // The branch's own first command ran against exactly the replayed state.
    const east = harness.executed.find((e) => e.command === 'east')!;
    expect(east.from).toBe('fresh+look+north');
    expect(east.boot).toBe(2);

    expect(run.lines.map((l) => [l.id, l.status, l.label])).toEqual([
      ['main', 'passed', 'opening-iron-gates'],
      ['main/b1', 'passed', 'gravel-drive · east'],
    ]);
    // 6 executed = 4 authored (boot look + 3 turns) + 2 replayed.
    expect(run.executedCommands).toBe(6);
    expect(run.authoredCommands).toBe(4);
  });

  it('D4 — a failed assertion is a seam: the line fails, descendants still run', async () => {
    const harness = stubHarness();
    const run = await runTreeDocument(
      doc([
        okBoot(),
        turn('north', {
          assertions: { contains: ['prose the story no longer says'] },
          branches: [{ branch: 1, cards: [okTurn('east')] }],
        }),
        okTurn('north'),
      ]),
      harness.load,
    );

    const [main, branch] = run.lines;
    expect(main.status).toBe('failed');
    expect(branch.status).toBe('passed');
    // The branch really ran — its command reached the engine.
    expect(commandsOf(harness)).toContain('east');
  });

  it('D13 — an execution error blocks lines forking at or after it, names the origin, and never boots them', async () => {
    const harness = stubHarness({ throwOn: { explode: 'engine died' } });
    const run = await runTreeDocument(
      doc([
        okBoot(),
        okTurn('north', { branches: [{ branch: 1, cards: [okTurn('east')] }] }),
        turn('explode', { skip: true, branches: [{ branch: 2, cards: [okTurn('west')] }] }),
        okTurn('south', { branches: [{ branch: 3, cards: [okTurn('up')] }] }),
      ]),
      harness.load,
    );

    const byId = new Map(run.lines.map((l) => [l.id, l]));
    expect(byId.get('main')!.status).toBe('failed');
    // Forked before the error: runs.
    expect(byId.get('main/b1')!.status).toBe('passed');
    // Forked on and after the error card: blocked, origin named, never booted.
    expect(byId.get('main/b2')!.status).toBe('blocked');
    expect(byId.get('main/b2')!.blockedBy).toBe('main');
    expect(byId.get('main/b3')!.status).toBe('blocked');
    expect(commandsOf(harness)).not.toContain('west');
    expect(commandsOf(harness)).not.toContain('up');
    // 2 boots: main + the one branch that could run.
    expect(harness.counters.boots).toBe(2);
  });

  it('a replay that diverges reports error, not a crash', async () => {
    const harness = stubHarness({ throwOnReplay: { north: 'nondeterminism!' } });
    const run = await runTreeDocument(
      doc([
        okBoot(),
        okTurn('north', { branches: [{ branch: 1, cards: [okTurn('east')] }] }),
      ]),
      harness.load,
    );

    const branch = run.lines[1];
    expect(branch.status).toBe('error');
    expect(branch.error).toContain('not reproducible');
    // The branch's own cards never ran.
    expect(commandsOf(harness)).not.toContain('east');
  });

  it('skip cards execute without asserting; the JSON is the whole truth', async () => {
    const harness = stubHarness();
    const run = await runTreeDocument(
      doc([okBoot(), turn('north', { skip: true }), okTurn('east')]),
      harness.load,
    );

    const rows = run.lines[0].result!.commands;
    expect(commandsOf(harness)).toEqual(['look', 'north', 'east']);
    expect(rows.find((r) => r.command.input === 'north')!.skipped).toBe(true);
    expect(rows.find((r) => r.command.input === 'east')!.passed).toBe(true);
    expect(run.lines[0].status).toBe('passed');
  });

  it('a bare card is the assertion-boundary failure and blocks later forks (JSON = source of truth, David 2026-08-10)', async () => {
    const harness = stubHarness();
    const run = await runTreeDocument(
      doc([
        okBoot(),
        turn('north'),
        okTurn('south', { branches: [{ branch: 1, cards: [okTurn('west')] }] }),
      ]),
      harness.load,
    );

    expect(run.lines[0].status).toBe('failed');
    // The boundary stops the run BEFORE executing the bare command; the
    // fork on `south` sits on state the run never validly reached.
    expect(run.lines[1].status).toBe('blocked');
    expect(commandsOf(harness)).toEqual(['look']);
  });

  it('a DECLARED policy synthesizes nothing at run time — recording persisted, running reads (David 2026-08-10)', async () => {
    // The engine declares `all-emitted-text`, and the walker still clears it:
    // the bare card fails the boundary rather than inventing an assertion.
    const harness = stubHarness({ policy: 'all-emitted-text' });
    const run = await runTreeDocument(doc([okBoot(), turn('north')]), harness.load);

    expect(run.lines[0].status).toBe('failed');
    const north = run.lines[0].result!.commands.find((r) => r.command.input === 'north')!;
    expect(north.passed).toBe(false);
    expect(north.error).toContain('has no assertion');
  });

  it('card-position defects run nothing', async () => {
    const harness = stubHarness();
    const run = await runTreeDocument(
      doc([okTurn('north'), boot()]),
      harness.load,
    );

    expect(run.defects).toHaveLength(1);
    expect(run.lines).toEqual([]);
    expect(harness.counters.boots).toBe(0);
    expect(commandsOf(harness)).toEqual([]);
  });

  it('channel claims read the structured captures — pass and fail both grounded', async () => {
    const harness = stubHarness({ channelValues: { score: ['42 points'] } });
    const run = await runTreeDocument(
      doc([
        okBoot(),
        turn('north', {
          assertions: { channels: [{ id: 'score', contains: ['42 points'] }] },
        }),
        turn('east', {
          assertions: { channels: [{ id: 'score', is: 'something else' }] },
        }),
      ]),
      harness.load,
    );

    const rows = run.lines[0].result!.commands;
    expect(rows.find((r) => r.command.input === 'north')!.passed).toBe(true);
    // The `is` claim really compared against the capture — it failed, and the
    // failure names the channel.
    const east = rows.find((r) => r.command.input === 'east')!;
    expect(east.passed).toBe(false);
    expect(east.failure).toContain('score');
    expect(run.lines[0].status).toBe('failed');
  });

  it('exact supersedes the contains family', async () => {
    const harness = stubHarness();
    const run = await runTreeDocument(
      doc([
        okBoot(),
        turn('north', {
          assertions: { exact: ['did north'], contains: ['never evaluated, would fail'] },
        }),
      ]),
      harness.load,
    );
    expect(run.lines[0].status).toBe('passed');
  });
});

// ---------------------------------------------------------------------------
// formatTreeDocumentRun
// ---------------------------------------------------------------------------

describe('formatTreeDocumentRun — rows, tally, replay share', () => {
  it('renders one row per line, the tally, and the replay share', async () => {
    const harness = stubHarness({ movesTo: { north: 'Gravel Drive' } });
    const run = await runTreeDocument(
      doc([
        okBoot(),
        okTurn('north', {
          branches: [{ branch: 1, cards: [turn('east', { assertions: { contains: ['nope'] } })] }],
        }),
      ]),
      harness.load,
    );

    const rows = formatTreeDocumentRun(run);
    // Count-free rows: turns have no meaning unless the author gives them
    // meaning (David 2026-08-10).
    expect(rows[0]).toBe('✓ opening-iron-gates');
    expect(rows[1]).toContain('✗ gravel-drive · east — east:');
    // Every assertion counts (David 2026-08-10): main's look + north pass
    // one claim each; the branch's east fails its one claim.
    expect(rows[2]).toBe('2 cards passing, 2 assertions passing, 1 card failing, 1 assertion failing');
    // 4 executed (look, north, look, north... plus east = 5) — replay share shown.
    expect(rows[3]).toBe(`${run.executedCommands} commands (${run.authoredCommands} authored + ${run.executedCommands - run.authoredCommands} replayed)`);
  });

  it('renders defects alone when nothing ran', () => {
    const rows = formatTreeDocumentRun({
      lines: [],
      defects: [{ path: 'cards[1]', message: 'x' }],
      executedCommands: 0,
      authoredCommands: 0,
    });
    expect(rows[0]).toContain('malformed');
    expect(rows[1]).toContain('cards[1]');
  });
});
