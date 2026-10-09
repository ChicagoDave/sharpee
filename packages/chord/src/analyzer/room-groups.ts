/**
 * room-groups.ts — a region's `rooms` groups, expanded into ordinary room blocks.
 *
 * A group `rooms Maze 61 to 71` inside a region creates one room per number,
 * each exactly the room `create the Maze <n>` would make, taking the group's
 * body as its own and joining the region with an `in` line. Expansion runs
 * before every other analysis pass, so a created room is collected, built,
 * resolved and gated like any written block, and membership is decided in one
 * place for both groups and `in` lines. The group's description stays one
 * phrase: every created room carries the same description key.
 *
 * A group is refused, and creates nothing, when it is not in a region or its
 * range is not a plain ascending run of at most MAX_GROUP_ROOMS numbers. A
 * body line that only a single room could carry is refused at the line, and
 * the group still expands without it, so the rest of the story resolves.
 *
 * Public interface: expandRoomGroups(), RoomGroupOrigin, RoomGroupExpansion,
 * groupKeyBase(), MAX_GROUP_ROOMS.
 * Owner context: @sharpee/chord analyzer (language frontend; browser-safe).
 *
 * References:
 * - ADR-360 D1 (groups and their range), D2 (what a body holds), D4 (a room
 *   that differs joins by its own block), D7 (the missing-description
 *   warning, once per group), D8 (one shared description key).
 */
import type { CompositionItem, CreateDecl, Declaration, NameRef, RoomGroupDecl, StoryFile } from '../ast.js';
import type { DiagnosticBag } from '../diagnostics.js';
import type { Span } from '../span.js';

/**
 * The most rooms one group may create. A guard against a typo (`1 to 10000`
 * for `1 to 100`), not a language rule; it may move without an ADR.
 */
export const MAX_GROUP_ROOMS = 1000;

/** Where a created room came from. */
export interface RoomGroupOrigin {
  /** The region block the group is written in. */
  readonly region: CreateDecl;
  /** The region's entity id. */
  readonly regionId: string;
  readonly group: RoomGroupDecl;
  /** The room's position in its group, from 0. */
  readonly index: number;
  /** The group's first and last created names, with their article. */
  readonly firstName: string;
  readonly lastName: string;
  /** The one description key every room of the group carries. */
  readonly descriptionKey: string;
  /** The one `first time` key every room of the group carries. */
  readonly initialDescriptionKey: string;
}

/** The story with every group expanded, and the origin of each created room. */
export interface RoomGroupExpansion {
  readonly ast: StoryFile;
  readonly origins: ReadonlyMap<CreateDecl, RoomGroupOrigin>;
}

/**
 * The entity id a create block's name derives — the derivation the
 * analyzer's collection pass uses.
 */
function entityIdOf(words: readonly string[]): string {
  return words.join('-').toLowerCase();
}

/**
 * The prefix of a group's shared phrase keys: `<base>.description` and
 * `<base>.initial-description`.
 * @param regionId the region's entity id
 * @param group the group
 */
export function groupKeyBase(regionId: string, group: RoomGroupDecl): string {
  return `${regionId}.${entityIdOf(group.stem)}-${group.first.text}-to-${group.last.text}`;
}

function isRegionDecl(decl: CreateDecl): boolean {
  return decl.compositions.some((c) => c.article && c.words.join(' ').toLowerCase() === 'region');
}

/**
 * Every line in a group body that a group cannot carry, with what to call
 * it in the message. A group admits trait adjectives, `aka`, `room name`,
 * `first time` and a description (ADR-360 D2).
 */
function refusedBodyLines(body: CreateDecl): Array<{ what: string; span: Span }> {
  const out: Array<{ what: string; span: Span }> = [];
  const add = (what: string, items: ReadonlyArray<{ span: Span }>) => {
    for (const item of items) out.push({ what, span: item.span });
  };
  add('a kind', body.compositions.filter((c) => c.article));
  add('a `starts` state', body.startsStates);
  add('a placement', body.placementLines);
  add('an exit', body.exits);
  add('an exit table', body.exitTables);
  add('a blocked exit', body.blockedExits);
  add('a deadly exit', body.deadlyExits);
  if (body.deadly) add('a `deadly:` marker', [body.deadly]);
  add('a `states` line', body.states);
  add('a score', body.scores);
  add('a counter', body.counters);
  add('a phrase override', body.phraseOverrides.filter((o) => o.key !== 'room-name'));
  add('a clause', body.onClauses);
  add('a clause', body.timerClauses);
  add('a clause', body.moveClauses);
  add('a nested `rooms` group', body.roomGroups);
  if (body.landing) add('a `landing` line', [body.landing]);
  add('a `wears` line', body.wears);
  add('a `carries` line', body.carries);
  add('a character line', [
    ...body.pronouns,
    ...body.moods,
    ...body.feels,
    ...body.knows,
    ...body.thinks,
    ...body.spreads,
    ...body.goals,
    ...body.influences,
    ...body.resists,
    ...body.temperaments,
    ...body.nevers,
    ...body.obligations,
    ...body.codes,
    ...body.honors,
    ...body.burdens,
  ]);
  return out.sort((a, b) => a.span.line - b.span.line || a.span.column - b.span.column);
}

/**
 * The range gates. Reports and returns false when the group must not expand.
 */
