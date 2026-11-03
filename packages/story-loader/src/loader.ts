/**
 * loader.ts — the generic `Story` constructed from Chord Story IR (ADR-210).
 *
 * Purpose: interpret a compiled IR into the platform's standard story
 * lifecycle: world building (`initializeWorld`, a loop over
 * `WORLD_BUILD_STEPS` with one `BuildContext` — `build/`, ADR-389 D2),
 * player creation (`createPlayer`), phrase registration (`extendLanguage`),
 * story grammar and alterations (`extendParser`, whose body is
 * `build/grammar.ts` — ADR-270), engine wiring (`onEngineReady`, a loop
 * over `ENGINE_READY_STEPS` — `build/engine-ready/`), restore
 * reconciliation (`onWorldRestored`, whose body is `restore.ts` —
 * ADR-388 D5), channels (`registerChannels`), and endings
 * (`triggerEnding`, which lowers to stdlib's `endStory` — ADR-347 D2c).
 * When-rules, on-clause interceptors, derived properties, and the
 * evaluator bind through the runtime (`runtime.ts`). This file holds the
 * facade, its context, and no step body.
 *
 * Public interface: createStory(), ChordStory, StoryLoaderOptions.
 * Owner context: @sharpee/story-loader (language-neutral IR consumer; the
 * runtime platform never depends on this package — ADR-210 Direction rule).
 *
 * Invariants:
 * - Atomic load: any defect throws LoadError; no partial registration.
 * - No filesystem access: the loader reads only the IR it is given
 *   (the CLI/devkit owns compilation and import resolution).
 * - Every phrase key in the IR is registered with the Language Provider
 *   (given 3); blocked-exit/description text is ALSO written where the
 *   platform reads it today (dual-mode, ADR-107).
 */
import {
  IR_FORMAT,
  type IRChannelReturn,
  type IRPhrase,
  type StoryIR,
} from '@sharpee/chord';
import type { IRProseValue } from '@sharpee/chord';
import { validateIR } from '@sharpee/chord';
import type { IChannelRegistry, IOChannel } from '@sharpee/if-domain';
import { createAmbientChannel, createImageChannel, endStory, type Action } from '@sharpee/stdlib';
import type { IRestoreIdentity, IRestoreReconciliation, ISemanticEvent } from '@sharpee/core';
import type { LanguageProvider, StoryEndingKind } from '@sharpee/if-domain';
import type { Story, StoryConfig, StoryEngine } from '@sharpee/engine';
import { IFEntity, type TemperamentDef, WorldModel } from '@sharpee/world-model';
import { LoadError } from './errors.js';
import { ChordDataTrait } from './chord-data-trait.js';
import { BuildContext } from './build/context.js';
import { WORLD_BUILD_STEPS } from './build/steps.js';
import { ENGINE_READY_STEPS } from './build/engine-ready/steps.js';
import { phraseText, rewriteSnippetMarkers, snippetMarkerTest } from './build/snippets.js';
import { storyOracle } from './build/characters.js';
import { ChordDetailTrait } from './build/detail-channels.js';
import { extendGrammar } from './build/grammar.js';
import { vehiclePositionAnswer } from './build/vehicles.js';
import { assertClauseIds, assertIdentity, assertSelectIds } from './select-ids.js';
import { translateEventId } from './event-id-map.js';
import { EXTENSION_REGISTRY } from './extension-registry.js';
import { Evaluator } from './evaluator.js';
import { ChordRuntime } from './runtime.js';
import { reconcileRestoredWorld } from './restore.js';
import { withLineBreaks } from './text.js';

// The `detail` marker trait lives with the step that compiles the blocks
// (`build/detail-channels.ts`); re-exported here so the package surface
// is unchanged.
export { ChordDetailTrait };

// The `define trait` runtime instance lives in its own module so the
// dispatch-verb runtime can narrow to it without importing the loader.
export { ChordDataTrait };

