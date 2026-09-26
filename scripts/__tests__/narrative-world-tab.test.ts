/**
 * narrative-world-tab.test.ts — beat 1 of the author narrative
 * (`docs/work/testing-explorer/narrative-20260926-author-testing.md`, "The
 * first rooms"): what the World tab shows is what `sharpee world-index` says
 * about fernhill's compiled story. Map places every room; Reach finds no
 * room play never arrives at; Incomplete lists `scrollwork` and `gatepost`
 * as phrases the prose names that nothing answers to.
 *
 * The IR is composed into a scratch directory, never under the story. The
 * `world-index` command does not read the IDE's `<story>.world-ignore.json`
 * dismissals (those are filtered in the World tab, ADR-321 D22 / GH #531),
 * so a dismissal in fernhill cannot move these assertions; a change to the
 * prose or to the analyzer can, which is the point.
 *
 * Owner context: repo tooling — `scripts/__tests__/`.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FERNHILL_STORY, composeIR, runWorldIndex } from './support/fernhill-run';

interface Site { owner: string; key: string }
interface Candidate { phrase: string; site: Site }
interface WorldIndexDocument {
  ok: boolean;
  story: { id: string; start: string };
  map: { positions: Array<{ room: string }>; unplaced: unknown[]; collisions: Array<{ room: string }> };
  reach: { rooms: { total: number; reachable: string[]; unreached: string[] }; stranded: unknown[]; blocked: unknown[]; findingCount: number };
  incomplete: { counts: Record<string, number>; noObject: Candidate[]; undescribed: unknown[] };
}

let dir: string;
let document: WorldIndexDocument;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'narrative-world-tab-'));
  const irFile = join(dir, 'fernhill.ir.json');
  composeIR(FERNHILL_STORY, irFile);
  const result = runWorldIndex(irFile);
  expect(result.status).toBe(0);
  document = result.document as unknown as WorldIndexDocument;
  expect(document.ok).toBe(true);
  expect(document.story.id).toBe('fernhill');
}, 60_000);

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('the Map view', () => {
  it('places all thirteen rooms, none unplaced, and any displaced room is still drawn', () => {
    expect(document.map.positions).toHaveLength(13);
    expect(document.map.unplaced).toEqual([]);
    const placed = new Set(document.map.positions.map((position) => position.room));
    for (const collision of document.map.collisions) expect(placed.has(collision.room)).toBe(true);
  });
});

describe('the Reach view', () => {
  it('starts at the gates and reaches every declared room — no room play never arrives at', () => {
    expect(document.story.start).toBe('iron-gates');
    expect(document.reach.rooms.total).toBe(13);
    expect(document.reach.rooms.reachable).toHaveLength(13);
    expect(document.reach.rooms.unreached).toEqual([]);
    expect(document.reach.stranded).toEqual([]);
    expect(document.reach.blocked).toEqual([]);
    expect(document.reach.findingCount).toBe(0);
  });
});

describe('the Incomplete view', () => {
  it('lists scrollwork and gatepost as phrases nothing answers to, each with the description that names it', () => {
    const byPhrase = new Map(document.incomplete.noObject.map((candidate) => [candidate.phrase, candidate]));
    expect(byPhrase.get('scrollwork')?.site).toMatchObject({ owner: 'iron-gates', key: 'iron-gates.description' });
    expect(byPhrase.get('gatepost')?.site).toMatchObject({ owner: 'iron-weathervane', key: 'iron-weathervane.description' });
    expect(document.incomplete.counts.noObject).toBe(document.incomplete.noObject.length);
  });

  it('finds no descriptionless object — every thing fernhill declares has prose', () => {
    expect(document.incomplete.undescribed).toEqual([]);
    expect(document.incomplete.counts.undescribed).toBe(0);
  });
});
