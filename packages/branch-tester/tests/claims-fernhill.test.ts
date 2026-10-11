/**
 * claims-fernhill.test.ts — the REAL-PATH test of the claims runner
 * (ADR-365 AC-1, AC-2, AC-4): Fernhill's nine claims through the real
 * engine at seed 1209, reproducing the verdicts and witness depths the
 * explorer spike measured for the ADR's table (2026-10-10).
 *
 * The story is compiled from `branch-stories/fernhill` by `@sharpee/chord`
 * with imports resolved against the story's directory, loaded by
 * `@sharpee/story-loader`, assembled by `@sharpee/bootstrap`; every command
 * runs through the real parser and engine, and every fork is the engine's
 * own save/restore. No stub of any owned dependency.
 *
 * Nine claims, eight distinct sets, eight walks: every predicate kind is
 * exercised (ending, placement in, event, state, placement notIn, room,
 * never-room, flag, fired) and every verdict (held by witness, held by
 * exhaustion, violated). The corpus lives beside the spike's measurement
 * files; the copy here is the fixture this test pins.
 *
 * Skipped, like the corpus sweeps, when the repository's corpus is not
 * configured (a published tarball).
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { claimCone, compile, type StoryIR } from '@sharpee/chord';
import { createStory } from '@sharpee/story-loader';
import { assembleGame } from '@sharpee/bootstrap';
import { normalizeClaimSet } from '../src/claims/claim-set.js';
import { runClaims, type ClaimsRunResult } from '../src/claims/claims-runner.js';
import type { ClaimsGame } from '../src/claims/claims-game.js';

const SEED = 1209;
const corpus = process.env.SHARPEE_TRANSCRIPT_CORPUS;
const STORY = corpus ? resolve(corpus, 'fernhill/fernhill.story') : undefined;
const CLAIMS = resolve(__dirname, 'fixtures/claims/fernhill.json');

/** Compile the story with its `import "<file>"` fragments read beside it. */
function compileStory(storyFile: string): StoryIR {
  const storyDir = dirname(storyFile);
  const result = compile(readFileSync(storyFile, 'utf8'), {
    importResolver: (fragment) => {
      const full = resolve(storyDir, fragment);
      return existsSync(full) ? readFileSync(full, 'utf8') : null;
    },
  });
  if (!result.ok) throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  return result.ir;
}

/** Boots one fresh real game at the pinned seed, the way `sharpee test` does. */
function loaderFor(storyFile: string): () => Promise<ClaimsGame> {
  return async () => {
    const story = createStory(compileStory(storyFile), { seed: SEED });
    return assembleGame(story, { seed: SEED, freshStory: () => createStory(compileStory(storyFile), { seed: SEED }) });
  };
}

const describeWithCorpus = STORY && existsSync(STORY) ? describe : describe.skip;

