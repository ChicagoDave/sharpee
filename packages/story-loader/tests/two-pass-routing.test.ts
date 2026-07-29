/**
 * two-pass-routing.test.ts — ADR-289 D9: the two-pass routing harness.
 *
 * Purpose: drive every routing construct that can appear in an interceptor
 * body through the REAL two-pass path (postValidate snapshot → postExecute
 * `'mutations'` → postReport `'reports'`) and assert both passes route the
 * same way. One invariant, stated once: **the report pass narrates the branch
 * whose mutations ran.**
 *
 * Public interface: none — a test module. Owner context: `@sharpee/story-loader`,
 * the Chord runtime's interceptor path (`runtime.ts` `buildInterceptor`).
 *
 * **Written RED on purpose** (ADR-289 §D9, "written failing, against H1's
 * cycling case"; plan Phase 1). `select-strategy` and the statement `when`
 * suffix are absent from `snapshotDecisions` today, so those cases fail until
 * D1 lands. `select-on`, `each`, and `ordinal` pass now and are the controls:
 * they prove the harness detects the defect class rather than merely detecting
 * a broken story.
 *
 * Method: every branch carries a WITNESS PAIR — a counter it raises (visible
 * only to the mutations pass) and a phrase it emits (visible only to the
 * reports pass). Routing agreement is asserted on the pair, so a split shows
 * up as "mutations ran alpha, reports narrated beta" instead of as a vague
 * wrong-output failure.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '@sharpee/chord';
import { WorldModel } from '@sharpee/world-model';
import { createStory } from '../src';
import { counterKey } from '../src/state-keys';

const SOURCE = `story "Two-Pass Routing Harness" by "Sharpee Platform"
  id: two-pass-routing
  version: 0.0.1

define condition loose-crate: it is a container and it is in the Lab

define counter tablet-alpha starts 0
define counter tablet-beta starts 0
define counter dial-alpha starts 0
define counter dial-beta starts 0
define counter ledger-alpha starts 0
define counter ledger-beta starts 0
define counter crate-visits starts 0

create the Lab
  a room

  A bare lab.

create the Vault
  a room

  A locked vault.

create the tablet
  scenery, readable
  in the Lab

  A stone tablet.

  on reading it
    select cycling
      raise tablet-alpha by 1
      phrase alpha
        Alpha.
    or
      raise tablet-beta by 1
      phrase beta
        Beta.
    end select
  end on

create the dial
  scenery, readable
  in the Lab
  states: left, right

  A brass dial.

  on reading it
    select on its state
      when left
        raise dial-alpha by 1
        change it to right
        phrase alpha
          Alpha.
      when right
        raise dial-beta by 1
        phrase beta
          Beta.
    end select
  end on

create the trap
  scenery, readable
  in the Lab
  states: armed, spent

  A floor trap.

  on reading it
    phrase warning when it is armed
      The trap is armed.
    change it to spent
  end on

create the ledger
  scenery, readable
  in the Lab

  A worn ledger.

  on reading it
    first time
      raise ledger-alpha by 1
      phrase alpha
        Alpha.
    second time
      raise ledger-beta by 1
      phrase beta
        Beta.
  end on

create the bin
  a container
  in the Lab

  A tin bin.

create the shelf
  scenery, readable
  in the Lab

  A steel shelf.

  on reading it
    each loose-crate
      raise crate-visits by 1
      move the match to the Vault
      phrase counted
        Counted.
    end each
  end on

create the player
  starts in the Lab

  You.
`;

function load() {
  const result = compile(SOURCE);
  expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const story = createStory(result.ir);
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  return { story, world, player };
}

type Loaded = ReturnType<typeof load>;

/**
 * Drive a target's REAL registered interceptor through all four hooks, in the
 * order the engine calls them. This is the two-pass path under test — not a
 * re-implementation of it.
 */
function fire(cw: Loaded, irId: string, actionId: string) {
  const target = cw.world.getEntity(cw.story.entityId(irId)!)!;
  const lookup = cw.world.getInterceptorForAction(target, actionId)!;
  const data = {};
  lookup.interceptor.preValidate?.(target, cw.world, cw.player.id, data);
  lookup.interceptor.postValidate?.(target, cw.world, cw.player.id, data);
  lookup.interceptor.postExecute?.(target, cw.world, cw.player.id, data);
  return lookup.interceptor.postReport?.(target, cw.world, cw.player.id, data) ?? {};
}

/**
 * Fire once and report which branch each pass took.
 *
 * @param branches counter names, keyed by the branch label they witness
 * @returns `mutated` — labels whose counter advanced during the mutations pass;
 *          `narrated` — the phrase key the reports pass surfaced, un-namespaced
 */
