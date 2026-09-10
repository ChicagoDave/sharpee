/**
 * derived.ts — the runtime's derived section.
 *
 * Derived properties: `dark while` rooms and blocked exits registered as
 * live world evaluators consulted at every read — nothing is stamped and
 * nothing recomputes — and the refusal phrase a blocked exit renders at
 * refusal time.
 *
 * Public interface: DerivedSection.
 * Owner context: @sharpee/story-loader (one section of the Chord runtime).
 *
 * References:
 * - ADR-335 D1 — one module per runtime section over a shared core.
 */
import type { IREntity } from '@sharpee/chord';
import { exitBlockedKey, exitMessageKey } from '@sharpee/stdlib';
import { darkKey, Direction, type DirectionType, WorldModel } from '@sharpee/world-model';
import { CHORD_OCCURRENCE_PREFIX } from '../state-keys.js';
import type { RuntimeCore } from './core.js';

export class DerivedSection {
  constructor(private readonly core: RuntimeCore) {}

  /**
   * ADR-240 D2/D3: register every derived property as a named world-evaluator.
   * `dark while` rooms register on `dark.<roomId>`; EVERY blocked exit —
   * conditional or not (a constant-true predicate) — registers on
   * `exit.blocked.<roomId>.<direction>`, with its refusal message on
   * `exit.message.*` resolved AT REFUSAL TIME (phrase strategies vary per
   * attempt). Registration is idempotent per world; re-binding re-registers.
   */
  registerDerivedEvaluators(world: WorldModel): void {
    for (const { entity, condition } of this.derivedDarkRooms()) {
      const worldId = this.core.host.entityId(entity.id);
      if (!worldId) continue;
      world.registerEvaluator(darkKey(worldId), (w) =>
        this.core.evaluator.evalCondition(condition, { world: w as WorldModel }),
      );
    }

    for (const irEntity of this.core.ir.entities) {
      if (irEntity.blockedExits.length === 0) continue;
      const worldId = this.core.host.entityId(irEntity.id);
      if (!worldId) continue;
      // GH #315: the evaluator registry is one-value-per-key (idempotent
      // last-wins, ADR-240 D6), so a direction's N blocked lines must compose
      // into ONE registration per key — registering per line silently kept
      // only the last. Group by direction, declaration order preserved.
      const byDirection = new Map<DirectionType, typeof irEntity.blockedExits>();
      for (const blocked of irEntity.blockedExits) {
        const direction = (Direction as Record<string, DirectionType>)[blocked.direction.toUpperCase()];
        if (!direction) continue;
        const group = byDirection.get(direction);
        if (group) group.push(blocked);
        else byDirection.set(direction, [blocked]);
      }
      for (const [direction, arms] of byDirection) {
        // One arm selection per (room, direction): first line in declaration
        // order whose condition holds; a condition-less line is the always-true
        // fallback (the mergeArms idiom). Both keys below are views of this one
        // selection, so the blocked boolean and the refusal phrase cannot drift.
        const selectArm = (w: WorldModel) =>
          arms.find(
            (arm) => !arm.condition || this.core.evaluator.evalCondition(arm.condition, { world: w, it: irEntity.id }),
          );
        world.registerEvaluator(
          exitBlockedKey(worldId, direction),
          (w) => selectArm(w as WorldModel) !== undefined,
        );
        world.registerEvaluator(exitMessageKey(worldId, direction), (w) => {
          const arm = selectArm(w as WorldModel) ?? arms[0];
          return this.blockedPhraseText(arm.phraseKey, w as WorldModel);
        });
      }
    }
  }

  private derivedDarkRooms(): Array<{ entity: IREntity; condition: NonNullable<IREntity['traits'][number]['condition']> }> {
    const out = [];
    for (const entity of this.core.ir.entities) {
      for (const trait of entity.traits) {
        if (trait.name === 'dark' && trait.condition) out.push({ entity, condition: trait.condition });
      }
    }
    return out;
  }

  /**
   * Blocked-exit refusal text, resolved AT REFUSAL TIME (ADR-240 D6): a
   * multi-variant phrase honors its strategy per attempt — `randomly`
   * through the seeded story RNG, `cycling`/`stopping`/`first-time`
   * through a world-state counter, `sticky` through a stored pick — so
   * refusal text varies exactly as ADR-211 phrase semantics intend.
   */
  private blockedPhraseText(key: string, world: WorldModel): string {
    const phrase = this.core.ir.phrases.locales[this.core.ir.phrases.defaultLocale]?.[key];
    if (!phrase) return '';
    const variants = phrase.variants;
    if (variants.length <= 1) return variants[0]?.text ?? '';

    const stateKey = `${CHORD_OCCURRENCE_PREFIX}blocked.${key}`;
    switch (phrase.strategy) {
      case 'randomly':
        return variants[this.core.evaluator.pickIndex(variants.length, world)].text;
      case 'sticky': {
        const stored = world.getStateValue(stateKey);
        if (typeof stored === 'number') return variants[stored]!.text;
        const pick = this.core.evaluator.pickIndex(variants.length, world);
        world.setStateValue(stateKey, pick);
        return variants[pick]!.text;
      }
      case 'stopping': {
        const n = (world.getStateValue(stateKey) as number | undefined) ?? 0;
        world.setStateValue(stateKey, Math.min(n + 1, variants.length - 1));
        return variants[Math.min(n, variants.length - 1)]!.text;
      }
      case 'first-time': {
        const n = (world.getStateValue(stateKey) as number | undefined) ?? 0;
        world.setStateValue(stateKey, n + 1);
        return variants[n === 0 ? 0 : Math.min(1, variants.length - 1)]!.text;
      }
      case 'cycling':
      default: {
        const n = (world.getStateValue(stateKey) as number | undefined) ?? 0;
        world.setStateValue(stateKey, n + 1);
        return variants[n % variants.length]!.text;
      }
    }
  }

  // `recomputeDerived` and its trigger wiring are gone: the registered
  // evaluators above are consulted live at every read; there is no cached
  // derivation left to refresh.
}
