/**
 * present-entries.ts — the `present-entries` step: every `phrase present:` block as one slot entry.
 *
 * Each `present` channel compiles to ONE declarative slot entry on the
 * engine — no synthesized closures; the platform's built-in contributor
 * evaluates them. One `registerSlotEntry` call per authoring entity:
 * `slotKey: 'here'`, owner = the entity, content = variants as a `Choice`
 * (single plain variant → `Literal`), order = declaration order,
 * `counterKey: 'present'` (the owner + channel-key convention — the
 * Choice's own keys match it). An ungated block relies on the platform's
 * `owner-present` default; a `while`-gated block uses the predicate seam,
 * ANDed with the same presence check so the gate narrows the channel
 * rather than replacing its semantics.
 *
 * Public interface: registerPresentEntries (the `present-entries` step).
 * Owner context: @sharpee/story-loader (language-neutral IR consumer).
 *
 * References:
 * - ADR-389 D2 — the engine wiring as a named step list.
 * - ADR-212 §4, §5 — slot entries and the owner + counter-key contract.
 * - ADR-289 D8 L8 — a room's own entry: the owner's room is itself.
 * - ADR-343 — the story-facing engine role.
 */
import type { StoryEngine } from '@sharpee/engine';
import type { Choice, Literal, Phrase } from '@sharpee/if-domain';
import { TraitType, type WorldModel } from '@sharpee/world-model';
import { STRATEGY_SELECTOR } from '../../runtime/core.js';
import { withLineBreaks } from '../../text.js';
import type { BuildContext } from '../context.js';

/**
 * The `present-entries` step: one slot entry per `phrase present:` block.
 * @param story the build context
 * @param _world the built world (unused; each gate reads the live world)
 * @param engine the story-facing engine role (ADR-343)
 */
export function registerPresentEntries(story: BuildContext, _world: WorldModel, engine: StoryEngine): void {
  const table = story.ir.phrases.locales[story.ir.phrases.defaultLocale] ?? {};
  let order = 0;
  for (const irEntity of story.ir.entities) {
    const phrase = table[`${irEntity.id}.present`];
    if (!phrase) continue;
    const ownerWorldId = irEntity.id;
    const texts = phrase.variants.map((v) => (v.text === 'nothing' ? '' : withLineBreaks(v.text)));
    const content: Phrase =
      texts.length === 1 && !phrase.strategy
        ? ({ kind: 'literal', text: texts[0] } satisfies Literal)
        : ({
            kind: 'choice',
            alternatives: texts.map((text): Literal => ({ kind: 'literal', text })),
            selector: STRATEGY_SELECTOR[phrase.strategy ?? 'cycling'],
            // ADR-212 §4 caller contract: entityId = owner, messageKey =
            // counterKey — the platform warns on a mismatch.
            entityId: ownerWorldId,
            messageKey: 'present',
          } satisfies Choice);
    const condition = phrase.condition;
    engine.registerSlotEntry({
      slotKey: 'here',
      owner: ownerWorldId,
      content,
      order: order++,
      counterKey: 'present',
      ...(condition
        ? {
            gate: {
              kind: 'predicate' as const,
              holds: (world: WorldModel): boolean => {
                const playerId = world.playerCharacter.id;
                const playerRoom = playerId ? world.getContainingRoom(playerId)?.id : undefined;
                // ADR-289 D8 L8: `getContainingRoom` walks UPWARD, so it is
                // undefined when the owner IS the room — and a room's own
                // `present` entry could never pass its gate. The owner's
                // room is itself when it is one.
                const owner = world.getEntity(ownerWorldId);
                const ownerRoom = owner?.has(TraitType.ROOM)
                  ? ownerWorldId
                  : world.getContainingRoom(ownerWorldId)?.id;
                return (
                  playerRoom !== undefined &&
                  ownerRoom === playerRoom &&
                  story.evaluator.evalCondition(condition, { world })
                );
              },
            },
          }
        : {}),
    });
  }
}
