/**
 * Lucidity decay: end-of-turn processing for an NPC's lucidity window. While
 * a lucid window has no sustaining trigger active, its countdown runs and
 * lucidity returns to baseline when it ends. Entering a window sets the
 * countdown from the character's decay rate.
 *
 * Public interface: processLucidityDecay, enterLucidityWindow, DECAY_RATE_TURNS.
 * Owner context: @sharpee/character — arbiter (the per-turn decays sit together).
 *
 * References:
 *   ADR-141 — the character model's lucidity states.
 *   ADR-339 D2 — moved home from stdlib/npc; the decay sub-step is its caller.
 */

import { type ISemanticEvent, type EntityId } from '@sharpee/core';
import {
  IFEntity,
  WorldModel,
  TraitType,
  CharacterModelTrait,
  type DecayRate,
} from '@sharpee/world-model';
import { CharacterMessages } from '@sharpee/stdlib';

// ---------------------------------------------------------------------------
// Decay rate mapping
// ---------------------------------------------------------------------------

/**
 * Maps decay rate words to number of turns before baseline is restored.
 * These are the window durations when no sustaining trigger is active.
 */
export const DECAY_RATE_TURNS: Record<DecayRate, number> = {
  slow: 8,
  moderate: 4,
  fast: 2,
};

// ---------------------------------------------------------------------------
// Event helper
// ---------------------------------------------------------------------------

let decayEventCounter = 0;

function createDecayEvent(
  type: string,
  npcId: EntityId,
  data: Record<string, unknown>,
): ISemanticEvent {
  return {
    id: `decay_${++decayEventCounter}_${Date.now()}`,
    type,
    timestamp: Date.now(),
    entities: { actor: npcId },
    data,
  };
}

// ---------------------------------------------------------------------------
// Main decay function
// ---------------------------------------------------------------------------

/**
 * Process end-of-turn lucidity decay for a single NPC.
 *
 * If the NPC has a CharacterModelTrait with an active lucidity window,
 * decrements the window counter. When it reaches zero, the cognitive
 * profile returns to baseline and a LUCIDITY_BASELINE_RESTORED event
 * is emitted.
 *
 * If no lucidity config or no active window, returns empty array.
 *
 * @param npc - The NPC entity
 * @param world - The world model (unused in current impl, reserved for future)
 * @param turn - Current turn number (unused in current impl, reserved for future)
 * @returns Array of events emitted (baseline restored, or empty)
 */
export function processLucidityDecay(
  npc: IFEntity,
  world: WorldModel,
  turn: number,
): ISemanticEvent[] {
  const trait = npc.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait | undefined;
  if (!trait) return [];
  if (!trait.lucidityConfig) return [];

  // No active window
  if (trait.lucidityWindowTurns <= 0) return [];

  const previousState = trait.currentLucidityState;
  const expired = trait.decayLucidity();

  if (expired) {
    return [
      createDecayEvent(
        CharacterMessages.LUCIDITY_BASELINE_RESTORED,
        npc.id,
        { from: previousState, to: trait.currentLucidityState },
      ),
    ];
  }

  return [];
}

/**
 * Initialize a lucidity window with the appropriate turn count
 * based on the NPC's configured decay rate.
 *
 * Call this when entering a lucidity state via a trigger, so the
 * window has the correct duration based on decayRate.
 *
 * @param trait - The NPC's CharacterModelTrait
 * @param targetState - The lucidity state to enter
 */
export function enterLucidityWindow(
  trait: CharacterModelTrait,
  targetState: string,
): void {
  if (!trait.lucidityConfig) {
    trait.enterLucidityState(targetState);
    return;
  }

  const turns = DECAY_RATE_TURNS[trait.lucidityConfig.decayRate];
  trait.enterLucidityState(targetState, turns);
}
