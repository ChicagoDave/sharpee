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
import type { LanguageProvider } from '@sharpee/if-domain';
import type { ISemanticEvent } from '@sharpee/core';

import { filterEvents } from './stages/filter';
import { sortEventsForProse } from './stages/sort';
import {
  createRenderWorld,
  createRenderContextFactory,
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
import { handleHelpDisplayed } from './handlers/help';
import { handleAboutDisplayed } from './handlers/about';
import { handleAudibilityHeard } from './handlers/audibility';
import { tryProcessDomainEventMessage } from './handlers/domain-message';
import { handleImplicitTake } from './handlers/implicit-take';
import { handleCommandFailed } from './handlers/command-failed';
import { handleClientQuery } from './handlers/client-query';

import type { IProsePipeline, SlotContributor } from './types';

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
        )
      : undefined;

    const context: HandlerContext = {
      languageProvider: this.languageProvider,
      makeRenderContext,
    };

    // ADR-195 §3: stage realize-time slot contributions BEFORE any message
    // realizes. Each contributor runs once, in registration order, against a turn
    // RenderContext whose `contribute` writes the per-turn store every later
    // message context peeks via `slotContributions`. World-less pipelines have no
    // factory, so there is nothing to stage into — contributors do not run.
    if (makeRenderContext && this.slotContributors.length > 0) {
      const staging = makeRenderContext({});
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

      case 'if.event.help_displayed':
        return handleHelpDisplayed(event, context);

      case 'if.event.about_displayed':
        return handleAboutDisplayed(event, context);

      case 'sound.audibility.heard':
        return handleAudibilityHeard(event, context);

      case 'if.event.implicit_take':
        return handleImplicitTake(event, context);

      case 'command.failed':
        return handleCommandFailed(event, context);

      case 'client.query':
        return handleClientQuery(event, context);

      default:
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
