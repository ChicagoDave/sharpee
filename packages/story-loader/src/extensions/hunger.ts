/**
 * hunger.ts — the `use hunger` registry entry.
 *
 * `registerWorld` installs the eating handler, which needs no config.
 * `installFromIR` builds the three config-dependent plugins from the
 * story's `use hunger` block: the decay-and-death daemon (`grows N each
 * turn`, `fatal at N`), the crossing watcher over the severity scalar and
 * the authored rungs, and the narrator that speaks each crossed rung's
 * `says` phrase or the overridable fallback under the story's `announce`
 * mode. The daemon runs in the story-reactions band so the watcher and
 * narrator observe the updated severity the same turn.
 *
 * Public interface: HUNGER_EXTENSION.
 * Owner context: @sharpee/story-loader (language-neutral IR consumer).
 *
 * References:
 * - ADR-263 D1 — the hunger meter; the decay and death daemon.
 * - ADR-262 — the crossing watcher and band narrator this entry renders through.
 * - ADR-332 — the bands the three plugins sit in.
 * - ADR-335 D3 — IR-shaped construction lives in the registry entry.
 */
import type { StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { createHungerCrossingWatcher, getHungerSeverity, registerHunger, setHungerSeverity } from '@sharpee/ext-hunger';
import { TURN_BANDS, createBandNarrator, type BandAnnounceMode, type BandRung, type TurnPlugin } from '@sharpee/plugins';
import { killPlayer } from '@sharpee/stdlib';
import type { ExtensionRegistration } from '../extension-registry.js';

/**
 * The hunger decay + death daemon. Each turn it raises the severity counter
 * by `grows` (the `on every turn` mechanic) and, once severity reaches
 * `fatal`, kills the player (`kill the player` — a raw-value trigger, not a
 * band). Story-reactions band: above the crossing watcher and narrator, so
 * they observe the updated severity the same turn.
 */
function buildHungerDaemon(grows: number, fatal: number | undefined): TurnPlugin {
  return {
    id: 'chord.story.hunger-daemon',
    // Story-reactions band (ADR-332): `grows N each turn` is a story clause;
    // it runs before every platform phase and before its own watcher.
    priority: TURN_BANDS.storyReactions.floor + 40,
    onAfterAction(ctx): ISemanticEvent[] {
      if (grows > 0) {
        setHungerSeverity(ctx.world, getHungerSeverity(ctx.world) + grows);
      }
      if (fatal !== undefined && getHungerSeverity(ctx.world) >= fatal) {
        const player = ctx.world.getPlayer();
        if (player) {
          // The death line is lang-en-us prose (overridable `hunger-starved`),
          // routed through the death event's messageId — not a hardcoded string.
          const event = killPlayer(ctx.world, player, {
            cause: 'starvation',
            messageId: 'if.action.hunger.starved',
            terminal: true,
          });
          return event ? [event] : [];
        }
      }
      return [];
    },
  };
}

export const HUNGER_EXTENSION: ExtensionRegistration = {
  registerWorld: (world) => registerHunger(world),
  installFromIR: (ir: StoryIR, engine) => {
    if (!ir.hunger) return;
    const h = ir.hunger;
    const registry = engine.getPluginRegistry();
    const bands: BandRung[] = h.rungs.map((r) => ({
      id: r.id,
      threshold: r.threshold,
      name: r.id,
      phraseId: r.phraseKey,
    }));

    // Decay + death daemon (priority above the watcher/narrator so severity is
    // current when they observe it this turn).
    registry.register(buildHungerDaemon(h.grows ?? 0, h.fatal));
    // The ADR-262 data watcher — `band_crossed` over the severity scalar.
    registry.register(createHungerCrossingWatcher(bands));
    // The Chord narrator: author `says` phrase or the overridable fallback,
    // under `use hunger, announce <mode>` (default `all`).
    registry.register(createBandNarrator({
      id: 'chord.story.hunger-narrator',
      // Watchers band (ADR-332), after the crossing watcher: the sentence follows the event.
      priority: TURN_BANDS.watchers.floor + 15,
      concept: 'hunger',
      value: (world) => getHungerSeverity(world),
      bands: () => bands,
      mode: (ir.announceModes?.['hunger'] ?? 'all') as BandAnnounceMode,
      narrationEventId: 'if.event.hunger_narrated',
      fallbackPhraseId: 'if.action.hunger.crossed',
    }));
  },
};