export interface StoryLoaderOptions {
  /**
   * Seed for the story's random stream (`randomly`, `one chance in <n>`).
   * A fixed seed makes repeated runs byte-identical (AC-5); omitted, the
   * stream is time-seeded.
   */
  seed?: number;
  // `hatchModules` and `profile` REMOVED (ADR-361 D2/D3, 2026-10-09): Chord
  // has no hatches, so there is no module to bind and every story is pure IR.
}

/**
 * Project a `description:` value to `StoryConfig.description` (ADR-298 D3:
 * description is metadata with a single build-time value). A literal is
 * itself; a phrase reference takes the phrase's first variant text —
 * strategy variance (cycling/randomly) is an emission-time concept and
 * does not apply to static metadata. Falls back to the phrase key for a
 * ref satisfied only by phrasebook coverage (not in `ir.phrases`).
 * @param prose the typed header value, or undefined when absent
 * @param ir the story IR (phrase table lookup for references)
 * @returns the resolved description text, or undefined when absent
 */
function descriptionText(prose: IRProseValue | undefined, ir: StoryIR): string | undefined {
  if (!prose) return undefined;
  if (prose.kind === 'literal') return prose.value;
  const table = ir.phrases.locales[ir.phrases.defaultLocale] ?? {};
  return table[prose.value]?.variants[0]?.text ?? prose.value;
}

/**
 * Build a `Story` from compiled IR.
 * @param ir a gate-clean Story IR (`compile().ok` was true)
 * @param options host wiring (the random seed)
 * @throws LoadError on format mismatch (atomic load)
 */
export function createStory(ir: StoryIR, options: StoryLoaderOptions = {}): ChordStory {
  return new ChordStory(ir, options);
}

/** The generic Story implementation interpreted from IR. */
export class ChordStory implements Story {
  readonly config: StoryConfig;
  /**
   * The compile's content stamp, `ir.identity.stamp` (ADR-388 D4): the
   * engine records it in every save's metadata, and a restore whose stamp
   * differs is the reconciler's case (D5). The manifest itself is `ir.identity`.
   */
  readonly identityStamp: string;
  /** The turn-by-turn runtime (rules, on-clauses, derived properties). */
  readonly runtime: ChordRuntime;
  /** The condition evaluator — shared with the runtime; Z2 gate thunks close over it. */
  /** The expression evaluator — public beside `runtime` so hosts and tests reach its wiring seams (ADR-326 D6). */
  readonly evaluator: Evaluator;
  /**
   * The state the build steps read and write (ADR-389 D2): owned here,
   * handed to each step of `WORLD_BUILD_STEPS` and `ENGINE_READY_STEPS`,
   * to the grammar body and to the restore reconciler, and read back by
   * `createPlayer`, `characterStoryData` and the vehicle accessors.
   */
  private readonly build: BuildContext;

  /**
   * The `position` block of a `drive: state` line vehicle (ADR-366 D5a), or
   * undefined when the vehicle has none. Read by the vehicle's machine each
   * turn; the first row whose guard holds names the stop, else the fallback.
   * @param vehicleWorldId the vehicle's world entity id
   */
  getVehiclePosition(vehicleWorldId: string): { rows: Array<{ guard: (world: WorldModel) => boolean; stopId: string }>; otherwise: string } | undefined {
    return this.build.vehiclePositions.get(vehicleWorldId);
  }

  /**
   * The stop a `drive: state` line's `position` block names this turn
   * (ADR-366 D5a): the first row whose guard holds, else `otherwise`.
   * The vehicle's machine moves the vehicle there when it differs from
   * where it is.
   * @param vehicleWorldId the vehicle's world entity id
   * @param world the live world the guards read
   * @returns the stop's world id, or undefined for a vehicle with no block
   */
  vehiclePositionAnswer(vehicleWorldId: string, world: WorldModel): string | undefined {
    return vehiclePositionAnswer(this.build, vehicleWorldId, world);
  }

  private world: WorldModel | null = null;

