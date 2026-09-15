/**
 * Room description event handler.
 *
 * Handles `if.event.room.description` (canonical form) and
 * `if.event.room_description` (legacy alternate).
 *
 * The heading above the description comes from `LocationHeadingBehavior.resolve`
 * and from no other route (ADR-349 D3) — this handler and stdlib's `location`
 * channel are its two consumers, which is what makes the inline heading and the
 * status line incapable of disagreeing (D3a). When no contributor supplied a
 * part, D16a's fallback applies and the handler resolves the room's name exactly
 * as it always has: the ADR-107 message id if one is present, then the literal.
 *
 * The description is resolved through the language provider when a message id is
 * present (ADR-107 dual-mode), falling back to literal text otherwise.
 *
 * Public interface: `handleRoomDescription`. Used by the pipeline's
 * event-type dispatch.
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-107 — Dual-mode literal/messageId handling
 * @see ADR-174 §Engine-internal prose pipeline (port from text-service)
 */

import type { ITextBlock } from '@sharpee/text-blocks';
import { BLOCK_KEYS } from '@sharpee/text-blocks';
import type { ISemanticEvent } from '@sharpee/core';
import type { SnippetMap } from '@sharpee/if-domain';
import { resolveSnippetDescription } from '@sharpee/stdlib';
import {
  getStateClauses,
  LocationHeadingBehavior,
  type IFEntity,
  type WorldModel,
} from '@sharpee/world-model';
import { realizeLocationHeading } from '@sharpee/lang-en-us';
import type { HandlerContext } from './types.js';
import { createBlock, createBlocks, extractValue } from '../assemble.js';
import { phraseAvailable, renderViaPhrase } from '../phrase-render.js';

/**
 * Core template id for the room description body (ADR-195). Realized through the
 * phrase pipeline so its `{slot:here}` room-occupant channel fills with the
 * presence clauses staged this turn. Registered in `@sharpee/lang-en-us`.
 */
const ROOM_DESCRIPTION_BODY_ID = 'if.room.description_body';

/**
 * Room description event data.
 *
 * Supports ADR-107 dual-mode: either literal text or message IDs for
 * localization. ID fields take precedence over literal fields if both
 * are present.
 */
interface RoomDescriptionData {
  roomId?: string;
  verbose?: boolean;
  room?: {
    id: string;
    name: string;
    description?: string;
    nameId?: string;
    descriptionId?: string;
  };
  roomName?: string;
  roomDescription?: string;
  roomNameId?: string;
  roomDescriptionId?: string;
  /** ADR-209: the room's marker→snippet table; presence triggers the splice pass. */
  roomSnippets?: SnippetMap;
}

/**
 * The current location heading's parts, or an empty list when the pipeline has
 * no world to project against (the legacy world-less construction some unit
 * tests still use) or no player is installed.
 *
 * The pipeline holds the minimal `WorldModelLike` surface; in production it IS
 * the live `WorldModel` the projection requires, which is the same narrowing the
 * slot-entry gate path already makes (`pipeline.ts:193-196`).
 *
 * @param context the handler context for this turn
 * @returns the heading's parts in emission order; empty triggers the D16a fallback
 */
function resolveHeadingParts(
  context: HandlerContext,
): ReturnType<typeof LocationHeadingBehavior.resolve> {
  const world = context.world;
  if (!world) return [];
  const player = world.getPlayer();
  if (!player) return [];
  return LocationHeadingBehavior.resolve(player as IFEntity, world as unknown as WorldModel);
}

/**
 * Handle room description events.
 */
