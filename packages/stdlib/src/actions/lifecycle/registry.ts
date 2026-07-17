/**
 * Wired-action registry (ADR-228 D5).
 *
 * The descriptor table: every standard action's `ActionLifecycleDescriptor`,
 * collected in one place, plus the set of interceptor-consulting action ids
 * derived mechanically from it. The table IS the source of truth — an action
 * is "wired" iff its descriptor appears here, and the id set is never
 * hand-maintained. Consumers (the Chord story-loader's load-time fail-fast,
 * tooling, tests) read the derived set to decide whether an interceptor
 * registered under a given action id will ever be consulted.
 *
 * Public interface: `actionLifecycleDescriptors`,
 * `interceptorConsultingActionIds`.
 * Owner: stdlib standard-action infrastructure (ADR-228).
 *
 * NOTE: this module is deliberately NOT exported from `./index.ts` (the
 * lifecycle barrel) — actions import that barrel, and this module imports
 * the actions, so routing it through the barrel would create an import
 * cycle. It is exported from the actions barrel (`../index.ts`) instead.
 */

import { ActionLifecycleDescriptor } from './descriptor';

import { askingLifecycle } from '../standard/asking/asking';
import { attackingLifecycle } from '../standard/attacking/attacking';
import { climbingLifecycle } from '../standard/climbing/climbing';
import { closingLifecycle } from '../standard/closing/closing';
import { diggingLifecycle } from '../standard/digging/digging';
import { cuttingLifecycle } from '../standard/cutting/cutting';
import { drinkingLifecycle } from '../standard/drinking/drinking';
import { droppingLifecycle } from '../standard/dropping/dropping';
import { eatingLifecycle } from '../standard/eating/eating';
import { enteringLifecycle } from '../standard/entering/entering';
import { examiningLifecycle } from '../standard/examining/examining';
import { exitingLifecycle } from '../standard/exiting/exiting';
import { givingLifecycle } from '../standard/giving/giving';
import { goingLifecycle } from '../standard/going/going';
import { hidingLifecycle } from '../standard/hiding/hiding';
import { insertingLifecycle } from '../standard/inserting/inserting';
import { listeningLifecycle } from '../standard/listening/listening';
import { lockingLifecycle } from '../standard/locking/locking';
import { openingLifecycle } from '../standard/opening/opening';
import { pullingLifecycle } from '../standard/pulling/pulling';
import { pushingLifecycle } from '../standard/pushing/pushing';
import { puttingLifecycle } from '../standard/putting/putting';
import { readingLifecycle } from '../standard/reading/reading';
import { removingLifecycle } from '../standard/removing/removing';
import { searchingLifecycle } from '../standard/searching/searching';
import { showingLifecycle } from '../standard/showing/showing';
import { smellingLifecycle } from '../standard/smelling/smelling';
import { switchingOffLifecycle } from '../standard/switching_off/switching_off';
import { switchingOnLifecycle } from '../standard/switching_on/switching_on';
import { takingLifecycle } from '../standard/taking/taking';
import { takingOffLifecycle } from '../standard/taking_off/taking-off';
import { talkingLifecycle } from '../standard/talking/talking';
import { tellingLifecycle } from '../standard/telling/telling';
import { throwingLifecycle } from '../standard/throwing/throwing';
import { touchingLifecycle } from '../standard/touching/touching';
import { unlockingLifecycle } from '../standard/unlocking/unlocking';
import { wearingLifecycle } from '../standard/wearing/wearing';

/**
 * The descriptor table: all 37 entity-keyed standard actions (33 per
 * ADR-228 Consequences + cutting per ADR-230 D3c + digging + asking/telling per
 * ADR-230 Phase 6). Structural exemptions
 * (no entity to key on: about, waiting, looking, … and the full-delegation
 * capability actions lowering/raising) are absent by design — see ADR-228
 * Context.
 */
export const actionLifecycleDescriptors: readonly ActionLifecycleDescriptor[] = Object.freeze([
  askingLifecycle,
  attackingLifecycle,
  climbingLifecycle,
  closingLifecycle,
  cuttingLifecycle,
  diggingLifecycle,
  drinkingLifecycle,
  droppingLifecycle,
  eatingLifecycle,
  enteringLifecycle,
  examiningLifecycle,
  exitingLifecycle,
  givingLifecycle,
  goingLifecycle,
  hidingLifecycle,
  insertingLifecycle,
  listeningLifecycle,
  lockingLifecycle,
  openingLifecycle,
  pullingLifecycle,
  pushingLifecycle,
  puttingLifecycle,
  readingLifecycle,
  removingLifecycle,
  searchingLifecycle,
  showingLifecycle,
  smellingLifecycle,
  switchingOffLifecycle,
  switchingOnLifecycle,
  takingLifecycle,
  takingOffLifecycle,
  talkingLifecycle,
  tellingLifecycle,
  throwingLifecycle,
  touchingLifecycle,
  unlockingLifecycle,
  wearingLifecycle
]);

// Invariant: one descriptor per action — a duplicate primary id means two
// actions claim the same lifecycle surface (a copy-paste bug), so fail at
// module load rather than letting the registry lie.
{
  const seen = new Set<string>();
  for (const descriptor of actionLifecycleDescriptors) {
    if (seen.has(descriptor.actionId)) {
      throw new Error(
        `Duplicate lifecycle descriptor for ${descriptor.actionId} in the wired-action registry (ADR-228 D5)`
      );
    }
    seen.add(descriptor.actionId);
  }
}

/**
 * Every action id under which some wired action consults interceptors —
 * the union of all descriptors' slot actionIds (mechanically derived; the
 * both-ids delegation seams of ADR-228 D6 and implicit-entity ids like
 * `if.action.entering_room` fall out of the slots, not a hand-kept list).
 * An interceptor registered under an id NOT in this set will never fire.
 */
export const interceptorConsultingActionIds: ReadonlySet<string> = new Set(
  actionLifecycleDescriptors.flatMap((descriptor) =>
    descriptor.slots.flatMap((slot) => slot.actionIds)
  )
);
