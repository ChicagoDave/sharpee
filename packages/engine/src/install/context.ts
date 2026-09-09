/**
 * The story-installation contract: what an install step is, what the
 * steps share while a story is installed, and what they hand the engine
 * when the list has run.
 *
 * Installing a story is an ordered list of named steps (`InstallStep`),
 * each with one reason to change and a `requires` list naming the steps
 * it must follow. A step runs over an `InstallContext`: the story being
 * installed, the collaborators the steps mutate directly (the world, the
 * parser, the language provider, the action registry, the engine's event
 * emitter), and the `StoryInstallDraft` the steps fill in. No step writes
 * engine state. The fields the engine adopts once the list has run — the
 * narrative settings, the player, the metadata, the implicit-action
 * settings — travel in the draft, and the runner hands them back as a
 * `StoryInstallResult` only when every required one is present. The
 * engine adopts the result and only then hands the story the live engine
 * (`Story.onEngineReady`), which is why that hook is not a step: it is
 * the one playthrough-side call in the sequence, and it sees an engine
 * that has finished installing.
 *
 * Public interface: `InstallStep`, `InstallContext`, `StoryInstallDraft`,
 * `StoryInstallResult`.
 * Owner context: `@sharpee/engine` — story installation.
 *
 * References: ADR-334 A1 (`installStory` decomposed on the turn's list
 * idiom); ADR-335 D1 and ADR-336 (ordered steps as data, pinned by test).
 */

import type { ISemanticEvent } from '@sharpee/core';
import type { WorldModel, IFEntity } from '@sharpee/world-model';
import type { Parser, StandardActionRegistry } from '@sharpee/stdlib';
import type { LanguageProvider } from '@sharpee/if-domain';
import type { Story, StoryConfig } from '../story.js';
import type { NarrativeSettings } from '../narrative/index.js';

/** The metadata a story's config supplies to the engine's context. */
export interface StoryMetadata {
  readonly title: string;
  readonly author: string;
  readonly version: string;
}

/**
 * What the steps fill in, field by field, for the engine to adopt.
 * Every field is optional here because the steps set them in order; the
 * runner refuses to finish without the required ones.
 */
export interface StoryInstallDraft {
  /** Set by `narrative-settings`. */
  narrativeSettings?: NarrativeSettings;
  /** Set by `create-player`. */
  player?: IFEntity;
  /** Set by `metadata`. */
  metadata?: StoryMetadata;
  /** Set by `implicit-actions`; absent when the config sets none. */
  implicitActions?: StoryConfig['implicitActions'];
}

/** What the engine adopts once every step has run. */
export interface StoryInstallResult {
  readonly story: Story;
  readonly narrativeSettings: NarrativeSettings;
  readonly player: IFEntity;
  readonly metadata: StoryMetadata;
  readonly implicitActions?: StoryConfig['implicitActions'];
}

/**
 * What one installation's steps share.
 */
export interface InstallContext {
  /** The story being installed. */
  readonly story: Story;
  /** The world the story builds into. */
  readonly world: WorldModel;
  /** The parser, when the engine has one; custom vocabulary registers on it. */
  readonly parser?: Parser;
  /** The language provider, when the engine has one; narrative settings configure it. */
  readonly languageProvider?: LanguageProvider;
  /** The registry custom actions register on. */
  readonly actionRegistry: StandardActionRegistry;
  /** Emit a game lifecycle event through the engine. */
  emitGameEvent(event: ISemanticEvent): void;
  /** The fields under construction for the engine to adopt. */
  readonly draft: StoryInstallDraft;
}

/**
 * One step of a story's installation.
 */
export interface InstallStep {
  /** The step's name; what `requires` and the order test refer to. */
  readonly name: string;
  /** Steps this one must follow, by name; empty when it reads nothing they write. */
  readonly requires: readonly string[];
  /** Run the step over the installation's context. */
  run(context: InstallContext): void;
}
