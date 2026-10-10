/**
 * claim-set.ts — the claims model and its load-time gate (ADR-365 D1, D2).
 *
 * Purpose: an author's claims about a story — what it can reach and what it
 * can never reach — each under a necessary set: the rooms, things and verbs
 * the author says are load-bearing on the way. A declaration arrives from a
 * Chord `claims` block or a test fixture and is normalized here, where
 * everything malformed is refused by name before any engine boots: a claim
 * with no name, no predicate or two predicates, or a need that is not a
 * list, is an error that names the claim and never the story.
 *
 * A claim without its own `needs` inherits the declared set; a claim that
 * names a key replaces that key and inherits the rest. Claims with the same
 * effective set share one walk, which is what `groupClaimsBySet` arranges.
 *
 * Public interface: `ClaimSetDeclaration` (the input shape), `ClaimSet`,
 *   `Claim`, `ClaimPredicate`, `NecessarySet`, `ClaimGroup`,
 *   `normalizeClaimSet`, `groupClaimsBySet`, `CLAIM_KINDS`.
 * Owner context: @sharpee/branch-tester — the claims runner (ADR-365 D10).
 */

/** The seven things a claim can be about, in the order the gate names them. */
export const CLAIM_KINDS = ['ending', 'room', 'placement', 'state', 'flag', 'fired', 'event'] as const;
export type ClaimKind = (typeof CLAIM_KINDS)[number];

/** `ending` — the story has ended, optionally so: by kind, message or cause. */
export interface EndingClaim {
  kind?: string;
  messageId?: string;
  cause?: string;
}
/** `placement` — where a thing is: `in` is `"player"` or an entity id; `notIn` a room its containing room must differ from. */
export interface PlacementClaim {
  thing: string;
  in?: string;
  notIn?: string;
}
/** `state` — a Chord state; `entity: "story"` reads the story's own state. */
export interface StateClaim {
  entity: string;
  value: string;
}
/** `flag` — a trait field such as the readable trait's `hasBeenRead`; `value` defaults to true. */
export interface FlagClaim {
  thing: string;
  trait: string;
  field: string;
  value?: unknown;
}
/** `event` — the turn that reached the state emitted the event; `target` an entity id, `topic` a case-insensitive substring. */
export interface EventClaim {
  type: string;
  target?: string;
  topic?: string;
}

/** The predicate keys a declaration may carry — exactly one of them. */
export interface ClaimPredicates {
  ending?: EndingClaim;
  room?: string;
  placement?: PlacementClaim;
  state?: StateClaim;
  flag?: FlagClaim;
  fired?: string;
  event?: EventClaim;
}

/** A claim's own needs: each key present replaces the declared set's key. */
export interface NecessarySetDeclaration {
  rooms?: readonly string[];
  things?: readonly string[];
  verbs?: readonly string[];
}

/** One claim as declared. */
export interface ClaimDeclaration extends ClaimPredicates {
  name: string;
  /** Negative: violated by the first state that satisfies it, held only by exhaustion. */
  never?: boolean;
  needs?: NecessarySetDeclaration;
}

/**
 * A claims declaration: the shared necessary set and the claims under it.
 * Ids are the compiled IR's entity ids; verbs are command prefixes.
 */
export interface ClaimSetDeclaration {
  rooms: readonly string[];
  things: readonly string[];
  verbs: readonly string[];
  claims?: readonly ClaimDeclaration[];
}

/** A normalized necessary set. */
export interface NecessarySet {
  readonly rooms: readonly string[];
  readonly things: readonly string[];
  readonly verbs: readonly string[];
}

/** A claim's one predicate, discriminated by kind. */
export type ClaimPredicate =
  | { readonly kind: 'ending'; readonly ending: EndingClaim }
  | { readonly kind: 'room'; readonly room: string }
  | { readonly kind: 'placement'; readonly placement: PlacementClaim }
  | { readonly kind: 'state'; readonly state: StateClaim }
  | { readonly kind: 'flag'; readonly flag: FlagClaim }
  | { readonly kind: 'fired'; readonly fired: string }
  | { readonly kind: 'event'; readonly event: EventClaim };