  constructor(
    readonly ir: StoryIR,
    options: StoryLoaderOptions,
  ) {
    if (ir.format !== IR_FORMAT) {
      throw new LoadError(`Unsupported IR format \`${String(ir.format)}\` — this loader reads \`${IR_FORMAT}\`.`);
    }
    assertClauseIds(ir);
    assertSelectIds(ir);
    assertIdentity(ir);
    // ADR-389 D4: the IR's invariants have one home, `validateIR` in chord.
    // A compile reports every one of them; IR that reaches the loader
    // without a compile (the published browser build's embedded IR, a
    // hand-built fixture) is asked the same question once, here, and the
    // first error refuses the load. Warnings are the compile's to report.
    const invalid = validateIR(ir).find((d) => d.severity === 'error');
    if (invalid) throw new LoadError(invalid.message, invalid.span);
    this.identityStamp = ir.identity.stamp;
    this.config = {
      id: ir.meta.fields.id ?? ir.meta.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      title: ir.meta.title,
      authors: ir.meta.fields.authors,
      testers: ir.meta.fields.testers,
      version: ir.meta.fields.storyVersion ?? '0.0.0',
      ifid: ir.meta.fields.ifid,
      description: descriptionText(ir.meta.fields.description, ir),
      prologue: ir.meta.fields.prologue,
      // Phase 6e (#253): the transcript auto-assertion policy rides the
      // config so the test harness reads it off the loaded story; absent
      // stays absent ("let me decide" is the runner's default).
      ...(ir.meta.fields.autoAssertion !== undefined ? { autoAssertion: ir.meta.fields.autoAssertion } : {}),
    };
    this.evaluator = new Evaluator(ir, options.seed);
    this.runtime = new ChordRuntime(ir, this, this.evaluator);
    this.build = new BuildContext(ir, this.evaluator, this.runtime);
  }

  // ------------------------------------------------------------ lifecycle

  /**
   * Build the world from the IR: every stage of the build is a step of
   * `WORLD_BUILD_STEPS` (ADR-389 D2), run here in list order over this
   * story's `BuildContext` — the extensions' registrations, the entity
   * family, the story's opening state, the world-closing registrations,
   * the reference drain, the runtime bind, the tool-gated check, and the
   * start block that settles the role. The world is kept for engine-ready.
   * @param world the empty world the engine hands over
   */
  initializeWorld(world: WorldModel): void {
    this.world = world;
    for (const step of WORLD_BUILD_STEPS) step.run(this.build, world);
  }

  /**
   * Return the entity the start block gave the player role to (ADR-327 D10).
   *
   * No longer a build: under design C the engine runs `initializeWorld` first,
   * so the role-holder is an ordinary world entity by the time this is called.
   * What it still does is stamp the ROLE onto that character — the actor flag
   * and the role's own vocabulary — which is the part that moves when the role
   * moves (`GameEngine.switchPlayer`, Q2).
   *
   * @param world the world `initializeWorld` has already built
   * @returns the role-holder
   * @throws LoadError when the start block never assigned the role — the story
   *   compiled (the assignment may be conditional), but the path taken left the
   *   role empty, and there is no defaulting to fall back on
   */
  createPlayer(world: WorldModel): IFEntity {
    if (!this.build.worldBuilt) {
      throw new LoadError(
        'The world must be built before the player role is claimed — call `initializeWorld` first (ADR-327 D10).',
      );
    }
    if (!world.hasPlayerCharacter) {
      throw new LoadError(
        'No character holds the player role: the `before the game starts` block ran without assigning it. Add an unconditional `change the player to <character>`, or make sure one of its conditional arms always fires.',
        this.ir.startBlock?.span,
      );
    }
    // ADR-390 D3: the start block assigned the role through the world's one
    // writer; this is the lookup ADR-327 D10 made it. The player's self
    // aliases are stamped by the engine at install from the world's language
    // words (ADR-387 D2); the loader knows no language.
    return world.playerCharacter;
  }

