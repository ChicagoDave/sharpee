/**
 * npc.ts — the CORE NPC vocabulary manifest (ADR-215).
 *
 * Purpose: the behavior-library adjectives every story may compose with no
 * `use` line — NPCs are core by David's ruling ("this deliberately breaks
 * the uniform one-`use`-per-extension rule for the common case"): the NPC
 * plugin auto-wires at load and this vocabulary is always admitted
 * (`core: true`). Pure data, zero platform imports; the trait/behavior
 * routing lives in @sharpee/story-loader.
 *
 * NOT surfaced: `NpcTrait.goals` — structured Goal objects have no config
 * spelling; surfacing them is a future conversation, not a guess.
 *
 * Public interface: NPC_MANIFEST.
 * Owner context: @sharpee/chord (language frontend; browser-safe).
 */
import type { ExtensionManifest, ManifestField } from './types';

/** NpcTrait fields composable on every behavior adjective. */
const NPC_COMMON_FIELDS: ManifestField[] = [
  { key: 'can-move', valueKind: 'word' },
  { key: 'announces-movement', valueKind: 'word' },
  { key: 'allowed-rooms', valueKind: 'list' },
  { key: 'forbidden-rooms', valueKind: 'list' },
];

export const NPC_MANIFEST: ExtensionManifest = {
  name: 'npc',
  core: true, // auto-wired; `use npc` is a compile error, not a requirement
  traitAdjectives: [
    { word: 'guard', fields: [...NPC_COMMON_FIELDS] },
    { word: 'passive', fields: [...NPC_COMMON_FIELDS] },
    {
      word: 'wanderer',
      // move-chance is a Chord percentage (0-100); the loader converts to
      // the platform's 0-1 fraction (tested explicitly).
      fields: [{ key: 'move-chance', valueKind: 'number' }, ...NPC_COMMON_FIELDS],
    },
    {
      word: 'follower',
      fields: [{ key: 'immediate', valueKind: 'word' }, ...NPC_COMMON_FIELDS],
    },
    {
      word: 'patrol',
      fields: [
        { key: 'route', valueKind: 'list' },
        { key: 'loop', valueKind: 'word' },
        { key: 'wait-turns', valueKind: 'number' },
        ...NPC_COMMON_FIELDS,
      ],
    },
  ],
};
