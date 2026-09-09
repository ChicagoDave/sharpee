/**
 * chapters.ts — the `use chapters` registry entry.
 *
 * Three moments. `registerChannels` installs the `story.chapter` channel.
 * `seedWorldFromIR` makes the opening chapter current from the moment the
 * game starts — before the first turn, so `during <opener>` holds while
 * turn 1 renders; the plugin announces it on turn 1. A restored world
 * already carries these keys and is never re-seeded (world build runs once
 * per boot, before any restore). `installFromIR` lowers each chapter's
 * trigger to what the plugin can read directly — a room's world id, a timer
 * record's key, a state value's key — and registers the chapters plugin
 * over the rows. `gatedConstruct` names `define chapters` as the construct
 * this `use` unlocks, so rogue IR carrying one without the `use` is refused.
 *
 * Public interface: CHAPTERS_EXTENSION.
 * Owner context: @sharpee/story-loader (language-neutral IR consumer).
 *
 * References:
 * - ADR-330 D2 — the opener is current before the first turn.
 * - ADR-215 — the channel slot is the contract's third contribution part.
 * - ADR-335 D3 — IR-shaped construction lives in the registry entry.
 */
import type { IRChapterTrigger, StoryIR } from '@sharpee/chord';
import {
  CHAPTER_CURRENT_KEY,
  CHAPTER_FIRED_PREFIX,
  createChaptersPlugin,
  registerChaptersChannels,
  type ChapterRow,
  type ChapterRuntimeTrigger,
} from '@sharpee/ext-chapters';
import type { IChannelRegistry } from '@sharpee/if-domain';
import type { ExtensionRegistration } from '../extension-registry.js';
import { CHORD_STATE_PREFIX, CHORD_STORY_STATE_KEY, timerKey } from '../state-keys.js';

export const CHAPTERS_EXTENSION: ExtensionRegistration = {
  registerChannels: (registry) => registerChaptersChannels(registry as IChannelRegistry),
  gatedConstruct: (ir) =>
    (ir.chapters ?? []).length > 0 ? { construct: 'define chapters', span: ir.chapters![0].span } : null,
  seedWorldFromIR: (ir, world) => {
    const opener = (ir.chapters ?? []).find((c) => c.trigger.kind === 'game-starts');
    if (opener && world.getStateValue(CHAPTER_CURRENT_KEY) === undefined) {
      world.setStateValue(CHAPTER_FIRED_PREFIX + opener.name, true);
      world.setStateValue(CHAPTER_CURRENT_KEY, opener.ordinal);
    }
  },
  installFromIR: (ir: StoryIR, engine, context) => {
    if ((ir.chapters ?? []).length === 0) return;
    const lower = (t: IRChapterTrigger): ChapterRuntimeTrigger => {
      switch (t.kind) {
        case 'game-starts':
          return { kind: 'game-starts' };
        case 'first-visit':
          return { kind: 'first-visit', roomId: context.requireWorldId(t.room) };
        case 'timer-expires':
          return { kind: 'timer-expires', stateKey: timerKey(t.timer) };
        case 'becomes':
          return { kind: 'becomes', stateKey: t.owner === 'story' ? CHORD_STORY_STATE_KEY : CHORD_STATE_PREFIX + t.owner, state: t.state };
      }
    };
    const rows: ChapterRow[] = ir.chapters!.map((c) => ({
      name: c.name,
      title: c.title,
      description: c.description,
      ordinal: c.ordinal,
      trigger: lower(c.trigger),
    }));
    engine.getPluginRegistry().register(createChaptersPlugin(rows));
  },
};
