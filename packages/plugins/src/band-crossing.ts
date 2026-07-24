/**
 * The banded-scalar crossing engine (ADR-262).
 *
 * A continuous meter — score, hunger severity, madness — is a number that moves.
 * As it moves it crosses *bands* (ranks, hunger stages) at absolute thresholds.
 * This module is the shared machinery that detects those crossings and turns
 * them into events, so each metering concept keeps only its bespoke Chord
 * surface and lowers to one engine (ADR-262 D1).
 *
 * Two responsibilities, split into two plugin factories over one detector:
 *
 *  - {@link createBandDataWatcher} emits the generic **data** event
 *    `if.event.band_crossed` carrying the whole crossed span (ADR-262 D2). It
 *    is the always-on part — a TypeScript story reads it and renders promotions
 *    itself; a Chord story gets it too.
 *  - {@link createBandNarrator} emits **narration** events carrying a messageId
 *    under the four verbosity modes (ADR-262 D3). This is the Chord render
 *    layer; a rung with no author phrase speaks an overridable platform
 *    fallback, and only `silent` suppresses.
 *
 * Both share {@link BandCrossingDetector}: rise-only (ADR-262 D5), the band is
 * derived from the value every turn via `bandOf`, and the only persisted state
 * is the last-announced band id, for crossing edge-detection across
 * save/restore.
 */

import { createEvent, type ISemanticEvent } from '@sharpee/core';
import { bandOf, type WorldModel } from '@sharpee/world-model';
import type { TurnPlugin } from './turn-plugin.js';
import type { TurnPluginContext } from './turn-plugin-context.js';

/** How a consumer narrates a crossing (ADR-262 D3). */
export type BandAnnounceMode = 'all' | 'collapsed' | 'combined' | 'silent';

/**
 * A rung the engine tracks: a stable id, its absolute threshold, an optional
 * display name (for narration params), and an optional per-band narration
 * phrase message id (the author's `says` key, resolved to a message id).
 */
export interface BandRung {
  id: string;
  threshold: number;
  name?: string;
  phraseId?: string;
}

/** The span a value crossed on one turn (ADR-262 D2). */
export interface BandCrossingSpan {
  concept: string;
  /** The band left behind (the last announced), or null from the bottom. */
  fromId: string | null;
  /** The band reached this turn. */
  toId: string;
  /** Every band entered this turn, in order — excludes `from`, includes `to`. */
  rungsCrossed: BandRung[];
  /** The scalar value at the crossing. */
  value: number;
}

/** Payload of `if.event.band_crossed` (ADR-262 D2) — ids, never display names. */
export interface BandCrossedData {
  concept: string;
  from: string | null;
  to: string;
  bandsCrossed: string[];
  value: number;
}

/** Shared configuration for both the data watcher and the narrator. */
export interface BandCrossingConfig {
  /** Unique plugin id. */
  id: string;
  /** Run order; a crossing observes a turn others produced, so keep it low. */
  priority: number;
  /** The concept name carried in the data event and params. */
  concept: string;
  /** Gate: skip entirely when the concept is not installed (e.g. scoring off). */
  isEnabled?: (world: WorldModel) => boolean;
  /** Read the current scalar value from the world. */
  value: (world: WorldModel) => number;
  /** Read the ordered bands (ascending by threshold) from the world. */
  bands: (world: WorldModel) => BandRung[];
  /**
   * Silently seed the baseline when the value is at or below this — the bottom
   * rung is where the player *starts*, so announcing it would report a
   * promotion no one earned (scoring's rung-at-0 case). Omit when the meter
   * starts below every band (hunger: severity 0 is below all rungs).
   */
  seedAtOrBelow?: number;
}

/** Serialized state: the id of the band last announced. */
export interface BandWatcherState {
  lastAnnouncedId: string | null;
}

/**
 * The crossing detector shared by both plugin factories. Holds the
 * last-announced band id, derives the current band from the value every turn,
 * and returns the crossed span on a rise (or null: not enabled, no bands, at
 * the seeded baseline, same band, or a fall).
 */
class BandCrossingDetector {
  private lastAnnouncedId: string | null = null;

  constructor(private readonly config: BandCrossingConfig) {}

  detect(world: WorldModel): BandCrossingSpan | null {
    const { config } = this;
    if (config.isEnabled && !config.isEnabled(world)) return null;

    const bands = config.bands(world);
    if (bands.length === 0) return null;

    const value = config.value(world);
    const currentIndex = bandOf(value, bands.map(b => b.threshold));

    // Baseline seed: at/below the start value, adopt the current band silently
    // so the bottom rung never fires as a promotion (ADR-262, scoring's score<=0).
    if (config.seedAtOrBelow !== undefined && value <= config.seedAtOrBelow) {
      this.lastAnnouncedId = currentIndex < 0 ? null : bands[currentIndex].id;
      return null;
    }

    // Below every band: out of the ladder entirely. Reset so a later rise reads
    // as a fresh crossing from the bottom (hunger recovering below `peckish`).
    if (currentIndex < 0) {
      this.lastAnnouncedId = null;
      return null;
    }

    const lastIndex = this.lastAnnouncedId === null
      ? -1
      : bands.findIndex(b => b.id === this.lastAnnouncedId);

    // Rise only (ADR-262 D5). Same band or a fall: track the position so
    // re-crossing announces again, but say nothing now.
    if (currentIndex <= lastIndex) {
      this.lastAnnouncedId = bands[currentIndex].id;
      return null;
    }

    const rungsCrossed = bands.slice(lastIndex + 1, currentIndex + 1);
    const fromId = lastIndex < 0 ? null : bands[lastIndex].id;
    const toId = bands[currentIndex].id;
    this.lastAnnouncedId = toId;

    return { concept: config.concept, fromId, toId, rungsCrossed, value };
  }

