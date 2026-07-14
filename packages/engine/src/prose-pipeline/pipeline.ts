/**
 * Prose pipeline — orchestrates the per-turn event → block translation.
 *
 * Pipeline stages (from `processTurn`):
 *  1. Filter — drop `system.*` and `platform.*` events.
 *  2. Sort   — apply ADR-094 chain-metadata ordering.
 *  3. Route  — try the messageId path first (ADR-097), then dispatch
 *              by event type to a handler family.
 *  4. Assemble — handlers themselves call `createBlock`, so by the
 *                time blocks return here they already carry parsed
 *                bracket decorations and final `className`s.
 *
 * Public interface: `class ProsePipeline implements IProsePipeline`.
 * Engine constructs one instance during `setStory()` and calls
 * `processTurn` per turn (same three call sites as the retiring
 * `TextService`).
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-174 §Internal interfaces
 * @see ADR-094 Event Chaining (sort stage)
 * @see ADR-097 Domain Events with messageId (domain-message handler)
 */

import type { ITextBlock } from '@sharpee/text-blocks';
import type { LanguageProvider, RenderContext } from '@sharpee/if-domain';
import type { ISemanticEvent } from '@sharpee/core';
import type { WorldModel } from '@sharpee/world-model';

import { filterEvents } from './stages/filter';
import { sortEventsForProse } from './stages/sort';
import {
  createRenderWorld,
  createRenderContextFactory,
  WorldTextStateStore,
  type WorldModelLike,
} from './render-context';

import type { HandlerContext } from './handlers/types';
import { handleRoomDescription } from './handlers/room';
import { handleRevealed } from './handlers/revealed';
import {
  handleGameMessage,
  handleGenericEvent,
} from './handlers/generic';
import { handleGameStarted } from './handlers/game';
import { handlePlatformEvent } from './handlers/platform';
import { handleAudibilityHeard } from './handlers/audibility';
import { tryProcessDomainEventMessage } from './handlers/domain-message';
import { handleImplicitTake } from './handlers/implicit-take';
import { handleCommandFailed } from './handlers/command-failed';
import { handleClientQuery } from './handlers/client-query';

import type { IProsePipeline, SlotContributor, SlotEntry } from './types';

/**
 * Engine-internal prose pipeline.
 *
 * Stateless transformer: events in, blocks out. Constructed once per
 * `setStory()` call with the active language provider; called per
 * turn by `GameEngine.executeTurn`, `GameEngine.restartGame`, and
 * the meta-command path (same three sites the retired
 * `TextService.processTurn` had).
 */
export class ProsePipeline implements IProsePipeline {
  private readonly languageProvider: LanguageProvider;
  private readonly world?: WorldModelLike;
  /** Realize-time slot contributors, run in registration order each turn (ADR-195 §3). */
  private readonly slotContributors: SlotContributor[] = [];
  /**
   * Declarative slot entries (ADR-212 §1), keyed `(slotKey, owner)` — the
   * `\0`-joined memo-key shape. Last-wins on re-registration (AC-7); never
   * serialized, dropped with the pipeline on reload.
   */
  private readonly slotEntries = new Map<string, SlotEntry>();

  /**
   * @param languageProvider the active language provider (template → text)
   * @param world the read-only world model; when supplied, each turn builds a
   *   phrase-pipeline render-context factory (ADR-192, W2). Optional so legacy
   *   and test construction (string path only) keeps working without a world.
   */
  constructor(languageProvider: LanguageProvider, world?: WorldModelLike) {
    if (!languageProvider) {
      throw new Error(
        'ProsePipeline requires a LanguageProvider; got null/undefined.',
      );
    }
    this.languageProvider = languageProvider;
    this.world = world;
  }

  /**
   * Register a realize-time slot contributor (ADR-195 §3). Contributors run once
   * per turn at the top of `processTurn`, in registration order; that order feeds
   * the `(order, insertion)` tie-break of the slot store.
   *
   * @param contributor the slot contributor to run each turn.
   */
  registerSlotContributor(contributor: SlotContributor): void {
    this.slotContributors.push(contributor);
  }

  /**
   * Register a declarative slot entry (ADR-212 §1). Keyed `(slotKey, owner)`,
   * last-wins: `Map.set` replaces any prior entry under the same key, so a
   * loader re-registering on story load never double-contributes (AC-7).
   *
   * `Choice` content carries its own counter keys; the caller contract
   * (ADR-212 §4) is `entityId === owner` and `messageKey === counterKey ??
   * slotKey`. A mismatch is a silent double-counter bug, so it is warned on
   * here — never rewritten, never thrown (render-graceful posture).
   *
   * @param entry the slot entry to register (or replace).
   */
  registerSlotEntry(entry: SlotEntry): void {
    if (entry.content.kind === 'choice') {
      const expectedKey = entry.counterKey ?? entry.slotKey;
      if (
        entry.content.entityId !== entry.owner ||
        entry.content.messageKey !== expectedKey
      ) {
        // eslint-disable-next-line no-console
        console.warn(
          `[slot-entry] Choice content for ("${entry.slotKey}", "${entry.owner}") is counter-keyed ` +
            `("${entry.content.entityId}", "${entry.content.messageKey}"); expected ` +
            `("${entry.owner}", "${expectedKey}"). The counter will not track this entry's owner/counterKey.`,
        );
      }
    }
    this.slotEntries.set(`${entry.slotKey}\0${entry.owner}`, entry);
  }

