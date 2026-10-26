/**
 * @file Reading names — how a reading's entity items resolve, for ranking
 * @description Computes a reading's noun rank (ADR-386 D4): each entity item
 * of the reading — a single noun, each list item, each exclusion, an all
 * phrase, a pronoun — is named through the one noun matcher over everything
 * in the world, and the rank counts the items naming nothing, the distinct
 * entities named and the items named exactly. The parser ranks by it; the
 * validator resolves, so no entity id leaves this module.
 *
 * Public interface: ReadingNamer (rankOf).
 * Owner context: parser-en-us grammar matching (the English grammar engine
 * is the caller, once per `findMatches`).
 */

import { SlotType, type GrammarContext, type NounRank, type SlotMatch } from '@sharpee/if-domain';
import { WorldModel, matchNoun, namingSurfaceOf, type IFEntity, type NounQuery } from '@sharpee/world-model';

/** The entities one item names, and whether any at the exact tier. */
interface ItemNames {
  readonly ids: ReadonlySet<string>;
  readonly exact: boolean;
}

/** The running count over a reading's items. */
interface NameTally {
  /** Distinct entities the items name */
  entityIds: Set<string>;
  /** Names that are not entities: an all phrase, a typed or vocabulary value */
  values: number;
  unnamed: number;
  exact: number;
}

const NO_NAMES: ItemNames = { ids: new Set(), exact: false };

/** A reading's rank when no world is there to ask: nothing is counted either way. */
const NEUTRAL: NounRank = { unnamed: 0, named: 0, exact: 0 };

/** Slots whose consumer read a value: one exact name by construction. */
const VALUE_SLOT_TYPES: ReadonlySet<SlotType> = new Set([
  SlotType.NUMBER,
  SlotType.ORDINAL,
  SlotType.TIME,
  SlotType.DIRECTION,
  SlotType.MANNER,
  SlotType.VOCABULARY
]);

/** Slots that carry words, never items. */
const TEXT_SLOT_TYPES: ReadonlySet<SlotType> = new Set([SlotType.TEXT, SlotType.TEXT_GREEDY, SlotType.TOPIC, SlotType.QUOTED_TEXT]);

/**
 * The world a grammar context carries, when it is the one the matcher reads:
 * `namingSurfaceOf` needs real entities with their traits. A parser without
 * a world context, or with a stand-in, ranks neutrally.
 */
function namingWorldOf(context: GrammarContext): WorldModel | undefined {
  return context.world instanceof WorldModel ? context.world : undefined;
}

/** An item's query for the matcher: its content words after the split prefix, with the articles split off. */
function queryOf(item: SlotMatch): NounQuery {
  const prefix = (item.articles?.length ?? 0) + (item.determiners?.length ?? 0);
  return { text: item.text.split(' ').slice(prefix).join(' '), articles: item.articles ?? [] };
}

/**
 * Names the items of readings against one world, remembering each item's
 * answer for the readings that share it.
 */
export class ReadingNamer {
  private readonly world: WorldModel | undefined;
  private readonly actorId: string;
  private readonly cache = new Map<string, ItemNames>();

  constructor(context: GrammarContext) {
    this.world = namingWorldOf(context);
    this.actorId = context.actorId;
  }

  /**
   * The noun rank of a reading, or of the slots a failure had filled.
   * @param slots The slot matches of the reading
   * @returns Items naming nothing, distinct entities named, items named exactly
   */
  rankOf(slots: ReadonlyMap<string, SlotMatch>): NounRank {
    if (!this.world) return NEUTRAL;
    const tally: NameTally = { entityIds: new Set(), values: 0, unnamed: 0, exact: 0 };
    for (const match of slots.values()) {
      this.tallySlot(match, tally);
    }
    return { unnamed: tally.unnamed, named: tally.entityIds.size + tally.values, exact: tally.exact };
  }

  private tallySlot(match: SlotMatch, tally: NameTally): void {
    const slotType = match.slotType ?? SlotType.ENTITY;
    if (TEXT_SLOT_TYPES.has(slotType)) return;
    if (VALUE_SLOT_TYPES.has(slotType)) {
      tally.values++;
      tally.exact++;
      return;
    }
    if (match.isAll) {
      tally.values++;
      tally.exact++;
      for (const exclusion of match.excluded ?? []) this.tallyItem(exclusion, tally);
      return;
    }
    if (match.isList && match.items) {
      for (const item of match.items) this.tallyItem(item, tally);
      return;
    }
    this.tallyItem(match, tally);
  }

  private tallyItem(item: SlotMatch, tally: NameTally): void {
    const names = this.namesOf(item);
    if (names.ids.size === 0) {
      tally.unnamed++;
      return;
    }
    for (const id of names.ids) tally.entityIds.add(id);
    if (names.exact) tally.exact++;
  }

  /**
   * The entities one item names: a pronoun's referent, exact; a gated item's
   * admitted ids (ADR-385 D4), exact when any admitted entity is named
   * exactly; otherwise everything in the world the matcher names, at the
   * best tier any entity reaches.
   */
  private namesOf(item: SlotMatch): ItemNames {
    if (item.isPronoun && item.entityId) {
      return { ids: new Set([item.entityId]), exact: true };
    }
    const query = queryOf(item);
    if (!query.text) return NO_NAMES;
    const key = `${item.scope ? item.scope.join(',') : '*'}|${(query.articles ?? []).join(' ')}|${query.text}`;
    const remembered = this.cache.get(key);
    if (remembered) return remembered;
    const names = item.scope ? this.namesAmong(item.scope, query) : this.namesInWorld(query);
    this.cache.set(key, names);
    return names;
  }

  /** A gated item names what its gate admitted. */
  private namesAmong(admitted: readonly string[], query: NounQuery): ItemNames {
    const world = this.world!;
    const entities = admitted.map((id) => world.getEntity(id)).filter((entity): entity is IFEntity => entity !== undefined);
    const exact = entities.some((entity) => matchNoun(namingSurfaceOf(world, entity, this.actorId), query)?.tier === 'exact');
    return { ids: new Set(admitted), exact };
  }

  /** An ungated item names every entity in the world the matcher names, at the best tier reached. */
  private namesInWorld(query: NounQuery): ItemNames {
    const world = this.world!;
    const exactIds = new Set<string>();
    const wordIds = new Set<string>();
    for (const entity of world.getAllEntities()) {
      const match = matchNoun(namingSurfaceOf(world, entity, this.actorId), query);
      if (!match) continue;
      (match.tier === 'exact' ? exactIds : wordIds).add(entity.id);
    }
    if (exactIds.size > 0) return { ids: exactIds, exact: true };
    return { ids: wordIds, exact: false };
  }
}
