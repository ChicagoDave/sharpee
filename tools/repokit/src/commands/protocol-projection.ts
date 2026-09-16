/**
 * protocol-projection.ts — the IDE's declared narrowing of the Chord Story IR.
 *
 * The native shells decode a small projection of `StoryIR`: eight shapes and
 * roughly twenty fields out of a 1,700-line schema. That projection used to
 * exist only as hand-written Swift, which is why a field rename in
 * `@sharpee/chord` could break the decoder silently — nothing compiled the two
 * against each other. Declaring it here as TypeScript, with a compile-time
 * assertion that the real `StoryIR` satisfies it, makes the rename a build
 * error in the same commit; `repokit protocol` then emits this projection to
 * each native target, so no shell hand-writes it again.
 *
 * It lives in the build tool rather than in `@sharpee/ide-protocol` because no
 * platform code produces or consumes it: the platform emits the full `StoryIR`,
 * and narrowing is a consumer-side concern belonging to the generator that
 * serves those consumers.
 *
 * Public interface: IdeStoryIR and the Ide* shapes it references.
 * Owner context: tools/repokit — the in-repo platform build tool (unpublished).
 *
 * References:
 * - ADR-341 D5 — protocol types are generated, not hand-mirrored; Swift first.
 * - ADR-258 D6 — the `compose --json` payload carries the IR the tree is built from.
 * - ADR-210 Interface Contract 1 — `@sharpee/chord` owns the IR schema.
 */
import type { Span, StoryIR } from '@sharpee/chord';

/**
 * The subset of the Story IR the native shells decode (ADR-258 D6). A member is
 * required here only when the shell cannot run without it; everything the shell
 * tolerates as absent stays optional, so a truncated payload degrades rather
 * than failing the whole decode.
 */
export interface IdeStoryIR {
  /** IR format stamp — the shell's hard wire gate. */
  format: string;
  /** Chord LANGUAGE version that compiled this story (ADR-257, informational). */
  languageVersion: string;
  meta: IdeIRMeta;
  /**
   * Present exactly when the source carried a `grammar` header (ADR-269 D8):
   * the file is a grammar file, so Build and Play are disabled for it.
   */
  grammarFile?: IdeIRGrammarFile;
  /** Authored entities, each with its exact source span (D6 navigation). */
  entities?: IdeIREntity[];
  /** `define action` blocks — the tree content for grammar files. */
  actions?: IdeIRActionDef[];
  /** The phrasebook — the Index lists KEYS only; bodies stay opaque. */
  phrases?: IdeIRPhrases;
  /** Declared hatch modules. */
  hatches?: IdeIRHatch[];
}

/** Story-block metadata: the title, plus the header fields the shells read. */
export interface IdeIRMeta {
  /** Top-level by contract — the window title reads this directly (ADR-279 A1). */
  title: string;
  fields: IdeIRStoryFields;
}

/**
 * The subset of `IRStoryFields` the shells consume. `id` names the
 * `dist/web/<id>/` bundle directory; `storyVersion` and `authors` feed the
 * build report's byline.
 */
export interface IdeIRStoryFields {
  id?: string;
  storyVersion?: string;
  authors: string[];
}

/** A grammar file's declared name (ADR-269 D8). */
export interface IdeIRGrammarFile {
  name: string;
}

/**
 * One authored entity: name, kind memberships, playable marker, region
 * members, and the exact span of its `create` block.
 */
export interface IdeIREntity {
  id: string;
  name: string;
  /**
   * `playable` (ADR-327 D10) — this character may hold the player role. Who
   * holds it is decided by the start block at runtime and is not on the IR.
   */
  isPlayable: boolean;
  kinds: IdeIRKind[];
  /**
   * Region membership (`containing …`, ADR-236) — resolved member entity ids,
   * non-empty only on region-kind entities.
   */
  containing?: IdeIRContainedMember[];
  span: Span;
}

/** A kind membership (`a room`, `a person`, …). */
export interface IdeIRKind {
  name: string;
}

/** One resolved `containing` member (a room or nested region). */
export interface IdeIRContainedMember {
  id: string;
}

/** A `define action` block with its exact span. */
export interface IdeIRActionDef {
  name: string;
  span: Span;
}

/** A declared hatch module. */
export interface IdeIRHatch {
  name: string;
  modulePath: string;
  span?: Span;
}

/**
 * The phrasebook: locale → phrase key → the phrase's span. Phrase bodies
 * (strategies, variants) are deliberately not projected — the Index lists
 * names; prose stays in the editor.
 */
export interface IdeIRPhrases {
  defaultLocale: string;
  locales: Record<string, Record<string, IdeIRPhraseName>>;
}

/** One phrase key's source location. */
export interface IdeIRPhraseName {
  span?: Span;
}

/**
 * Compile-time proof that the projection above is a true narrowing of the wire
 * type: every field it declares exists on `StoryIR` with a compatible type. A
 * field renamed or retyped in `@sharpee/chord` fails this assignment in the
 * same commit, which is the whole point of declaring the projection in
 * TypeScript rather than in each shell's own language.
 */
type AssertNarrowing<Wire, Projection> = Wire extends Projection
  ? true
  : { PROJECTION_IS_NOT_A_NARROWING_OF: Wire };

/** @internal — evaluated by the type checker; never read at runtime. */
export const STORY_IR_PROJECTION_IS_A_NARROWING: AssertNarrowing<StoryIR, IdeStoryIR> = true;
