/**
 * Family Zoo — ADR-196 dynamic-text consumers (Optional + Choice).
 *
 * Two story-level producers that stage phrase-algebra modifier atoms as
 * message params, exercising the platform's Optional (C1) and persistent
 * Choice (C2) realization end-to-end:
 *
 *   C1 — Optional (S9–S10): examining the staff gate emits a status line whose
 *        mid-sentence clause appears only while the gate is open. `present` is
 *        resolved from world state at emit time (NOT at realize time).
 *   C2 — Choice (S12–S14): examining the parrot emits a flavor line that cycles
 *        through variants and shows a once-only aside. Both are keyed to the
 *        parrot entity in the persistent `textState` store, so the cycle position
 *        survives save/restore.
 *
 * Both bind phrases by param name; neither uses in-string control flow (ADR-196 §5).
 *
 * Public interface: registerDynamicText(world, ids)
 * Owner: familyzoo tutorial — ADR-196 Phase 5 consumer.
 */

import type { ISemanticEvent } from '@sharpee/core';
import type { IWorldModel } from '@sharpee/world-model';
import { OpenableBehavior } from '@sharpee/world-model';
import type { Optional, Choice, Literal, Empty } from '@sharpee/if-domain';
import { DynamicTextMessages } from './language.js';

// --- phrase constructors (the story side of the algebra) -------------------

const lit = (text: string): Literal => ({ kind: 'literal', text });
const EMPTY: Empty = { kind: 'empty' };

/** An Optional gated on a producer-resolved boolean (ADR-196 §1). */
function optional(present: boolean, child: Literal): Optional {
  return { kind: 'optional', child, present };
}

/** A persistent Choice keyed to `(entityId, messageKey)` (ADR-196 §2). */
function choice(
  selector: Choice['selector'],
  alternatives: Choice['alternatives'],
  entityId: string,
  messageKey: string,
): Choice {
  return { kind: 'choice', alternatives, selector, entityId, messageKey };
}

// --- the consumers ----------------------------------------------------------

interface DynamicTextIds {
  /** The staff gate door (C1). */
  gateId: string;
  /** The scarlet macaw (C2). */
  parrotId: string;
}

/** The gate-status reaction event (C1). */
function gateStatusEvent(world: IWorldModel, gateId: string): ISemanticEvent {
  const gate = world.getEntity(gateId);
  const isOpen = gate ? OpenableBehavior.isOpen(gate) : false;
  return {
    id: `zoo-gate-status-${Date.now()}`,
    // A custom type (not `game.message`) renders as its own line via the
    // ADR-097 domain-message path, instead of ADR-106's message-override.
    type: 'zoo.event.gate_status',
    timestamp: Date.now(),
    entities: {},
    data: {
      messageId: DynamicTextMessages.GATE_STATUS,
      params: {
        // `present` resolved HERE from world state — never read at realize time.
        openClause: optional(isOpen, lit(', standing wide open')),
      },
    },
  };
}

/** The parrot-flavor reaction event (C2). */
function parrotFlavorEvent(parrotId: string): ISemanticEvent {
  return {
    id: `zoo-parrot-flavor-${Date.now()}`,
    type: 'zoo.event.parrot_flavor',
    timestamp: Date.now(),
    entities: {},
    data: {
      messageId: DynamicTextMessages.PARROT_FLAVOR,
      params: {
        parrotCycle: choice(
          'cycling',
          [
            lit('The parrot ruffles its scarlet feathers and whistles a jaunty tune.'),
            lit('The parrot cocks its head and rasps, "Pretty bird! Pretty bird!"'),
            lit('The parrot preens one wing, ignoring you with theatrical disdain.'),
          ],
          parrotId,
          'parrot-cycle',
        ),
        // Distinct messageKey so it advances independently of the cycle and they
        // never collide within a turn (ADR-196 §3). Leading space lives inside
        // alt[0]; alt[1] is Empty, so later examines end cleanly.
        parrotAside: choice(
          'firstTime',
          [lit(' (A small plaque notes the macaws are rescues from the illegal pet trade.)'), EMPTY],
          parrotId,
          'parrot-aside',
        ),
      },
    },
  };
}

/**
 * Wire the two ADR-196 consumers as independent `if.event.examined` chains. Each
 * returns a custom-typed event carrying a phrase-valued param the prose pipeline
 * realizes through the textState-backed Assembler (so each examine produces exactly
 * one reaction — the render-once invariant ADR-196 §3 relies on).
 *
 * @param world the story world model (provides `chainEvent`)
 * @param ids   the entity ids the two consumers key off
 */
export function registerDynamicText(world: IWorldModel, ids: DynamicTextIds): void {
  const { gateId, parrotId } = ids;

  // C1 — Optional: gate-open clause appears/disappears with world state.
  world.chainEvent(
    'if.event.examined',
    (event: ISemanticEvent, w: IWorldModel): ISemanticEvent | null =>
      (event.data as Record<string, unknown>).targetId === gateId
        ? gateStatusEvent(w, gateId)
        : null,
    { key: 'zoo.chain.gate-status' },
  );

  // C2 — Choice: parrot flavor cycles + once-only aside, keyed in textState.
  world.chainEvent(
    'if.event.examined',
    (event: ISemanticEvent): ISemanticEvent | null =>
      (event.data as Record<string, unknown>).targetId === parrotId
        ? parrotFlavorEvent(parrotId)
        : null,
    { key: 'zoo.chain.parrot-flavor' },
  );
}