function witness(cw: Loaded, irId: string, branches: Record<string, string>) {
  const before = Object.fromEntries(
    Object.entries(branches).map(([label, counter]) => [label, Number(cw.world.getStateValue(counterKey(counter)) ?? 0)]),
  );
  const report = fire(cw, irId, 'if.action.reading');
  const mutated = Object.entries(branches)
    .filter(([label, counter]) => Number(cw.world.getStateValue(counterKey(counter)) ?? 0) > before[label])
    .map(([label]) => label);
  const messageId = report.override?.messageId;
  const narrated = messageId ? String(messageId).split('.').pop()! : null;
  return { mutated, narrated, report };
}

const ALPHA_BETA = (slug: string) => ({ alpha: `${slug}-alpha`, beta: `${slug}-beta` });

describe('ADR-289 D9 — the report pass narrates the branch whose mutations ran', () => {
  // ---- RED until D1 lands -------------------------------------------------

  it('select-strategy `cycling`: both passes take the same alternative (H1)', () => {
    const cw = load();
    const { mutated, narrated } = witness(cw, 'tablet', ALPHA_BETA('tablet'));

    // The defect: decideStrategy is called on BOTH passes and read-increments
    // the occurrence counter each time, so mutations run alternative 0 while
    // reports narrate alternative 1.
    expect(mutated).toEqual(['alpha']);
    expect(narrated).toBe('alpha');
  });

  it('select-strategy `cycling`: alternatives advance one step per firing (AC1)', () => {
    const cw = load();
    const narrations = [
      witness(cw, 'tablet', ALPHA_BETA('tablet')).narrated,
      witness(cw, 'tablet', ALPHA_BETA('tablet')).narrated,
      witness(cw, 'tablet', ALPHA_BETA('tablet')).narrated,
    ];

    // Two alternatives, three firings: alpha, beta, alpha. Under the
    // double-advance the counter moves twice per firing, so the sequence
    // degenerates to beta, beta, beta — it never cycles at all.
    expect(narrations).toEqual(['alpha', 'beta', 'alpha']);
  });

  it('statement `when` suffix: pinned pre-mutation, not re-read per pass (AC7)', () => {
    const cw = load();
    const report = fire(cw, 'trap', 'if.action.reading');

    // `phrase warning when it is armed` precedes `change it to spent`. The
    // mutations pass spends the trap; the reports pass then re-evaluates the
    // suffix against the mutated world and drops the phrase.
    //
    // NB: ADR-289 AC7 spells this pair `armed`/`disarmed`, which does not
    // compile — `analysis.negated-state` refuses a state naming the absence of
    // another. `spent` is the positive spelling of the same case.
    expect(report.override?.messageId).toBe('trap.warning');
    expect(cw.world.getStateValue('chord.state.trap')).toBe('spent');
  });

  // ---- Controls: already snapshotted, green today -------------------------

  it('select-on: the arm survives its own body mutating the subject', () => {
    const cw = load();
    const { mutated, narrated } = witness(cw, 'dial', ALPHA_BETA('dial'));

    // The `left` arm changes the dial to `right` mid-body. Re-deriving the arm
    // in the reports pass would narrate `beta`; the snapshot pins `left`.
    expect(mutated).toEqual(['alpha']);
    expect(narrated).toBe('alpha');
    expect(cw.world.getStateValue('chord.state.dial')).toBe('right');
  });

  // NB (AC19): reverting D1's snapshot for `ordinal` does NOT turn this red,
  // and cannot. `ctx.occurrence` is pinned into the interceptor bag before
  // either pass runs, so re-deriving `occurrence === stmt.ordinal` gives the
  // same answer every time. Recording it is defensive — it completes the
  // decision table so a future construct cannot silently regress — not a fix
  // for a live divergence. Every other construct here fails on revert.
  it('ordinal: both passes agree on the occurrence block', () => {
    const cw = load();

    const first = witness(cw, 'ledger', ALPHA_BETA('ledger'));
    expect(first.mutated).toEqual(['alpha']);
    expect(first.narrated).toBe('alpha');

    const second = witness(cw, 'ledger', ALPHA_BETA('ledger'));
    expect(second.mutated).toEqual(['beta']);
    expect(second.narrated).toBe('beta');
  });

  it('each: the reports pass visits the entities the mutations pass moved out', () => {
    const cw = load();
    const report = fire(cw, 'shelf', 'if.action.reading');

    // The body moves each match to the Vault, so by the reports pass nothing
    // satisfies `loose-crate` any more. Re-deriving the match set would visit
    // an empty set and narrate nothing; the pinned set still visits the bin.
    expect(cw.world.getStateValue(counterKey('crate-visits'))).toBe(1);
    expect(report.override?.messageId).toBe('shelf.counted');
  });
});
