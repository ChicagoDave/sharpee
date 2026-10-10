/**
 * claims.ts — compile a claims fragment against its story (ADR-365 D1, D2, D7).
 *
 * Purpose: a claims fragment is a `.chord` file holding one `claims` block,
 * selected by the test manifest and never imported by the story. This entry
 * compiles the story as usual, parses the fragment, resolves every name in
 * it against the story's entities, and emits a claim set in the shape the
 * branch-tester runner takes: ids for rooms and things, verbs as written,
 * and one of seven predicate keys per claim. The story's IR is the same IR
 * `compile()` emits — a claim never reaches it, by construction.
 *
 * A predicate is lowered from the Chord condition the author wrote where one
 * exists: `X is <state>` reads X's declared states first and the platform's
 * flag words second; `X is in Y` and `X is not in Y` are placement, or the
 * player's room when X is the player; `the player has X` is carriage. Three
 * forms are claim-only: the story's ending, a person asked about a topic,
 * and a thing answering an action it declares an `on` clause for.
 *
 * Public interface: `compileClaims`, `IRClaimSet`, `IRClaim`,
 *   `ClaimsCompileResult`, `CompileClaimsOptions`.
 * Owner context: Chord language frontend. Browser-safe, filesystem-free.
 */

import type { ClaimDecl, ClaimNeedsLine, ClaimPredicateNode, ClaimsDecl, ConditionNode, NameRef, StoryFile, ValueExpr } from './ast.js';
import { Diagnostic, DiagnosticBag } from './diagnostics.js';
import type { IREntity, StoryIR } from './ir.js';
import { parseStory } from './parser.js';
import type { Span } from './span.js';
import { compile, type CompileOptions } from './index.js';

/** A claim's own needs: a key present replaces the block's key of that name. */
export interface IRClaimNeeds {
  rooms?: string[];
  things?: string[];
  verbs?: string[];
}

/** One claim, with exactly one of the seven predicate keys. */
export interface IRClaim {
  name: string;
  never?: true;
  needs?: IRClaimNeeds;
  ending?: { kind?: string };
  room?: string;
  placement?: { thing: string; in?: string; notIn?: string };
  state?: { entity: string; value: string };
  flag?: { thing: string; trait: string; field: string; value?: boolean };
  fired?: string;
  event?: { type: string; target?: string; topic?: string };
}

/** The compiled claims: the shared necessary set and the claims under it. */
export interface IRClaimSet {
  rooms: string[];
  things: string[];
  verbs: string[];
  claims: IRClaim[];
}

export interface CompileClaimsOptions extends CompileOptions {
  /** The fragment's file name, stamped on its spans and diagnostics. */
  claimsFile?: string;
}

/** The story's IR beside its compiled claims; `claims` is null unless `ok`. */
export interface ClaimsCompileResult {
  ast: StoryFile;
  ir: StoryIR;
  claims: IRClaimSet | null;
  diagnostics: readonly Diagnostic[];
  ok: boolean;
}

/** The platform's flag words a claim may use after `is`, and the trait field each reads. */
const FLAG_WORDS: Readonly<Record<string, { trait: string; field: string; value: boolean }>> = {
  open: { trait: 'openable', field: 'isOpen', value: true },
  closed: { trait: 'openable', field: 'isOpen', value: false },
  locked: { trait: 'lockable', field: 'isLocked', value: true },
  unlocked: { trait: 'lockable', field: 'isLocked', value: false },
  on: { trait: 'switchable', field: 'isOn', value: true },
  off: { trait: 'switchable', field: 'isOn', value: false },
  lit: { trait: 'lightSource', field: 'isLit', value: true },
  unlit: { trait: 'lightSource', field: 'isLit', value: false },
  worn: { trait: 'wearable', field: 'worn', value: true },
  unworn: { trait: 'wearable', field: 'worn', value: false },
  read: { trait: 'readable', field: 'hasBeenRead', value: true },
  unread: { trait: 'readable', field: 'hasBeenRead', value: false },
};