  /**
   * RuntimeHost accessor (ADR-310/318 Phase 6): character story data for
   * the topic dispatch. Undefined = no character blocks, no consultation.
   * The registry is built by the start step (`build/characters.ts`).
   */
  characterStoryData(): {
    temperamentDefs?: Readonly<Record<string, TemperamentDef>>;
    isKindMember: (entityId: string, kind: string) => boolean;
  } | undefined {
    if (!this.build.characterRegistry) return undefined;
    const oracle = storyOracle(this.build);
    const temperamentDefs = this.build.characterRegistry.getTemperamentDefs();
    return {
      ...(temperamentDefs ? { temperamentDefs } : {}),
      isKindMember: (entityId, kind) => oracle.isKindMember(entityId, kind),
    };
  }

  extendLanguage(language: LanguageProvider): void {
    // `addMessage` is the concrete providers' registration surface
    // (lang-en-us et al.), not part of if-domain's read interface — probe
    // structurally so the loader stays locale-neutral.
    const registry = language as LanguageProvider & {
      addMessage?: (id: string, template: string) => void;
      registerPronounSet?: (name: string, forms: Record<string, string>) => void;
    };
    if (typeof registry.addMessage !== 'function') {
      throw new LoadError('The language provider does not support message registration (addMessage).');
    }
    const table = this.ir.phrases.locales[this.ir.phrases.defaultLocale] ?? {};
    // ADR-333 D1a: an entity's description texts live only here (the trait
    // carries the key), so the Z2 `{marker}` → `{snippet:marker}` rewrite is
    // applied to the registered template — computed from the IR alone, so
    // it holds whichever order extendLanguage and initializeWorld run in.
    // Every described entity, room or not (GH #364): the same rewrite the
    // room path always had, matched by `compileDescriptionSnippets`.
    const descriptionKeys = new Set<string>();
    for (const e of this.ir.entities) {
      if (e.descriptionKey) descriptionKeys.add(e.descriptionKey);
      if (e.initialDescriptionKey) descriptionKeys.add(e.initialDescriptionKey);
    }
    const isMarker = snippetMarkerTest(this.ir);
    for (const [key, phrase] of Object.entries(table)) {
      const template = templateFor(phrase);
      registry.addMessage(key, descriptionKeys.has(key) ? rewriteSnippetMarkers(template, isMarker) : template);
    }
    // ADR-242 D7: declared pronoun sets ride the same seam — the same
    // structural probe, throwing a legible error only when a story
    // actually declares sets the provider cannot take.
    if (this.ir.pronounSets.length > 0) {
      if (typeof registry.registerPronounSet !== 'function') {
        throw new LoadError('The language provider does not support pronoun-set registration (registerPronounSet).');
      }
      for (const set of this.ir.pronounSets) {
        registry.registerPronounSet(set.name, set.forms);
      }
    }
  }

  // getCustomVocabulary REMOVED (ADR-270 D7): `define verb` is gone from the
  // language — `extend action` registers real grammar rules instead of the
  // vocabulary-only path (which registered no rule; see ADR-270's Context).

  /**
   * Custom actions for engine registration: the `define action` dispatch
   * actions (Phase B, §5.4).
   */
  getCustomActions(): Action[] {
    return [...this.runtime.buildDispatchActions()];
  }

  /**
   * The post-restore hook (ADR-289 D2's seam): the engine fires this only
   * when a restore has fully completed; see `Story.onWorldRestored`. When
   * the save's identity stamp differs from this compile's, the reconciler
   * runs first (ADR-388 D5); then the runtime's two cross-turn counters
   * reset to what the restored turn calls for
   * (`ChordRuntime.resetAfterRestore`). The retired-key sweep that once ran
   * here is gone with its key space (ADR-388 D6); the reconciler's orphan
   * drop is its general form.
   *
   * @param world the fully restored world
   * @param restoredTurn the save's turn count
   * @param identity the engine's stamp comparison; absent (a direct call
   *   from a test) reads as matching, so nothing is reconciled
   * @returns the reconciliation report when the save was reconciled
   */
  onWorldRestored(world: WorldModel, restoredTurn: number, identity?: IRestoreIdentity): IRestoreReconciliation | undefined {
    const report = identity !== undefined && !identity.matches ? reconcileRestoredWorld(this.build, world, identity) : undefined;
    this.runtime.resetAfterRestore(restoredTurn);
    return report;
  }