describeWithCorpus('REAL-PATH — Fernhill\'s claims through the real engine (ADR-365 AC-1, AC-2)', () => {
  let run: ClaimsRunResult | undefined;
  const fernhill = async (): Promise<ClaimsRunResult> => {
    if (!run) {
      const claimSet = normalizeClaimSet(JSON.parse(readFileSync(CLAIMS, 'utf8')), 'fernhill.json');
      // The budget the ADR's table was measured under.
      run = await runClaims(compileStory(STORY!), claimSet, loaderFor(STORY!), { seed: SEED, maxStates: 500_000, maxSeconds: 120, maxDepth: 80 });
    }
    return run;
  };

  it('settles all nine claims with the measured verdicts and witness depths', async () => {
    const result = await fernhill();
    const verdicts = result.claims.map((claim) => [claim.name, claim.verdict, claim.depth ?? null]);
    expect(verdicts).toEqual([
      ['the story can be won', 'held', 24],
      ['the deed is in hand', 'held', 21],
      ['Tobias has been asked about the folly', 'held', 2],
      ['the diary page has been read', 'held', 10],
      ['the deed box leaves the Folly', 'violated', 14],
      ['the Study is reached', 'held', 8],
      ['the Study is reached without the sherry', 'held', null],
      ['the auction notice has been read', 'held', 1],
      ['the stopcock has been turned', 'held', 4],
    ]);
    expect([result.declared, result.held, result.violated, result.unproven]).toEqual([9, 8, 1, 0]);
  }, 300_000);

  it('runs one walk per distinct set; every walk is settled by its claims or by exhaustion, never by a budget', async () => {
    const result = await fernhill();
    expect(result.walks.map((walk) => [walk.set, walk.stopReason])).toEqual([
      ['the declared set', 'all-claims-settled'],
      ['the set of "Tobias has been asked about the folly"', 'all-claims-settled'],
      ['the set of "the diary page has been read"', 'all-claims-settled'],
      ['the set of "the deed box leaves the Folly"', 'all-claims-settled'],
      ['the set of "the Study is reached"', 'all-claims-settled'],
      ['the set of "the Study is reached without the sherry"', 'frontier-exhausted'],
      ['the set of "the auction notice has been read"', 'all-claims-settled'],
      ['the set of "the stopcock has been turned"', 'all-claims-settled'],
    ]);
    // The negative claim held by exhaustion: fifteen states, the spike's measurement.
    expect(result.walks[5].statesDiscovered).toBe(15);
  }, 300_000);

  it('AC-2: the whole run finishes inside the 90-second bound', async () => {
    const result = await fernhill();
    expect(result.totalWalkMs).toBeLessThan(90_000);
  }, 300_000);

  it('the witnesses are the measured paths: the 24-command line to victory, and the 14 commands that carry the deed box out of the Folly', async () => {
    const result = await fernhill();
    const won = result.claims.find((claim) => claim.name === 'the story can be won')!;
    expect(won.witness).toEqual([
      'north', 'north', 'north', 'east', 'take garden shears', 'west', 'south', 'east',
      'turn stopcock', 'push primer plunger', 'turn on boiler', 'west', 'ask Tobias about the folly',
      'west', 'north', 'open folly door', 'north', 'cut fuse with garden shears', 'take deed box',
      'south', 'south', 'east', 'south', 'south',
    ]);
    const deedBox = result.claims.find((claim) => claim.name === 'the deed box leaves the Folly')!;
    expect(deedBox.witness).toEqual([
      'north', 'north', 'east', 'turn stopcock', 'push primer plunger', 'turn on boiler', 'west',
      'ask Tobias about the folly', 'west', 'north', 'open folly door', 'north', 'take deed box', 'south',
    ]);
  }, 300_000);

  it('AC-9 (ADR-365 D12): nothing a witness touches is reported inert, each verdict carries its cone\'s count, and the inert things are the ones the story says are off the path', async () => {
    const result = await fernhill();
    const ir = compileStory(STORY!);
    const sidecar = JSON.parse(readFileSync(CLAIMS, 'utf8'));
    const spellings = new Map(ir.entities.map((entity) => [entity.id, [entity.name, ...entity.aka].map((s) => s.toLowerCase())]));
    const inertByClaim: Record<string, string[]> = {};
    for (const claim of sidecar.claims) {
      const set = { rooms: claim.needs?.rooms ?? sidecar.rooms, things: claim.needs?.things ?? sidecar.things, verbs: claim.needs?.verbs ?? sidecar.verbs };
      const cone = claimCone(ir, claim, set);
      inertByClaim[claim.name] = cone.inert;
      const verdict = result.claims.find((v) => v.name === claim.name)!;
      expect(verdict.inertInSet).toBe(cone.inert.length);
      for (const command of verdict.witness ?? []) {
        for (const id of cone.inert) for (const spelling of spellings.get(id) ?? []) expect(command.toLowerCase(), `${claim.name}: "${command}" touches inert ${id}`).not.toContain(spelling);
      }
    }
    expect(inertByClaim).toEqual({
      'the story can be won': ['sherry-bottle', 'mrs-kettle'],
      'the deed is in hand': ['sherry-bottle', 'mrs-kettle'],
      'Tobias has been asked about the folly': [],
      'the diary page has been read': [],
      'the deed box leaves the Folly': [],
      'the Study is reached': [],
      'the Study is reached without the sherry': ['garden-shears'],
      'the auction notice has been read': [],
      'the stopcock has been turned': [],
    });
  }, 300_000);
});
