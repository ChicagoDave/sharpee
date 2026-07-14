/**
 * ADR-211 core Phase 3 — the registered snippet-gate seam (Q4, scaffold).
 *
 * Behavior Statement (registerSnippetGate / seam):
 *   DOES   store (idempotent last-wins) a gate thunk in the module registry
 *          keyed (roomId, marker); lookupSnippetGate returns it;
 *          clearSnippetGates empties the registry; resolveSnippetDescription
 *          consults the gate AFTER the `mentions` data gate and splices Empty
 *          when the gate does not hold. Nothing is serialized — callers
 *          re-register every story load.
 *   WHEN   the condition-owning runtime (the Chord loader, package 2)
 *          registers at story load; the resolver reads at render time.
 *   BECAUSE non-presence `while` conditions cannot compile to serializable
 *          SnippetEntry data (ADR-211 Q4); the seam keeps the entry
 *          serializable while never artificially restricting `while`.
 *   REJECTS never — a throwing gate is caught, logged, and treated as not
 *          holding (render-graceful; no throw mid-turn).
 *
 * Lands AC-12 scoped to core: registration, render gating, the counter
 * clause (a gated-out marker resolves to Empty — no Choice node exists for
 * the Assembler to advance; a holding gate leaves the Choice intact), and
 * the no-registration no-op. The Chord-side end-to-end wiring test is
 * package 2's job.
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Choice, Spliced } from '@sharpee/if-domain';
import {
  resolveSnippetDescription,
  SnippetWorldQueries,
} from '../../../src/actions/standard/looking/snippet-resolver';
import {
  registerSnippetGate,
  lookupSnippetGate,
  clearSnippetGates,
} from '../../../src/actions/standard/looking/snippet-gate-registry';

/** A world stub: entity presence table → gate queries. */
function worldWith(containment: Record<string, string | undefined>): SnippetWorldQueries {
  return {
    getEntity: (id) => (id in containment ? { id } : undefined),
    getContainingRoom: (id) => {
      const room = containment[id];
      return room ? { id: room } : undefined;
    },
  };
}

const emptyWorld = worldWith({});

// The registry is module-level state with a re-register-per-load lifecycle;
// tests are a fresh "load" each.
beforeEach(() => clearSnippetGates());
afterEach(() => {
  clearSnippetGates();
  vi.restoreAllMocks();
});

describe('snippet-gate registry (ADR-211 Q4 seam)', () => {
  test('register + lookup round-trips per (roomId, marker); unregistered sites are undefined', () => {
    const gate = () => true;
    registerSnippetGate('r01', 'trunk', gate);
    expect(lookupSnippetGate('r01', 'trunk')).toBe(gate);
    expect(lookupSnippetGate('r01', 'other')).toBeUndefined();
    expect(lookupSnippetGate('r02', 'trunk')).toBeUndefined();
  });

  test('re-registration is last-wins — one gate per site, never a stack', () => {
    registerSnippetGate('r01', 'trunk', () => true);
    const second = () => false;
    registerSnippetGate('r01', 'trunk', second);
    expect(lookupSnippetGate('r01', 'trunk')).toBe(second);
  });

  test('clearSnippetGates drops every registration (same-process story switch)', () => {
    registerSnippetGate('r01', 'trunk', () => true);
    registerSnippetGate('r02', 'dust', () => true);
    clearSnippetGates();
    expect(lookupSnippetGate('r01', 'trunk')).toBeUndefined();
    expect(lookupSnippetGate('r02', 'dust')).toBeUndefined();
  });
});

describe('resolver applies the registered gate (AC-12, core scope)', () => {
  const text = 'An old trunk sits in the corner{snippet:trunk}.';
  const snippets = { trunk: 'its lid rattling faintly' };
  const splicedTrunk = {
    kind: 'spliced',
    mode: 'clause',
    content: { kind: 'literal', text: 'its lid rattling faintly' },
  };

  test('a gate that does not hold splices nothing (Empty)', () => {
    registerSnippetGate('r01', 'trunk', () => false);
    const seq = resolveSnippetDescription(text, 'r01', snippets, emptyWorld);
    expect(seq.parts[1]).toEqual({ kind: 'empty' });
  });

  test('a gate that holds leaves the resolved value intact', () => {
    registerSnippetGate('r01', 'trunk', () => true);
    const seq = resolveSnippetDescription(text, 'r01', snippets, emptyWorld);
    expect(seq.parts[1]).toEqual(splicedTrunk);
  });

  test('no registration is provably a no-op — output identical to the ungated resolve', () => {
    const ungated = resolveSnippetDescription(text, 'r01', snippets, emptyWorld);
    expect(ungated.parts).toEqual([
      { kind: 'verbatim', text: 'An old trunk sits in the corner' },
      splicedTrunk,
      { kind: 'verbatim', text: '.' },
    ]);
  });

  test('the gate keys per room — the same marker name in another room is unaffected', () => {
    registerSnippetGate('r01', 'trunk', () => false);
    const other = resolveSnippetDescription(text, 'r02', snippets, emptyWorld);
    expect(other.parts[1]).toEqual(splicedTrunk);
  });

  test('counter clause: gated-out leaves NO Choice node to advance; a holding gate leaves the Choice intact', () => {
    // Variant-list entry → Choice. The Assembler is the only counter authority
    // (it advances when it realizes a Choice); the resolver's job is that a
    // gated-out marker hands the Assembler Empty — nothing to advance.
    const variantSnippets = { trunk: ['lid rattling', 'lid still'] };
    registerSnippetGate('r01', 'trunk', () => false);
    const gatedOut = resolveSnippetDescription(text, 'r01', variantSnippets, emptyWorld);
    expect(gatedOut.parts[1]).toEqual({ kind: 'empty' });

    registerSnippetGate('r01', 'trunk', () => true);
    const gatedIn = resolveSnippetDescription(text, 'r01', variantSnippets, emptyWorld);
    const choice = (gatedIn.parts[1] as Spliced).content as Choice;
    expect(choice.kind).toBe('choice');
    expect(choice.entityId).toBe('r01');
    expect(choice.messageKey).toBe('trunk');
  });

  test('registered gate composes with the mentions data gate — both must hold', () => {
    const gated = { trunk: { text: 'its lid rattling faintly', mentions: 'trunk-1' } };
    registerSnippetGate('r01', 'trunk', () => true);
    // mentions fails (entity elsewhere) → Empty despite the holding gate.
    const absent = resolveSnippetDescription(text, 'r01', gated, worldWith({ 'trunk-1': 'r09' }));
    expect(absent.parts[1]).toEqual({ kind: 'empty' });
    // mentions holds + gate holds → renders.
    const present = resolveSnippetDescription(text, 'r01', gated, worldWith({ 'trunk-1': 'r01' }));
    expect(present.parts[1]).toEqual(splicedTrunk);
    // mentions holds + gate fails → Empty.
    registerSnippetGate('r01', 'trunk', () => false);
    const blocked = resolveSnippetDescription(text, 'r01', gated, worldWith({ 'trunk-1': 'r01' }));
    expect(blocked.parts[1]).toEqual({ kind: 'empty' });
  });

  test('a throwing gate is render-graceful: warns, splices nothing, never throws', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    registerSnippetGate('r01', 'trunk', () => {
      throw new Error('condition evaluator exploded');
    });
    const seq = resolveSnippetDescription(text, 'r01', snippets, emptyWorld);
    expect(seq.parts[1]).toEqual({ kind: 'empty' });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("gate for marker 'trunk' threw"));
  });
});