/** A normalized claim: its predicate, its polarity and its effective set. */
export interface Claim {
  /** Position in the declaration — the claim's identity inside a walk. */
  readonly index: number;
  readonly name: string;
  readonly never: boolean;
  readonly predicate: ClaimPredicate;
  /** The set this claim is walked under, after inheritance. */
  readonly set: NecessarySet;
  /** Whether the claim declared any `needs` of its own. */
  readonly ownSet: boolean;
}

/** A normalized claims declaration. */
export interface ClaimSet {
  /** Where the declaration came from, for messages (a path, a fixture name). */
  readonly source: string;
  readonly set: NecessarySet;
  readonly claims: readonly Claim[];
}

/** The claims that share one effective set, and so one walk. */
export interface ClaimGroup {
  /** `the declared set`, or `the set of "<claim name>"` for a claim's own needs. */
  readonly label: string;
  readonly set: NecessarySet;
  readonly claims: readonly Claim[];
}

const SET_KEYS = ['rooms', 'things', 'verbs'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringList(value: unknown, where: string): string[] {
  if (!Array.isArray(value)) throw new Error(`${where} must be an array`);
  return value.map((entry, i) => {
    if (typeof entry !== 'string') throw new Error(`${where}[${i}] must be a string`);
    return entry;
  });
}

function requireString(record: Record<string, unknown>, key: string, where: string): string {
  const value = record[key];
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${where} needs a string "${key}"`);
  return value;
}

function optionalString(record: Record<string, unknown>, key: string, where: string): string | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new Error(`${where} "${key}" must be a string`);
  return value;
}

/** Validate one predicate's inner shape. `where` already names the claim. */
function predicateOf(kind: ClaimKind, raw: unknown, where: string): ClaimPredicate {
  switch (kind) {
    case 'ending': {
      if (!isRecord(raw)) throw new Error(`${where} ending must be an object`);
      return { kind, ending: { kind: optionalString(raw, 'kind', `${where} ending`), messageId: optionalString(raw, 'messageId', `${where} ending`), cause: optionalString(raw, 'cause', `${where} ending`) } };
    }
    case 'room': {
      if (typeof raw !== 'string' || raw.length === 0) throw new Error(`${where} room must be a room id`);
      return { kind, room: raw };
    }
    case 'placement': {
      if (!isRecord(raw)) throw new Error(`${where} placement must be an object`);
      const thing = requireString(raw, 'thing', `${where} placement`);
      const inside = optionalString(raw, 'in', `${where} placement`);
      const notIn = optionalString(raw, 'notIn', `${where} placement`);
      if ((inside === undefined) === (notIn === undefined)) throw new Error(`${where} placement needs exactly one of "in", "notIn"`);
      return { kind, placement: { thing, ...(inside !== undefined ? { in: inside } : {}), ...(notIn !== undefined ? { notIn } : {}) } };
    }
    case 'state': {
      if (!isRecord(raw)) throw new Error(`${where} state must be an object`);
      return { kind, state: { entity: requireString(raw, 'entity', `${where} state`), value: requireString(raw, 'value', `${where} state`) } };
    }
    case 'flag': {
      if (!isRecord(raw)) throw new Error(`${where} flag must be an object`);
      return {
        kind,
        flag: {
          thing: requireString(raw, 'thing', `${where} flag`),
          trait: requireString(raw, 'trait', `${where} flag`),
          field: requireString(raw, 'field', `${where} flag`),
          ...(raw.value !== undefined ? { value: raw.value } : {}),
        },
      };
    }
    case 'fired': {
      if (typeof raw !== 'string' || raw.length === 0) throw new Error(`${where} fired must be a non-empty string`);
      return { kind, fired: raw };
    }
    case 'event': {
      if (!isRecord(raw)) throw new Error(`${where} event must be an object`);
      return { kind, event: { type: requireString(raw, 'type', `${where} event`), target: optionalString(raw, 'target', `${where} event`), topic: optionalString(raw, 'topic', `${where} event`) } };
    }
  }
}

/**
 * Normalize and validate a claims declaration.
 *
 * Every defect is refused with a message that names the claim (by name, or
 * by index when it has no name) and the key at fault. Nothing here touches a
 * story: a malformed claim is found before any engine boots.
 *
 * @param declaration the declaration as parsed, untrusted
 * @param source where it came from, for messages
 * @returns the normalized claim set, claims with their effective sets
 * @throws when the declaration or any claim is malformed
 */
export function normalizeClaimSet(declaration: unknown, source: string): ClaimSet {
  const prefix = `claims (${source}):`;
  if (!isRecord(declaration)) throw new Error(`${prefix} the declaration must be an object`);
  const declared: Record<(typeof SET_KEYS)[number], string[]> = {
    rooms: stringList(declaration.rooms, `${prefix} "rooms"`),
    things: stringList(declaration.things, `${prefix} "things"`),
    verbs: stringList(declaration.verbs, `${prefix} "verbs"`),
  };
  const rawClaims = declaration.claims === undefined ? [] : declaration.claims;
  if (!Array.isArray(rawClaims)) throw new Error(`${prefix} "claims" must be an array`);

  const claims: Claim[] = rawClaims.map((raw, index) => {
    if (!isRecord(raw) || typeof raw.name !== 'string' || raw.name.length === 0) {
      throw new Error(`${prefix} claim ${index} needs a "name"`);
    }
    const where = `${prefix} claim "${raw.name}"`;
    const kinds = CLAIM_KINDS.filter((kind) => raw[kind] !== undefined);
    if (kinds.length !== 1) throw new Error(`${where} needs exactly one of ${CLAIM_KINDS.join(', ')}`);
    if (raw.never !== undefined && typeof raw.never !== 'boolean') throw new Error(`${where} "never" must be true or false`);
    const needs = raw.needs;
    if (needs !== undefined && !isRecord(needs)) throw new Error(`${where} needs must be an object`);
    const set: Record<(typeof SET_KEYS)[number], string[]> = { rooms: declared.rooms, things: declared.things, verbs: declared.verbs };
    for (const key of SET_KEYS) {
      if (needs !== undefined && needs[key] !== undefined) set[key] = stringList(needs[key], `${where} needs.${key}`);
    }
    return {
      index,
      name: raw.name,
      never: raw.never === true,
      predicate: predicateOf(kinds[0], raw[kinds[0]], where),
      set: { rooms: set.rooms, things: set.things, verbs: set.verbs },
      ownSet: needs !== undefined,
    };
  });

  return { source, set: { rooms: declared.rooms, things: declared.things, verbs: declared.verbs }, claims };
}

/**
 * Group a claim set's claims by their effective set, so each distinct set
 * gets one walk carrying every claim that declared it. A set with no claims
 * is one group under the declared set, with nothing to settle.
 *
 * @param claimSet a normalized claim set
 * @returns one group per distinct set, in first-declared order
 */
export function groupClaimsBySet(claimSet: ClaimSet): ClaimGroup[] {
  if (claimSet.claims.length === 0) return [{ label: 'the declared set', set: claimSet.set, claims: [] }];
  const groups = new Map<string, { label: string; set: NecessarySet; claims: Claim[] }>();
  for (const claim of claimSet.claims) {
    const key = JSON.stringify([claim.set.rooms, claim.set.things, claim.set.verbs]);
    let group = groups.get(key);
    if (!group) {
      group = { label: claim.ownSet ? `the set of "${claim.name}"` : 'the declared set', set: claim.set, claims: [] };
      groups.set(key, group);
    }
    group.claims.push(claim);
  }
  return [...groups.values()];
}
