/**
 * Structural pin for ADR-379 D2 (the one-home rule), traversal instance
 * (ADR-379 AC-4; ADR-378 D0): no source file under `packages/` reads a
 * room's raw exits or the `exit.*` derived keys except the traversal home
 * and the readers enumerated here, each with what it reads and why. A new
 * reader is either moved onto `TraversalBehavior` or added to this list
 * with its reason, never admitted silently. The template every later
 * system copies.
 *
 * Enumerated 2026-10-19 (session b86789, David: "2 be thorough"): the scan's
 * first run found two more hand copies of the rule than ADR-379's Context
 * table had counted; they are listed as COPIES for GH #601, not blessed.
 */

import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const PACKAGES = path.resolve(__dirname, '../../../..');
const HOME = 'world-model/src/world/TraversalBehavior.ts';

type Role =
  | 'home'            // the system's one answer
  | 'data'            // the trait the home reads, and its accessors
  | 'consumer'        // reads the home (or is the slice that will)
  | 'copy'            // re-implements the rule — a defect with an issue
  | 'lister'          // enumerates exits for a list or a graph, decides no traversal
  | 'writer'          // writes exits; never decides traversal
  | 'key-reader';     // reads an exit.* key for its text, not for traversal

/**
 * Files that may touch the raw data, with what each reads and why. Paths
 * are relative to `packages/`. A `copy` entry names its issue.
 */
const ALLOWED_READERS: Record<string, { role: Role; reads: string; why: string }> = {
  [HOME]: { role: 'home', reads: 'RoomTrait.exits, blockedExits, the exit.* keys', why: 'ADR-379 D3: the home' },
  'world-model/src/traits/room/roomTrait.ts': { role: 'data', reads: 'declares exits and blockedExits', why: 'the data' },
  'world-model/src/traits/room/roomBehavior.ts': { role: 'data', reads: 'getExit, setExit, isExitBlocked, getAllExits, computed-exit lookup', why: 'the accessors the home calls; static accessors, no live gate' },
  'world-model/src/world/WorldModel.ts': { role: 'writer', reads: 'connectRooms writes exits; the BFS path-finder walks them for findPath', why: 'writing is construction; the path-finder is a lister (ADR-378 AC-0 names it)' },
  // going, climbing and pushing read the home (ADR-378 Slice 4, 2026-10-19):
  // no raw read remains in them, so they are not listed.
  'stdlib/src/actions/base/snapshot-utils.ts': { role: 'lister', reads: 'exits by direction into a room snapshot for event data', why: 'event payload, decides no traversal' },
  'stdlib/src/actions/helpers/exit-legality.ts': { role: 'copy', reads: 'hasTraversableExit: blocked key, getExit, the door lock', why: 'COPY of the rule (its header says so); GH #601 — onto wayFor' },
  'stdlib/src/actions/standard/steering/steering.ts': { role: 'key-reader', reads: 'exitMessageKey(expanse, side) for an expanse edge\'s phrase', why: 'ADR-376 D8: the edge borrows the message key for its text' },
  'stdlib/src/actions/standard/setting-course/setting-course.ts': { role: 'key-reader', reads: 'exitMessageKey(expanse, side) for an expanse edge\'s phrase', why: 'ADR-376 D8: the edge borrows the message key for its text' },
  'stdlib/src/npc/npc-service.ts': { role: 'copy', reads: 'getExitsFromRoom: RoomTrait.exits plus allowed/forbidden rooms', why: 'COPY — walks through closed doors and blocked exits; GH #601 — onto wayFor' },
  'story-loader/src/runtime/derived.ts': { role: 'writer', reads: 'registers the exit.blocked.* and exit.message.* evaluators the home reads', why: 'ADR-240 D2: the registrar' },
  'story-loader/src/loader.ts': { role: 'writer', reads: 'wires IR exits through connectRooms; reads RoomTrait.exits only to find a door\'s reverse while wiring', why: 'construction' },
  'story-loader/src/evaluator.ts': { role: 'copy', reads: 'adjacentRooms: blocked key, getExit, the door lock, a computed draw', why: 'COPY for `move … to a random adjacent room` (ADR-326); GH #601 — onto wayFor' },
  'character/src/goals/goal-sub-step.ts': { role: 'lister', reads: 'builds a room graph from RoomTrait.exits for seeking; exitDirectionTo', why: 'a graph for the character\'s plan; the move itself runs the real going action (ADR-328 D5), where the home gates it' },
  'branch-tester/src/claims/claim-candidates.ts': { role: 'lister', reads: 'exitsOf(room) to emit `go <direction>` candidates', why: 'a candidate list, decides no traversal' },
  'event-processor/src/effects/effect-processor.ts': { role: 'writer', reads: 'applyUpdateExitsEffect writes exits from an effect', why: 'ADR-075 effect; construction at runtime' },
  'engine/src/sound/propagation.ts': { role: 'lister', reads: 'acoustic edges from exits, a door\'s state as a cost', why: 'ADR-379 D7: a candidate reader of the home, unscheduled' },
  'bootstrap/src/introspect.ts': { role: 'lister', reads: 'Object.keys(room.exits) for the project tree', why: 'IDE lint data, decides no traversal' },
};