function checkRange(group: RoomGroupDecl, diagnostics: DiagnosticBag): boolean {
  const stem = group.stem.join(' ');
  for (const bound of [group.first, group.last]) {
    if (bound.text.length > 1 && bound.text.startsWith('0')) {
      diagnostics.error(
        'analysis.room-group-range',
        `\`${bound.text}\` has a leading zero — the room would have to be named either \`${stem} ${bound.text}\` or \`${stem} ${bound.value}\`. Write the number without it.`,
        bound.span,
      );
      return false;
    }
  }
  if (group.first.value > group.last.value) {
    diagnostics.error(
      'analysis.room-group-range',
      `\`rooms ${stem} ${group.first.text} to ${group.last.text}\` counts down — write the smaller number first: \`rooms ${stem} ${group.last.text} to ${group.first.text}\`.`,
      group.headSpan,
    );
    return false;
  }
  const count = group.last.value - group.first.value + 1;
  if (count > MAX_GROUP_ROOMS) {
    diagnostics.error(
      'analysis.room-group-range',
      `\`rooms ${stem} ${group.first.text} to ${group.last.text}\` creates ${count} rooms — a group creates at most ${MAX_GROUP_ROOMS}. Check the range for a typo.`,
      group.headSpan,
    );
    return false;
  }
  return true;
}

/**
 * The room block `create the <stem> <n>` would be, carrying the group body's
 * admitted lines and an `in` line naming the region.
 */
function createdRoom(region: CreateDecl, group: RoomGroupDecl, n: number): CreateDecl {
  const body = group.body;
  const span = group.headSpan;
  const name: NameRef = { kind: 'name', article: 'the', words: [...group.stem, String(n)], span };
  const kind: CompositionItem = { kind: 'composition', article: 'a', words: ['room'], config: [], condition: null, span };
  const placement = { kind: 'placement' as const, relation: 'in' as const, place: region.name, span };
  return {
    ...body,
    name,
    compositions: [kind, ...body.compositions.filter((c) => !c.article)],
    aka: [...body.aka],
    startsStates: [],
    placement,
    placementLines: [placement],
    exits: [],
    exitTables: [],
    blockedExits: [],
    deadlyExits: [],
    deadly: null,
    states: [],
    scores: [],
    counters: [],
    phraseOverrides: body.phraseOverrides.filter((o) => o.key === 'room-name'),
    onClauses: [],
    timerClauses: [],
    moveClauses: [],
    roomGroups: [],
    landing: null,
    wears: [],
    carries: [],
    pronouns: [],
    moods: [],
    feels: [],
    knows: [],
    thinks: [],
    spreads: [],
    goals: [],
    influences: [],
    resists: [],
    temperaments: [],
    nevers: [],
    obligations: [],
    codes: [],
    honors: [],
    burdens: [],
    span: group.span,
  };
}

/**
 * Expand every `rooms` group into room blocks placed right after their
 * region, reporting the owner, range and body-line gates and the group's
 * missing-description warning. The input AST is not modified.
 * @param ast the parsed story, imports already spliced
 * @param diagnostics receives the group gates
 * @returns the expanded story and each created room's origin
 */
export function expandRoomGroups(ast: StoryFile, diagnostics: DiagnosticBag): RoomGroupExpansion {
  const origins = new Map<CreateDecl, RoomGroupOrigin>();
  if (!ast.declarations.some((d) => d.kind === 'create' && d.roomGroups.length > 0)) {
    return { ast, origins };
  }
  const declarations: Declaration[] = [];
  for (const decl of ast.declarations) {
    declarations.push(decl);
    if (decl.kind !== 'create' || decl.roomGroups.length === 0) continue;
    const blockName = decl.name.words.join(' ');
    if (!isRegionDecl(decl)) {
      for (const group of decl.roomGroups) {
        diagnostics.error(
          'analysis.room-group-owner',
          `A \`rooms\` group belongs in a region — \`${blockName}\` is not one. Move the group into a region block, or create the rooms one by one.`,
          group.headSpan,
        );
      }
      continue;
    }
    const regionId = entityIdOf(decl.name.words);
    for (const group of decl.roomGroups) {
      for (const refused of refusedBodyLines(group.body)) {
        diagnostics.error(
          'analysis.room-group-line',
          `A \`rooms\` group cannot hold ${refused.what} — every room a group creates is the same. Give the room that needs it its own block with \`in the ${blockName}\`, and split the group around it.`,
          refused.span,
        );
      }
      if (!checkRange(group, diagnostics)) continue;
      const stem = group.stem.join(' ');
      if (!group.body.description) {
        diagnostics.warning(
          'analysis.room-no-description',
          `The rooms \`the ${stem} ${group.first.text}\` to \`the ${stem} ${group.last.text}\` have no description, so LOOK in any of them shows only its name.`,
          group.headSpan,
        );
      }
      const keyBase = groupKeyBase(regionId, group);
      const origin = {
        region: decl,
        regionId,
        group,
        firstName: `the ${stem} ${group.first.value}`,
        lastName: `the ${stem} ${group.last.value}`,
        descriptionKey: `${keyBase}.description`,
        initialDescriptionKey: `${keyBase}.initial-description`,
      };
      for (let n = group.first.value; n <= group.last.value; n++) {
        const room = createdRoom(decl, group, n);
        origins.set(room, { ...origin, index: n - group.first.value });
        declarations.push(room);
      }
    }
  }
  return { ast: { ...ast, declarations }, origins };
}