  getState(): BandWatcherState {
    return { lastAnnouncedId: this.lastAnnouncedId };
  }

  setState(state: unknown): void {
    this.lastAnnouncedId = (state as BandWatcherState | undefined)?.lastAnnouncedId ?? null;
  }
}

/** A plugin built from a detector plus an emit strategy. */
function makePlugin(
  config: BandCrossingConfig,
  emit: (span: BandCrossingSpan) => ISemanticEvent[],
): TurnPlugin {
  const detector = new BandCrossingDetector(config);
  return {
    id: config.id,
    priority: config.priority,
    onAfterAction(ctx: TurnPluginContext): ISemanticEvent[] {
      const span = detector.detect(ctx.world);
      return span ? emit(span) : [];
    },
    getState: () => detector.getState(),
    setState: (state: unknown) => detector.setState(state),
  };
}

/**
 * A watcher that emits the generic `if.event.band_crossed` data event on a rise
 * (ADR-262 D2). One event per turn, carrying the whole crossed span, no
 * messageId. `dataEventId` is passed in (typically `IFEvents.BAND_CROSSED`) so
 * this package stays free of if-domain.
 */
export function createBandDataWatcher(
  config: BandCrossingConfig,
  dataEventId: string,
): TurnPlugin {
  return makePlugin(config, (span) => {
    const data: BandCrossedData = {
      concept: span.concept,
      from: span.fromId,
      to: span.toId,
      bandsCrossed: span.rungsCrossed.map(r => r.id),
      value: span.value,
    };
    return [createEvent(dataEventId, data as unknown as Record<string, unknown>)];
  });
}

/** Params handed to a narration message (ADR-262 D4). */
export interface BandNarrationParams extends Record<string, unknown> {
  band: string;
  from: string | null;
  to: string;
  count: number;
  bands: string;
  value: number;
}

export interface BandNarratorConfig extends BandCrossingConfig {
  mode: BandAnnounceMode;
  /**
   * The event id carrying the narration messageId (rendered via ADR-097). Its
   * payload is `{ messageId, params }`.
   */
  narrationEventId: string;
  /** Message id spoken when a crossed rung has no author phrase (ADR-262 D3). */
  fallbackPhraseId: string;
  /** The concept-level span phrase for `combined` mode (ADR-262 D4). */
  combinedPhraseId?: string;
  /**
   * Map a rung + span to message params. Defaults to the generic
   * {@link BandNarrationParams}; a concept overrides it to match its authored
   * `says` phrases (scoring keeps `{rank}`/`{score}`).
   */
  paramsFor?: (rung: BandRung, span: BandCrossingSpan) => Record<string, unknown>;
}

/**
 * A narrator that renders a crossing under the four announce modes (ADR-262
 * D3): `all` speaks each crossed band's phrase, `collapsed` only the terminal
 * band's, `combined` one span message, `silent` nothing. A crossed rung with no
 * phrase speaks the overridable `fallbackPhraseId`, so silence comes only from
 * `silent`.
 */
export function createBandNarrator(config: BandNarratorConfig): TurnPlugin {
  const genericParams = (rung: BandRung, span: BandCrossingSpan): BandNarrationParams => ({
    band: rung.name ?? rung.id,
    from: span.fromId,
    to: span.toId,
    count: span.rungsCrossed.length,
    bands: span.rungsCrossed.map(r => r.name ?? r.id).join(', '),
    value: span.value,
  });
  const paramsFor = config.paramsFor ?? genericParams;

  const line = (messageId: string, params: Record<string, unknown>): ISemanticEvent =>
    createEvent(config.narrationEventId, { messageId, params });

  return makePlugin(config, (span) => {
    switch (config.mode) {
      case 'silent':
        return [];
      case 'all':
        return span.rungsCrossed.map(rung =>
          line(rung.phraseId ?? config.fallbackPhraseId, paramsFor(rung, span)));
      case 'collapsed': {
        const top = span.rungsCrossed[span.rungsCrossed.length - 1];
        return [line(top.phraseId ?? config.fallbackPhraseId, paramsFor(top, span))];
      }
      case 'combined': {
        const top = span.rungsCrossed[span.rungsCrossed.length - 1];
        return [line(config.combinedPhraseId ?? config.fallbackPhraseId, genericParams(top, span))];
      }
    }
  });
}
