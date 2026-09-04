/**
 * chapters-plugin.ts — the turn plugin that begins chapters (ADR-330 D2–D4).
 *
 * Once per turn, after the scheduler has stepped its timers and daemons (the
 * watchers band, ADR-332), every chapter row that has
 * not yet fired is checked against world state: is the player standing in the
 * room the row waits for, has the row's timer expired, has the row's owner
 * reached the row's state, or is this the game's first turn. A row whose
 * moment holds fires exactly once (a `chord.chapter.fired.<name>` flag). If
 * the row is later than the current chapter it BEGINS: the current ordinal
 * moves to it and a `story.chapter_began` event carries name, title,
 * description, and ordinal for the `story.chapter` channel. If it is not — an
 * earlier chapter's moment arriving late — nothing changes and the non-fatal
 * `runtime.chapter-stale` event names the row (D3).
 *
 * No plugin-private state: the current chapter, the fired flags, and the
 * announced ordinal are world state, so save/restore and undo carry them and
 * a restore never re-fires. The opening row is seeded current by the loader
 * before the first turn; the plugin's job on turn 1 is only to announce it.
 *
 * Public interface: createChaptersPlugin, ChapterRow, ChapterRuntimeTrigger,
 * CHAPTERS_PLUGIN_ID, CHAPTER_BEGAN_EVENT, CHAPTER_STALE_EVENT,
 * CHAPTER_CURRENT_KEY, CHAPTER_FIRED_PREFIX, ChapterBeganData.
 * Owner context: @sharpee/ext-chapters (trusted extension runtime).
 */
import { createEvent, type ISemanticEvent } from '@sharpee/core';
import { TURN_BANDS, type TurnPlugin, type TurnPluginContext } from '@sharpee/plugins';

/** The plugin's id — stable for save compatibility. */
export const CHAPTERS_PLUGIN_ID = 'sharpee.ext.chapters';

/** The event a chapter beginning emits; the `story.chapter` channel projects it. */
export const CHAPTER_BEGAN_EVENT = 'story.chapter_began';

/** The non-fatal diagnostic for a trigger arriving after a later chapter began (ADR-330 D3). */
export const CHAPTER_STALE_EVENT = 'runtime.chapter-stale';

/** World-state key holding the current chapter's ordinal (absent until the opening row fires). */
export const CHAPTER_CURRENT_KEY = 'chord.chapter.current';

/** World-state key prefix for a row's fired flag: `chord.chapter.fired.<name>`. */
export const CHAPTER_FIRED_PREFIX = 'chord.chapter.fired.';

/**
 * World-state key holding the ordinal the `story.chapter_began` packet was
 * last emitted for. The loader seeds the opening row as current BEFORE the
 * first turn (ADR-327 D10's start moment, so `during <opener>` holds while
 * turn 1 renders); the plugin announces whatever `current` is on the first
 * turn it differs from this key — once, and never again after a restore.
 */
export const CHAPTER_ANNOUNCED_KEY = 'chord.chapter.announced';

/**
 * A chapter's trigger, lowered to what the runtime can read directly: a room's
 * WORLD id, or the world-state key a timer record / a state value lives under.
 * The loader does the lowering from `ir.chapters` (it alone knows the ids and
 * the key scheme); this package never sees IR.
 */
export type ChapterRuntimeTrigger =
  | { kind: 'game-starts' }
  | { kind: 'first-visit'; roomId: string }
  | { kind: 'timer-expires'; stateKey: string }
  | { kind: 'becomes'; stateKey: string; state: string };

/** One chapter as the plugin needs it. */
export interface ChapterRow {
  name: string;
  title: string;
  description: string;
  ordinal: number;
  trigger: ChapterRuntimeTrigger;
}

/** The `story.chapter_began` event's data — and the `story.chapter` packet, verbatim. */
export interface ChapterBeganData extends Record<string, unknown> {
  name: string;
  title: string;
  description: string;
  ordinal: number;
}

/** Does the row's moment hold this turn? */
function holds(trigger: ChapterRuntimeTrigger, ctx: TurnPluginContext): boolean {
  switch (trigger.kind) {
    case 'game-starts':
      return true;
    case 'first-visit':
      return ctx.playerLocation === trigger.roomId;
    case 'timer-expires': {
      const record = ctx.world.getStateValue(trigger.stateKey) as { phase?: string } | undefined;
      return record?.phase === 'expired';
    }
    case 'becomes':
      return ctx.world.getStateValue(trigger.stateKey) === trigger.state;
  }
}

/**
 * Build the chapters plugin over the lowered rows.
 *
 * @param rows - every chapter, in declaration order (the chapters' order)
 * @returns the plugin to register on the engine's plugin registry
 */
export function createChaptersPlugin(rows: readonly ChapterRow[]): TurnPlugin {
  const ordered = [...rows].sort((a, b) => a.ordinal - b.ordinal);
  return {
    id: CHAPTERS_PLUGIN_ID,
    // Watchers band (ADR-332): a chapter observes the turn's timers and
    // state changes after they have happened, last of the watchers.
    priority: TURN_BANDS.watchers.floor + 10,
    onAfterAction(ctx: TurnPluginContext): ISemanticEvent[] {
      const world = ctx.world;
      let current = (world.getStateValue(CHAPTER_CURRENT_KEY) as number | undefined) ?? -1;
      const out: ISemanticEvent[] = [];
      for (const row of ordered) {
        if (world.getStateValue(CHAPTER_FIRED_PREFIX + row.name)) continue;
        if (!holds(row.trigger, ctx)) continue;
        world.setStateValue(CHAPTER_FIRED_PREFIX + row.name, true);
        if (row.ordinal > current) {
          current = row.ordinal;
          world.setStateValue(CHAPTER_CURRENT_KEY, current);
        } else {
          out.push(
            createEvent(CHAPTER_STALE_EVENT, {
              message: `Chapter \`${row.name}\` reached its moment after a later chapter had begun — the chapter did not change (ADR-330 D3).`,
              chapter: row.name,
              ordinal: row.ordinal,
              current,
              turn: ctx.turn,
            }),
          );
        }
      }
      // Announce the current chapter once — the turn it began, or the first
      // turn after the loader seeded the opener (D4: the packet rides the
      // turn's channel output, after that turn's own prose).
      const announced = (world.getStateValue(CHAPTER_ANNOUNCED_KEY) as number | undefined) ?? -1;
      if (current >= 0 && announced !== current) {
        const row = ordered.find((r) => r.ordinal === current);
        if (row) {
          world.setStateValue(CHAPTER_ANNOUNCED_KEY, current);
          const data: ChapterBeganData = { name: row.name, title: row.title, description: row.description, ordinal: row.ordinal };
          out.push(createEvent(CHAPTER_BEGAN_EVENT, data));
        }
      }
      return out;
    },
  };
}