  /**
   * Wire the story to the engine: every stage is a step of
   * `ENGINE_READY_STEPS` (ADR-389 D2), run here in list order over this
   * story's `BuildContext`, the built world and the engine — the engine's
   * seams into the runtime and the evaluator, the NPC behaviors and the
   * character tick phase, the state-machine, extension and scheduler
   * plugins in their tie-break order, the deadly-exit transformer and the
   * `present` slot entries. The precondition comes first, before any
   * registration touches the engine: a host that calls this before
   * `initializeWorld` gets the refusal and nothing half-wired to retry
   * against.
   * @param engine the story-facing engine role (ADR-343)
   * @throws LoadError when the world has not been built
   */
  onEngineReady(engine: StoryEngine): void {
    if (!this.world) {
      throw new LoadError('The story has no world yet: initializeWorld runs before onEngineReady.');
    }
    for (const step of ENGINE_READY_STEPS) step.run(this.build, this.world, engine);
  }

  /**
   * ADR-216 custom channels + ADR-215's third contribution part: every
   * `define channel` lowers to a real IOChannel (JSON data projection —
   * the turn's last event of the declared type, `take` fields projected
   * from its data), and every `use`d extension gets its reserved
   * `registerChannels` slot invoked (no bundled extension registers one
   * today — the leg is live but unexercised; a novel renderer would ship
   * there, keeping stories pure IR). The engine invokes this hook once at
   * start (`Story.registerChannels`, engine/src/game-engine.ts).
   *
   * ADR-241 D4: family channels (`define ambient`/`define layer`, plus
   * the implied `main` bed) register through stdlib's family builders —
   * `ambient:<word>` / `image:<word>` ids, capability gates inherited
   * from the builders (`sound` / `images`). Data channels are untouched.
   */
  registerChannels(registry: IChannelRegistry): void {
    for (const channel of this.ir.channels ?? []) {
      if (channel.family !== 'data') {
        registry.add(
          channel.family === 'ambient'
            ? createAmbientChannel(channel.name)
            : createImageChannel(channel.name),
        );
        continue;
      }
      const { returns } = channel;
      // ADR-256: the IR `fromEvent` is a dotless Chord id; match against the
      // platform runtime type (media.* → dotted; author events pass through),
      // the same translation the emit seam applies, so the two always agree.
      const fromEvent = translateEventId(channel.fromEvent);
      const definition: IOChannel = {
        id: channel.name,
        contentType: 'json',
        mode: channel.mode,
        emit: 'sparse',
        ...(channel.gatedBy ? { gatedBy: channel.gatedBy as IOChannel['gatedBy'] } : {}),
        produce: (ctx) => {
          for (let i = ctx.events.length - 1; i >= 0; i--) {
            const event = ctx.events[i];
            if (event.type !== fromEvent) continue;
            const data = (event.data ?? {}) as Record<string, unknown>;
            const value = this.evaluateChannelReturn(returns, data);
            return channel.mode === 'append' ? [value] : value;
          }
          return undefined;
        },
      };
      registry.add(definition);
    }
    for (const name of this.ir.uses ?? []) {
      EXTENSION_REGISTRY.get(name)?.registerChannels?.(registry);
    }
  }

  /**
   * Register the story's grammar — `define action` rules, passage words,
   * `extend action` lines and `remove from action` removals — on the
   * parser's story-tier builder. The body is `build/grammar.ts`
   * (ADR-389 D2); the param is the Story contract's Parser, whose
   * `getStoryGrammar` returns the real if-domain GrammarBuilder.
   * @param parser the engine's parser
   */
  extendParser(parser: Parameters<NonNullable<Story['extendParser']>>[0]): void {
    extendGrammar(this.build, parser);
  }

  // ------------------------------------------------------------- endings