  /**
   * Evaluate every registered slot entry against this turn's staging context
   * (ADR-212 §3) and contribute the content of each whose gate holds. Runs
   * BEFORE story-registered contributors — platform entries first, then
   * closures in registration order (deterministic `(order, insertion)` seq).
   *
   * Gate semantics: `owner-present` holds iff the owner shares the player's
   * containing room at staging time; an owner missing from the world resolves
   * to no room and simply never holds (AC-3 — a removed owner is inert, not an
   * error). A `predicate` gate is story/runtime code: a throw is warned and
   * treated as not-holding (render-graceful), never allowed to abort the turn.
   *
   * @param staging this turn's shared staging render context.
   */
  private stageSlotEntries(staging: RenderContext): void {
    if (this.slotEntries.size === 0) return;
    const playerId = staging.narrative?.playerId;
    const playerRoomId =
      playerId !== undefined
        ? staging.world.getContainingRoom(playerId)?.id
        : undefined;

    for (const entry of this.slotEntries.values()) {
      const gate = entry.gate ?? { kind: 'owner-present' as const };
      let holds = false;
      if (gate.kind === 'owner-present') {
        // Both rooms must EXIST and match — a roomless player never gates an
        // entry in, even against an equally roomless owner.
        holds =
          playerRoomId !== undefined &&
          staging.world.getContainingRoom(entry.owner)?.id === playerRoomId;
      } else {
        try {
          // The pipeline holds the minimal `WorldModelLike` surface; in
          // production it IS the live `WorldModel` the predicate contract
          // (ADR-212 §2) promises story code.
          holds = gate.holds(this.world as WorldModel);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn(
            `[slot-entry] predicate gate for ("${entry.slotKey}", "${entry.owner}") threw: ` +
              `${(e as Error).message}. Entry contributes nothing this turn.`,
          );
        }
      }
      if (holds) {
        staging.contribute(entry.slotKey, entry.content, { order: entry.order });
      }
    }
  }

  processTurn(events: ISemanticEvent[]): ITextBlock[] {
    const filtered = filterEvents(events);
    const sorted = sortEventsForProse(filtered);

    const makeRenderContext = this.world
      ? createRenderContextFactory(
          createRenderWorld(this.world),
          this.languageProvider.getLocaleSettings?.() ?? {},
          {
            person: this.languageProvider.getNarrativePerson?.() ?? 'third',
            playerId: this.world.getPlayer()?.id,
          },
          // ADR-196: persistent text-state store backed by the world's `textState`
          // capability — survives save/restore, unlike the turn-scoped seams.
          new WorldTextStateStore(this.world),
        )
      : undefined;

    const context: HandlerContext = {
      languageProvider: this.languageProvider,
      makeRenderContext,
    };

    // ADR-195 §3: stage realize-time slot contributions BEFORE any message
    // realizes. Declarative slot entries (ADR-212) stage first — platform
    // entries before story closures — then each contributor runs once, in
    // registration order, against a turn RenderContext whose `contribute`
    // writes the per-turn store every later message context peeks via
    // `slotContributions`. World-less pipelines have no factory, so there is
    // nothing to stage into — neither entries nor contributors run.
    if (
      makeRenderContext &&
      (this.slotEntries.size > 0 || this.slotContributors.length > 0)
    ) {
      const staging = makeRenderContext({});
      this.stageSlotEntries(staging);
      for (const contributor of this.slotContributors) {
        contributor(staging);
      }
    }

    const blocks: ITextBlock[] = [];
    for (const event of sorted) {
      blocks.push(...this.routeToHandler(event, context));
    }

    return blocks;
  }

  /**
   * Route an event to its handler family.
   *
   * Order: try the ADR-097 messageId path first (catches every stdlib
   * domain event); then fall through to type-keyed handlers; finally
   * the catch-all generic handler.
   */
  private routeToHandler(
    event: ISemanticEvent,
    context: HandlerContext,
  ): ITextBlock[] {
    const messageIdResult = tryProcessDomainEventMessage(event, context);
    if (messageIdResult) {
      return messageIdResult;
    }

    switch (event.type) {
      case 'game.started':
        return handleGameStarted(event, context);

      case 'if.event.room_description':
      case 'if.event.room.description':
        return handleRoomDescription(event, context);

      case 'game.message':
        return handleGameMessage(event, context);

      case 'if.event.revealed':
        return handleRevealed(event, context);

      // if.event.help_displayed / if.event.about_displayed carry messageIds
      // with lang-en-us templates (if.action.help.*, if.action.about.success)
      // and render via tryProcessDomainEventMessage above; their dedicated
      // handlers (help.text/about.text blocks MAIN_KEYS never routed) were
      // removed 2026-07-02 (dungeo regression findings P3).

      case 'sound.audibility.heard':
        return handleAudibilityHeard(event, context);

      case 'if.event.implicit_take':
        return handleImplicitTake(event, context);

      case 'command.failed':
        return handleCommandFailed(event, context);

      case 'client.query':
        return handleClientQuery(event, context);

      default:
        // Platform lifecycle events carry `payload` (not `data`) and render
        // via the message registered under the event type itself.
        if (event.type.startsWith('platform.')) {
          return handlePlatformEvent(event, context);
        }
        return handleGenericEvent(event, context);
    }
  }
}

/**
 * Construct a `ProsePipeline` for the given language provider.
 *
 * Mirrors the `createTextService` factory the retired text-service
 * package exposed; callers can swap one for the other without
 * changing call shapes.
 */
export function createProsePipeline(
  languageProvider: LanguageProvider,
  world?: WorldModelLike,
): IProsePipeline {
  return new ProsePipeline(languageProvider, world);
}