const ENDING_KINDS = new Set(['victory', 'defeat']);
const PLAYER_WORDS = new Set(['player', 'you', 'yourself']);

const SUPPORTED_FORMS =
  '`<thing> is <state>`, `<thing> is in <place>`, `<thing> is not in <room>`, `the player is in <room>`, ' +
  '`the player has <thing>`, `the story is <state>`, `the story ends in victory|defeat`, `the story has ended`, ' +
  '`<person> was asked about "<topic>"`, `<thing> has been <participle>`';

/**
 * Compile a story and the claims fragment written against it.
 *
 * @param storySource the `.story` text
 * @param claimsSource the claims fragment's text — one `claims` block
 * @param options the story's import resolver, and the fragment's file name
 * @returns the story's IR (identical to `compile()`'s), the claim set when
 *   everything resolved, and every diagnostic from both compiles
 */
export function compileClaims(storySource: string, claimsSource: string, options?: CompileClaimsOptions): ClaimsCompileResult {
  const story = compile(storySource, options);
  if (!story.ok) return { ast: story.ast, ir: story.ir, claims: null, diagnostics: story.diagnostics, ok: false };

  const bag = new DiagnosticBag();
  for (const d of story.diagnostics) bag[d.severity](d.code, d.message, d.span);

  const fragBag = new DiagnosticBag();
  const fragment = parseStory(claimsSource, fragBag);
  const file = options?.claimsFile;
  if (file !== undefined) {
    stampFile(fragment, file);
    stampFile(fragBag.all(), file);
  }
  const prefix = file !== undefined ? `[${file}] ` : '';
  for (const d of fragBag.all()) bag[d.severity](d.code, `${prefix}${d.message}`, d.span);

  if (fragment.header) {
    bag.error('claims.fragment-story', `${prefix}A claims fragment carries no story header — it is selected by the test manifest, never run as a story.`, fragment.header.span);
  }
  const blocks: ClaimsDecl[] = [];
  for (const decl of fragment.declarations) {
    if (decl.kind === 'claims') blocks.push(decl);
    else bag.error('claims.fragment-content', `${prefix}A claims fragment holds one \`claims\` block and nothing else — this \`${decl.kind}\` declaration belongs in the story or an imported fragment.`, decl.span);
  }
  if (blocks.length === 0) {
    bag.error('claims.fragment-empty', `${prefix}This claims fragment declares no \`claims\` block.`, fragment.span);
  } else if (blocks.length > 1) {
    bag.error('claims.fragment-duplicate', `${prefix}A claims fragment holds one \`claims\` block; this is the second.`, blocks[1].span);
  }
  if (bag.hasErrors() || blocks.length !== 1) {
    return { ast: story.ast, ir: story.ir, claims: null, diagnostics: bag.all(), ok: false };
  }

  const lowered = new ClaimsLowering(story.ir, bag, prefix).lower(blocks[0]);
  return { ast: story.ast, ir: story.ir, claims: bag.hasErrors() ? null : lowered, diagnostics: bag.all(), ok: !bag.hasErrors() };
}

interface EntityIndex {
  readonly entity: IREntity;
  readonly nameLower: string;
  readonly nameWords: string[];
  readonly aka: string[];
  readonly isRoom: boolean;
}

/** Resolves the fragment's names against the story and lowers each claim. */
class ClaimsLowering {
  private readonly entities: EntityIndex[];

  constructor(private readonly ir: StoryIR, private readonly bag: DiagnosticBag, private readonly prefix: string) {
    this.entities = ir.entities.map((entity) => ({
      entity,
      nameLower: entity.name.toLowerCase(),
      nameWords: entity.name.toLowerCase().split(/\s+/),
      aka: entity.aka.map((alias) => alias.toLowerCase()),
      isRoom: entity.kinds.some((kind) => kind.name === 'room'),
    }));
  }