  /**
   * End the story: record the Ending on the world and build the blessed
   * ending event. The caller (rule evaluator) emits it.
   *
   * This carries no implementation of its own — it lowers to stdlib's
   * `endStory` (ADR-347 D2c), exactly as the `kill` statement lowers to
   * `killPlayer`. One verb, two surfaces, nothing to drift from. The
   * first ending wins, so a story whose rules fire `win` twice in one
   * turn gets `undefined` back the second time and emits nothing.
   *
   * The phrase key rides as `endingMessageId`, NOT as a top-level
   * `messageId`: the engine's ADR-097 domain-message handler renders any
   * event carrying `data.messageId`, and the `win`/`lose` statement already
   * emits the phrase itself through the ordinary chord phrase path (as
   * `kill` does). Carrying it as `messageId` here printed every story's
   * final paragraph twice (GH #274). Clients that want to identify the
   * ending still get the key — it just no longer renders itself.
   *
   * `turn` is required and comes before the optional phrase key, because
   * {@link IStoryEnding} records the turn as a fact (ADR-347 D2d) and the
   * runtime always knows it — `core.turnNow()` answers with the engine's
   * counter when one is wired and the last tick's turn when none is.
   *
   * @param world the world that owns the Ending
   * @param ending victory or defeat
   * @param turn the turn the story ended on
   * @param messageId the ending phrase's key, when the author supplied one
   * @returns the blessed ending event, or `undefined` if the story had already ended
   */
  triggerEnding(
    world: WorldModel,
    ending: StoryEndingKind,
    turn: number,
    messageId?: string,
  ): ISemanticEvent | undefined {
    return endStory(world, ending, { turn, messageId });
  }

  // -------------------------------------------------------------- helpers

  /**
   * Evaluate a channel's `return` construct (ADR-253 D1) against an event's
   * payload to produce the channel's value:
   *  - `field`  → the raw field value (may be a non-string);
   *  - `text`   → the template with each `(slot)` replaced by its event field;
   *  - `phrase` → the named phrase's first-variant text, its `(slot)`s likewise
   *    filled from the event payload (locale-aware via `phraseText`);
   *  - `record` → an object of its members, each evaluated the same way
   *    against the same payload (ADR-300 D10). This is what closes ADR-300's
   *    platform/Chord seam: the platform could already emit record-valued
   *    channels (the banner, D7) and an author could not declare one.
   *
   * A `list of` member yields an array. An already-array field passes
   * through; a single value becomes a one-element list; an absent field
   * becomes `[]` rather than `[undefined]`, so "the event carried none"
   * reads as an empty list instead of a hole. A member whose value is
   * `undefined` is omitted from the record entirely, matching how the
   * platform's own `bannerChannel` omits absent pieces — a consumer can
   * branch on presence.
   */
  private evaluateChannelReturn(
    returns: IRChannelReturn,
    data: Record<string, unknown>,
  ): unknown {
    const fill = (template: string): string =>
      template.replace(/\(\s*([^)]+?)\s*\)/g, (_m, name: string) => {
        const v = data[name];
        return v === undefined || v === null ? '' : String(v);
      });
    switch (returns.kind) {
      case 'field':
        return data[returns.field];
      case 'text':
        return fill(returns.text);
      case 'phrase':
        return fill(phraseText(this.ir, returns.phrase));
      case 'record': {
        const record: Record<string, unknown> = {};
        for (const member of returns.members) {
          const value = this.evaluateChannelReturn(member.value, data);
          if (member.list) {
            record[member.name] =
              value === undefined || value === null
                ? []
                : Array.isArray(value)
                  ? value
                  : [value];
            continue;
          }
          if (value === undefined) continue;
          record[member.name] = value;
        }
        return record;
      }
    }
  }
}

/**
 * The Language Provider template for an IR phrase. Single-variant phrases
 * register their text (with `{br}` mapped to hard line breaks); verbatim
 * and strategy phrases register a placeholder the runtime fills at emit
 * time — a whitespace-exempt atom or a Choice atom (ADR-196).
 */
function templateFor(phrase: IRPhrase): string {
  if (phrase.verbatim) return '{verbatim:text}';
  if (phrase.strategy === null && phrase.variants.length === 1) return withLineBreaks(phrase.variants[0].text);
  return '{variants}';
}

