/**
 * The `character` author channel (ADR-318 D11; ADR-310 D12).
 *
 * The character model's introspection surface: projects the turn's
 * character-model events — arbiter bookkeeping (`character.author.*`)
 * and trait state transitions (`npc.character.*`) — into structured
 * per-NPC rows for authoring tools ("explain this NPC's turn"). Systemic
 * behavior that cannot be traced is indistinguishable from a bug.
 *
 * Isolation is the point (ADR-310 D12): these rows are raw model data,
 * never rendered as player prose — no row carries a message ID with a
 * player-facing rendering path. Clients that don't understand the
 * channel ignore it (additive channels don't bump the wire version).
 *
 * Public interface: characterAuthorChannel, CharacterAuthorRow.
 * Owner context: stdlib / channels
 */

import type { IOChannel } from '@sharpee/if-domain';

/** One author-channel row: one character-model event, attributed to its NPC. */
export interface CharacterAuthorRow {
  /** Turn the event fired on. */
  turn: number;
  /** The event type, e.g. 'character.author.ledger_mint'. */
  kind: string;
  /** The NPC the event is about (the event's actor). */
  npcId?: string;
  /** The event's payload, verbatim. */
  data: Record<string, unknown>;
}

/** Event-type prefixes the channel projects. */
const AUTHOR_PREFIXES = ['character.author.', 'npc.character.'];

/**
 * `character` — append-mode author-channel rows (ADR-318 D11). Carries,
 * per NPC turn: ledger mints and pins, pressure deposits and band
 * transitions, paralysis warnings (from `character.author.*`), and
 * mood/threat/lucidity/knowledge transitions (from `npc.character.*`).
 * Sparse: turns with no character-model activity emit nothing.
 */
export const characterAuthorChannel: IOChannel<CharacterAuthorRow> = {
  id: 'character',
  contentType: 'json',
  mode: 'append',
  emit: 'sparse',
  produce: (ctx) => {
    const rows: CharacterAuthorRow[] = [];
    for (const event of ctx.events) {
      if (!AUTHOR_PREFIXES.some(p => event.type.startsWith(p))) continue;
      rows.push({
        turn: ctx.turn,
        kind: event.type,
        npcId: event.entities.actor,
        data: (event.data ?? {}) as Record<string, unknown>,
      });
    }
    return rows.length > 0 ? rows : undefined;
  },
};