export function handleRoomDescription(
  event: ISemanticEvent,
  context: HandlerContext,
): ITextBlock[] {
  const data = event.data as RoomDescriptionData;
  const blocks: ITextBlock[] = [];

  // Room name (if verbose).
  if (data.verbose) {
    let name: string | undefined;

    // ADR-349 D3: the authored heading, when any contributor spoke. Parts come
    // from the projection and are joined by the locale (D13); this handler
    // composes nothing itself.
    const parts = resolveHeadingParts(context);
    if (parts.length > 0) {
      name = realizeLocationHeading(parts);
    }

    // ADR-349 D16a: no contributor produced a part, so the heading falls back to
    // the room's own name — the path below, unchanged. ADR-107's message id
    // still takes precedence over the literal here, and must: the projection
    // cannot make that lookup, because `world-model` holds no language provider.
    if (!name) {
      // ADR-107: message ID takes precedence.
      const nameId = data.roomNameId ?? data.room?.nameId;
      if (nameId && context.languageProvider) {
        const resolved = context.languageProvider.getMessage(nameId, {});
        if (resolved && resolved !== nameId) {
          name = resolved;
        }
      }
    }

    if (!name) {
      name = data.room?.name ?? data.roomName;
    }

    if (name) {
      const resolvedName = extractValue(name);
      if (resolvedName) {
        blocks.push(
          createBlock(BLOCK_KEYS.ROOM_NAME, `[room:${resolvedName}]`),
        );
      }
    }
  }

  // Room description.
  let description: string | undefined;

  const descriptionId = data.roomDescriptionId ?? data.room?.descriptionId;
  if (descriptionId && context.languageProvider) {
    const resolved = context.languageProvider.getMessage(descriptionId, {});
    if (resolved && resolved !== descriptionId) {
      description = resolved;
    }
  }

  if (!description) {
    description = data.room?.description ?? data.roomDescription;
  }

  if (description) {
    const resolvedDesc = extractValue(description);
    if (resolvedDesc) {
      // ADR-209: a snippet-bearing room's description is spliced before binding —
      // stdlib's resolver (scan/gate) turns the text into a Sequence of the
      // author's prose segments and resolved snippet values. The presence gate
      // reads the render world; `{ messageId }` texts resolve through the
      // language provider (an unknown id splices nothing — AC-10). Rooms with
      // no map bind the plain string exactly as before (AC-7).
      let descriptionParam: unknown = resolvedDesc;
      const roomId = data.roomId ?? data.room?.id;
      // GH #316: the room's ADR-195 S2 state-derived detail clauses, read at the
      // render point (ADR-240 D5) so every emitter of this event — look, arrival,
      // the light-on reveal — folds them without staging anything itself. Same
      // registry examining consults; the entity is the concrete world's, so the
      // IFEntity narrowing holds whenever a world is wired.
      const roomEntity = roomId ? context.world?.getEntity(roomId) : undefined;
      const detailClauses = roomEntity ? getStateClauses(roomEntity as IFEntity) : [];
      if (data.roomSnippets && roomId && phraseAvailable(context)) {
        const lp = context.languageProvider;
        descriptionParam = resolveSnippetDescription(
          resolvedDesc,
          roomId,
          data.roomSnippets,
          context.makeRenderContext!({}).world,
          lp
            ? (id) => {
                const msg = lp.getMessage(id, {});
                return msg && msg !== id ? msg : undefined;
              }
            : undefined,
        );
      }
      // ADR-192/195: realize the description body through the phrase pipeline so
      // its `{slot:here}` occupant channel fills with the presence clauses staged
      // this turn. The room's prose is bound as a `{verbatim:description}` param;
      // the slot owns the connective grammar. Degrade to literal blocks only when
      // the pipeline has no world (the legacy string path, e.g. some unit tests).
      const descBlocks = phraseAvailable(context)
        ? renderViaPhrase(
            context,
            ROOM_DESCRIPTION_BODY_ID,
            {
              description: descriptionParam,
              ...(detailClauses.length > 0
                ? { __slots__: { detail: detailClauses.map((text) => ({ kind: 'literal', text })) } }
                : {}),
            },
            BLOCK_KEYS.ROOM_DESCRIPTION,
          ) ?? createBlocks(BLOCK_KEYS.ROOM_DESCRIPTION, resolvedDesc)
        : createBlocks(BLOCK_KEYS.ROOM_DESCRIPTION, resolvedDesc);
      // When the room name was emitted in this packet, the description's
      // first block continues the room "heading" visually — mark it tight
      // so the renderer collapses the inter-paragraph margin and the
      // description sits flush under the bold room name.
      if (descBlocks.length > 0 && blocks.length > 0) {
        descBlocks[0] = { ...descBlocks[0], tight: true };
      }
      blocks.push(...descBlocks);
    }
  }

  return blocks;
}