  lower(block: ClaimsDecl): IRClaimSet {
    const shared = this.needsOf(block.needs);
    return {
      rooms: shared.rooms ?? [],
      things: shared.things ?? [],
      verbs: shared.verbs ?? [],
      claims: block.claims.map((claim) => this.lowerClaim(claim)),
    };
  }

  private error(code: string, message: string, span: Span): void {
    this.bag.error(code, `${this.prefix}${message}`, span);
  }

  private needsOf(lines: readonly ClaimNeedsLine[]): IRClaimNeeds {
    const needs: IRClaimNeeds = {};
    for (const line of lines) {
      if (line.key === 'verbs') {
        needs.verbs = [...(needs.verbs ?? []), ...line.verbs.map((verb) => verb.toLowerCase())];
        continue;
      }
      const ids: string[] = [];
      for (const ref of line.names) {
        const found = this.resolve(ref);
        if (!found) continue;
        if (found.id === 'player') {
          this.error('claims.needs-player', 'The player is always in the walk — leave the player out of `needs`.', ref.span);
          continue;
        }
        if (line.key === 'rooms' && !found.isRoom) {
          this.error('claims.needs-room-kind', `\`${ref.words.join(' ')}\` is not a room — list it under \`needs things:\`.`, ref.span);
          continue;
        }
        if (line.key === 'things' && found.isRoom) {
          this.error('claims.needs-thing-kind', `\`${ref.words.join(' ')}\` is a room — list it under \`needs rooms:\`.`, ref.span);
          continue;
        }
        ids.push(found.id);
      }
      needs[line.key] = [...(needs[line.key] ?? []), ...ids];
    }
    return needs;
  }

  private lowerClaim(claim: ClaimDecl): IRClaim {
    const out: IRClaim = { name: claim.name };
    if (claim.never) out.never = true;
    if (claim.needs.length) out.needs = this.needsOf(claim.needs);
    if (claim.predicate) Object.assign(out, this.lowerPredicate(claim.predicate, claim));
    return out;
  }