/**
 * A file is scanned for raw reads only when it handles the world's room
 * data at all (RoomTrait, RoomBehavior, TraitType.ROOM) or names a key.
 * Chord's AST and IR, world-index's IR rooms and the transcript formatter
 * also have `exits` fields; those are not the world's exits.
 */
const HANDLES_ROOM_DATA = /RoomTrait|RoomBehavior|TraitType\.ROOM|exit(Blocked|Hidden|Message)Key|exit\.(blocked|hidden|message)\./;
const RAW_READS = [/\.exits\b/, /\.blockedExits\b/, /\bexit\.blocked\./, /\bexit\.hidden\./, /\bexit\.message\./, /exitBlockedKey\(/, /exitHiddenKey\(/, /exitMessageKey\(/];

/**
 * Packages outside the scan: the Chord compiler is browser-safe and never
 * touches the world (ADR-210); its AST and IR `exits` are the author's
 * lines, and its diagnostics name `RoomTrait` in prose.
 */
const OUTSIDE_THE_WORLD = new Set(['chord']);

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'dist-esm' || entry.name === '_archive') continue;
    if (dir === PACKAGES && OUTSIDE_THE_WORLD.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (dir === PACKAGES || entry.name === 'src' || full.includes('/src/')) sourceFiles(full, out);
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts') && !/\.test\.ts$|\.spec\.ts$/.test(entry.name) && full.includes('/src/')) {
      out.push(full);
    }
  }
  return out;
}

function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

describe('traversal has one home (ADR-379 D2, AC-4)', () => {
  const files = sourceFiles(PACKAGES);

  test('the scan sees the platform (sanity: the home and going are among the files)', () => {
    const relative = files.map((f) => path.relative(PACKAGES, f));
    expect(relative).toContain(HOME);
    expect(relative).toContain('stdlib/src/actions/standard/going/going.ts');
  });

  test('no source outside the enumerated readers touches a room\'s raw exits or the exit.* keys', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const relative = path.relative(PACKAGES, file);
      if (relative in ALLOWED_READERS) continue;
      const code = stripComments(fs.readFileSync(file, 'utf8'));
      if (!HANDLES_ROOM_DATA.test(code)) continue;
      if (RAW_READS.some((re) => re.test(code))) offenders.push(relative);
    }
    expect(offenders, `move these onto TraversalBehavior or list them with a reason:\n  ${offenders.join('\n  ')}`).toEqual([]);
  });

  test('every enumerated reader exists and still reads (a stale entry is removed, not kept)', () => {
    for (const relative of Object.keys(ALLOWED_READERS)) {
      const full = path.join(PACKAGES, relative);
      expect(fs.existsSync(full), `${relative} is gone`).toBe(true);
      const code = stripComments(fs.readFileSync(full, 'utf8'));
      expect(RAW_READS.some((re) => re.test(code)), `${relative} no longer reads raw exits; drop its entry`).toBe(true);
    }
  });

  test('admittance has one reader: no source outside the enumerated files touches a room\'s or an exit\'s `admits` (F1, D17)', () => {
    // The home reads it; the trait declares it; the loader writes it from
    // the IR (and reads the IR's own `admits` lists to do so). No mover or
    // action keeps a copy of who a way admits.
    const ADMITTANCE: Record<string, string> = {
      [HOME]: 'home — admitsMover, the only reader',
      'world-model/src/traits/room/roomTrait.ts': 'data — declares Admittance',
      'story-loader/src/loader.ts': 'writer — lowers the IR admits lists and pushing blocks',
    };
    const offenders: string[] = [];
    for (const file of files) {
      const relative = path.relative(PACKAGES, file);
      if (relative in ADMITTANCE) continue;
      const code = stripComments(fs.readFileSync(file, 'utf8'));
      if (/\.admits\b|\badmitsPushed\b/.test(code)) offenders.push(relative);
    }
    expect(offenders, `admittance is the traversal system's to read:\n  ${offenders.join('\n  ')}`).toEqual([]);
  });

  test('the copies are the two GH #601 names and no more', () => {
    const copies = Object.entries(ALLOWED_READERS).filter(([, v]) => v.role === 'copy').map(([k]) => k).sort();
    expect(copies).toEqual([
      'stdlib/src/actions/helpers/exit-legality.ts',
      'stdlib/src/npc/npc-service.ts',
      'story-loader/src/evaluator.ts',
    ]);
  });
});