  private lowerPredicate(node: ClaimPredicateNode, claim: ClaimDecl): Partial<IRClaim> {
    switch (node.kind) {
      case 'ends': {
        if (node.ending !== null && !ENDING_KINDS.has(node.ending)) {
          this.error('claims.ending-kind', `\`${claim.name}\`: a story ends in \`victory\` or \`defeat\`, not \`${node.ending}\`.`, node.span);
          return {};
        }
        return { ending: node.ending === null ? {} : { kind: node.ending } };
      }
      case 'asked': {
        const who = this.resolve(node.who);
        if (!who) return {};
        return { event: { type: 'if.event.asked', target: who.id, topic: node.topic } };
      }
      case 'has-been': {
        const thing = this.resolve(node.thing);
        if (!thing) return {};
        if (thing.id === 'player') {
          this.error('claims.action-owner', `\`${claim.name}\`: \`has been\` names a thing with an \`on\` clause, not the player.`, node.span);
          return {};
        }
        const actions = [...new Set(thing.entity.onClauses.map((clause) => clause.action))];
        const stems = stemsOf(node.participle);
        const matches = actions.filter((action) => [...stemsOf(action)].some((stem) => stems.has(stem)));
        if (matches.length !== 1) {
          const have = actions.length ? `it answers to ${actions.map((a) => `\`${a}\``).join(', ')}` : 'it declares no `on` clause';
          this.error('claims.action-unknown', `\`${claim.name}\`: \`${node.thing.words.join(' ')}\` has no \`on\` clause matching \`${node.participle}\` — ${have}.`, node.span);
          return {};
        }
        return { fired: `${thing.id}.${matches[0]}` };
      }
      case 'condition':
        return this.lowerCondition(node.condition, claim);
    }
  }

  private lowerCondition(condition: ConditionNode, claim: ClaimDecl): Partial<IRClaim> {
    if (condition.kind !== 'predicate' || condition.subject.kind !== 'ref') {
      this.error('claims.predicate-unsupported', `\`${claim.name}\`: a claim states one of ${SUPPORTED_FORMS}.`, condition.span);
      return {};
    }
    const subjectRef = condition.subject.ref;
    const isStory = subjectRef.words.length === 1 && subjectRef.words[0].toLowerCase() === 'story';
    const predicate = condition.predicate;

    if (predicate.kind === 'is') {
      if (predicate.negated) {
        this.error('claims.predicate-negated', `\`${claim.name}\`: a claim says what holds — for what never holds, head it with \`never\` instead of \`is not\`.`, predicate.span);
        return {};
      }
      const value = valueWord(predicate.value);
      if (value === null) {
        this.error('claims.predicate-unsupported', `\`${claim.name}\`: expected a state word after \`is\`.`, predicate.span);
        return {};
      }
      if (isStory) return { state: { entity: 'story', value } };
      const subject = this.resolve(subjectRef);
      if (!subject) return {};
      if (subject.id === 'player') {
        this.error('claims.predicate-unsupported', `\`${claim.name}\`: the player has no states to claim — claim the player's room or what the player has.`, predicate.span);
        return {};
      }
      if (subject.entity.states.includes(value)) return { state: { entity: subject.id, value } };
      const flag = FLAG_WORDS[value];
      if (flag) return { flag: { thing: subject.id, trait: flag.trait, field: flag.field, value: flag.value } };
      const states = subject.entity.states.length ? ` Its states are ${subject.entity.states.map((s) => `\`${s}\``).join(', ')}.` : ' It declares no states.';
      this.error('claims.state-unknown', `\`${claim.name}\`: \`${subjectRef.words.join(' ')}\` is never \`${value}\`.${states} The platform's words are ${Object.keys(FLAG_WORDS).map((w) => `\`${w}\``).join(', ')}.`, predicate.span);
      return {};
    }

    if (predicate.kind === 'is-in') {
      if (predicate.place.kind !== 'name') {
        this.error('claims.predicate-unsupported', `\`${claim.name}\`: a claim's place is a named room or container.`, predicate.span);
        return {};
      }
      const subject = this.resolve(subjectRef);
      const place = this.resolve(predicate.place.ref);
      if (!subject || !place) return {};
      if (subject.id === 'player') {
        if (predicate.negated) {
          this.error('claims.predicate-negated', `\`${claim.name}\`: claim the room the player reaches; for a room the player never reaches, head the claim with \`never\`.`, predicate.span);
          return {};
        }
        if (!place.isRoom) {
          this.error('claims.room-expected', `\`${claim.name}\`: the player is in a room — \`${predicate.place.ref.words.join(' ')}\` is not one.`, predicate.place.span);
          return {};
        }
        return { room: place.id };
      }
      if (predicate.negated) {
        if (!place.isRoom) {
          this.error('claims.room-expected', `\`${claim.name}\`: \`is not in\` names the room a thing has left — \`${predicate.place.ref.words.join(' ')}\` is not a room.`, predicate.place.span);
          return {};
        }
        return { placement: { thing: subject.id, notIn: place.id } };
      }
      return { placement: { thing: subject.id, in: place.id === 'player' ? 'player' : place.id } };
    }

    if (predicate.kind === 'has' || predicate.kind === 'holds') {
      const holder = this.resolve(subjectRef);
      const thing = this.resolve(predicate.thing);
      if (!holder || !thing) return {};
      return { placement: { thing: thing.id, in: holder.id === 'player' ? 'player' : holder.id } };
    }

    this.error('claims.predicate-unsupported', `\`${claim.name}\`: a claim states one of ${SUPPORTED_FORMS}.`, condition.span);
    return {};
  }

  /**
   * A name to an entity: exact name, then exact alias, then a unique in-order
   * word subset — the analyzer's rule. `the player` is the role's sentinel.
   */
  private resolve(ref: NameRef): { id: string; isRoom: boolean; entity: IREntity } | null {
    const lower = ref.words.join(' ').toLowerCase();
    if (PLAYER_WORDS.has(lower)) return { id: 'player', isRoom: false, entity: PLAYER_ENTITY };
    const pick = (hits: EntityIndex[]) => (hits.length === 1 ? { id: hits[0].entity.id, isRoom: hits[0].isRoom, entity: hits[0].entity } : null);
    const exact = pick(this.entities.filter((e) => e.nameLower === lower));
    if (exact) return exact;
    const byAlias = this.entities.filter((e) => e.aka.includes(lower));
    if (byAlias.length > 1) return this.ambiguous(ref, byAlias);
    if (byAlias.length === 1) return pick(byAlias);
    const words = ref.words.map((w) => w.toLowerCase());
    const subset = this.entities.filter((e) => isInOrderSubset(words, e.nameWords));
    if (subset.length > 1) return this.ambiguous(ref, subset);
    if (subset.length === 1) return pick(subset);
    this.error('claims.unknown-entity', `No entity named \`${ref.words.join(' ')}\` in \`${this.ir.meta.title}\`.`, ref.span);
    return null;
  }

  private ambiguous(ref: NameRef, hits: EntityIndex[]): null {
    this.error('claims.ambiguous-reference', `\`${ref.words.join(' ')}\` is ambiguous — it could be ${hits.map((e) => `\`${e.nameLower}\``).join(' or ')}. Use the full name.`, ref.span);
    return null;
  }
}

/** The role's stand-in where an entity record is expected; never read for states or clauses. */
const PLAYER_ENTITY = { id: 'player', name: 'player', aka: [], kinds: [], states: [], onClauses: [] } as unknown as IREntity;

/** The word after `is`, lowercased, when the value is a bare word or a name. */
function valueWord(value: ValueExpr): string | null {
  if (value.kind === 'bare') return value.words.join(' ').toLowerCase();
  if (value.kind === 'ref') return value.ref.words.join(' ').toLowerCase();
  if (value.kind === 'literal') return value.value.toLowerCase();
  return null;
}

function isInOrderSubset(needle: string[], haystack: string[]): boolean {
  if (needle.length === 0) return false;
  let i = 0;
  for (const word of haystack) {
    if (word === needle[i]) i++;
    if (i === needle.length) return true;
  }
  return false;
}

/**
 * The stems a verb form may share with its gerund: `turned` and `turning`
 * both reach `turn`; `pruned` and `pruning` both reach `prun`; `stopped`
 * and `stopping` both reach `stop`. A loose match on purpose — the
 * candidates are only the actions the thing declares, so a wrong stem can
 * at most name an action the thing does not answer to, which is reported.
 */
function stemsOf(word: string): Set<string> {
  const w = word.toLowerCase();
  const stems = new Set<string>([w]);
  for (const suffix of ['ing', 'ed', 'en', 'd', 'e', 's']) {
    if (w.endsWith(suffix) && w.length > suffix.length + 1) {
      const stem = w.slice(0, -suffix.length);
      stems.add(stem);
      if (stem.length > 2 && stem[stem.length - 1] === stem[stem.length - 2]) stems.add(stem.slice(0, -1));
    }
  }
  return stems;
}

/** Stamp `file` onto every span under `node` that carries none. */
function stampFile(node: unknown, file: string, seen = new Set<object>()): void {
  if (node === null || typeof node !== 'object' || seen.has(node)) return;
  seen.add(node);
  if (Array.isArray(node)) {
    for (const item of node) stampFile(item, file, seen);
    return;
  }
  const record = node as Record<string, unknown>;
  if (typeof record.line === 'number' && typeof record.column === 'number' && typeof record.endLine === 'number' && typeof record.endColumn === 'number') {
    if (record.file === undefined) record.file = file;
    return;
  }
  for (const value of Object.values(record)) stampFile(value, file, seen);
}
