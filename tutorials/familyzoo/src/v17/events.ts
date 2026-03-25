/**
 * Family Zoo — Events
 *
 * Everything that happens over time: PA announcements counting down to
 * closing, feeding time, goat bleating, the victory check, and the new
 * after-hours sequence where the zookeeper leaves and animals speak candidly.
 *
 * Public interface:
 *   createPAAnnouncementDaemon() → Daemon
 *   createFeedingTimeFuse() → Fuse
 *   createGoatBleatingDaemon() → Daemon
 *   createVictoryDaemon() → Daemon
 *   createAfterHoursDaemons(characterIds) → Daemon[]
 *   TimedMessages — message ID constants
 *   AfterHoursMessages — message ID constants (new in V17)
 *
 * Owner: familyzoo tutorial, v17
 */

import { ISemanticEvent } from '@sharpee/core';
import { IdentityTrait } from '@sharpee/world-model';
import type { Daemon, Fuse, SchedulerContext } from '@sharpee/plugin-scheduler';
import { MAX_SCORE, ScoreIds, ScorePoints, ScoreMessages } from './scoring';
import type { CharacterIds } from './characters';


// ============================================================================
// MESSAGE IDS
// ============================================================================

export const TimedMessages = {
  PA_CLOSING_3: 'zoo.pa.closing_3',
  PA_CLOSING_2: 'zoo.pa.closing_2',
  PA_CLOSING_1: 'zoo.pa.closing_1',
  PA_CLOSED: 'zoo.pa.closed',
  FEEDING_TIME: 'zoo.feeding_time.announced',
  GOATS_BLEATING: 'zoo.goats.bleating',
} as const;

export const AfterHoursMessages = {
  KEEPER_LEAVES: 'zoo.after_hours.keeper_leaves',
  GOATS_CANDID: 'zoo.after_hours.goats',
  RABBITS_CANDID: 'zoo.after_hours.rabbits',
  PARROT_CANDID: 'zoo.after_hours.parrot',
  SNAKE_CANDID: 'zoo.after_hours.snake',
} as const;


// ============================================================================
// PA ANNOUNCEMENTS — counts down to closing (from V15)
// ============================================================================

export function createPAAnnouncementDaemon(): Daemon {
  let announcementCount = 0;
  return {
    id: 'zoo.daemon.pa_announcements',
    name: 'Zoo PA Announcements',
    priority: 5,
    condition: (ctx: SchedulerContext): boolean =>
      ctx.turn > 0 && ctx.turn % 5 === 0 && announcementCount < 4,
    run: (ctx: SchedulerContext): ISemanticEvent[] => {
      announcementCount++;
      let messageId: string;
      switch (announcementCount) {
        case 1: messageId = TimedMessages.PA_CLOSING_3; break;
        case 2: messageId = TimedMessages.PA_CLOSING_2; break;
        case 3: messageId = TimedMessages.PA_CLOSING_1; break;
        default:
          messageId = TimedMessages.PA_CLOSED;
          // NEW IN V17: flip the after-hours flag when the zoo closes
          ctx.world.setStateValue('zoo.after_hours', true);
          break;
      }
      return [{ id: `zoo-pa-${ctx.turn}`, type: 'game.message', timestamp: Date.now(), entities: {}, data: { messageId }, narrate: true }];
    },
    getRunnerState(): Record<string, unknown> { return { announcementCount }; },
    restoreRunnerState(state: Record<string, unknown>): void { announcementCount = (state.announcementCount as number) ?? 0; },
  };
}


// ============================================================================
// FEEDING TIME — fuse triggers every 8 turns (from V15)
// ============================================================================

export function createFeedingTimeFuse(): Fuse {
  return {
    id: 'zoo.fuse.feeding_time',
    name: 'Feeding Time',
    turns: 10,
    repeat: true,
    originalTurns: 8,
    priority: 10,
    trigger: (ctx: SchedulerContext): ISemanticEvent[] => {
      ctx.world.setStateValue('zoo.feeding_time_active', true);
      ctx.world.setStateValue('zoo.bleat_turns_remaining', 3);
      return [{ id: `zoo-feeding-${ctx.turn}`, type: 'game.message', timestamp: Date.now(), entities: {}, data: { messageId: TimedMessages.FEEDING_TIME }, narrate: true }];
    },
  };
}


// ============================================================================
// GOAT BLEATING — daemon runs while feeding time is active (from V15)
// ============================================================================

export function createGoatBleatingDaemon(): Daemon {
  return {
    id: 'zoo.daemon.goat_bleating',
    name: 'Goat Bleating',
    priority: 3,
    condition: (ctx: SchedulerContext): boolean => {
      const feedingActive = ctx.world.getStateValue('zoo.feeding_time_active') as boolean;
      const bleatsLeft = ctx.world.getStateValue('zoo.bleat_turns_remaining') as number;
      return feedingActive === true && (bleatsLeft ?? 0) > 0;
    },
    run: (ctx: SchedulerContext): ISemanticEvent[] => {
      const bleatsLeft = (ctx.world.getStateValue('zoo.bleat_turns_remaining') as number) ?? 0;
      if (bleatsLeft <= 1) {
        ctx.world.setStateValue('zoo.feeding_time_active', false);
        ctx.world.setStateValue('zoo.bleat_turns_remaining', 0);
      } else {
        ctx.world.setStateValue('zoo.bleat_turns_remaining', bleatsLeft - 1);
      }
      const playerRoom = ctx.world.getEntity(ctx.playerLocation);
      const roomName = playerRoom?.get(IdentityTrait)?.name || '';
      if (roomName.includes('Petting Zoo')) {
        return [{ id: `zoo-bleat-${ctx.turn}`, type: 'game.message', timestamp: Date.now(), entities: {}, data: { messageId: TimedMessages.GOATS_BLEATING }, narrate: true }];
      }
      return [];
    },
  };
}


// ============================================================================
// VICTORY — checks for max score each turn (from V16)
// ============================================================================

export function createVictoryDaemon(): Daemon {
  let victoryTriggered = false;
  return {
    id: 'zoo.daemon.victory',
    name: 'Victory Check',
    priority: 100,
    condition: (ctx: SchedulerContext): boolean => {
      if (victoryTriggered) return false;
      return ctx.world.getScore() >= MAX_SCORE;
    },
    run: (ctx: SchedulerContext): ISemanticEvent[] => {
      victoryTriggered = true;
      ctx.world.setStateValue('game.victory', true);
      ctx.world.setStateValue('game.ended', true);
      return [{ id: `zoo-victory-${ctx.turn}`, type: 'game.message', timestamp: Date.now(), entities: {}, data: { messageId: ScoreMessages.VICTORY }, narrate: true }];
    },
    getRunnerState(): Record<string, unknown> { return { victoryTriggered }; },
    restoreRunnerState(state: Record<string, unknown>): void { victoryTriggered = (state.victoryTriggered as boolean) ?? false; },
  };
}


// ============================================================================
// AFTER-HOURS DAEMONS — NEW IN V17
// ============================================================================
//
// Once zoo.after_hours is true, three things happen:
//   1. The zookeeper says goodbye and vanishes (one-shot daemon)
//   2. Animals in the player's room occasionally speak candidly
//   3. The parrot's NPC behavior gets swapped (handled in index.ts via
//      the NPC plugin, not here — the daemon just sets the flag)
//
// Each candid animal line awards 5 bonus points the first time the player
// witnesses it.

export function createAfterHoursDaemons(characters: CharacterIds): Daemon[] {

  // --- Zookeeper departure (runs once) ---
  let keeperLeft = false;
  const keeperDepartureDaemon: Daemon = {
    id: 'zoo.daemon.keeper_departure',
    name: 'Zookeeper Departure',
    priority: 6,
    condition: (ctx: SchedulerContext): boolean => {
      if (keeperLeft) return false;
      return ctx.world.getStateValue('zoo.after_hours') === true;
    },
    run: (ctx: SchedulerContext): ISemanticEvent[] => {
      keeperLeft = true;

      // Award bonus if the player is in the same room as the keeper
      const keeperLocation = ctx.world.getLocation(characters.zookeeper);
      if (keeperLocation === ctx.playerLocation) {
        ctx.world.awardScore(
          ScoreIds.AFTER_HOURS_KEEPER_LEAVES,
          ScorePoints[ScoreIds.AFTER_HOURS_KEEPER_LEAVES],
          'Witnessed the zookeeper leave'
        );
      }

      // Move zookeeper off-map
      ctx.world.removeEntity(characters.zookeeper);

      return [{
        id: `zoo-keeper-leaves-${ctx.turn}`,
        type: 'game.message',
        timestamp: Date.now(),
        entities: {},
        data: { messageId: AfterHoursMessages.KEEPER_LEAVES },
        narrate: true,
      }];
    },
    getRunnerState(): Record<string, unknown> { return { keeperLeft }; },
    restoreRunnerState(state: Record<string, unknown>): void { keeperLeft = (state.keeperLeft as boolean) ?? false; },
  };

  // --- Animal candid dialogue (runs periodically after hours) ---
  //
  // Each animal speaks once when the player is in their room after hours.
  // The daemon checks all four animals each turn, so the player can
  // collect bonus points by visiting each exhibit.

  const heardAnimals: Record<string, boolean> = {};

  const animalCandidDaemon: Daemon = {
    id: 'zoo.daemon.after_hours_animals',
    name: 'After-Hours Animal Dialogue',
    priority: 7,
    condition: (ctx: SchedulerContext): boolean => {
      return ctx.world.getStateValue('zoo.after_hours') === true;
    },
    run: (ctx: SchedulerContext): ISemanticEvent[] => {
      const events: ISemanticEvent[] = [];
      const playerRoom = ctx.world.getEntity(ctx.playerLocation);
      const roomName = playerRoom?.get(IdentityTrait)?.name || '';

      // Goats — Petting Zoo
      if (roomName.includes('Petting Zoo') && !heardAnimals['goats']) {
        heardAnimals['goats'] = true;
        ctx.world.awardScore(ScoreIds.AFTER_HOURS_GOATS, ScorePoints[ScoreIds.AFTER_HOURS_GOATS], 'Heard the goats after hours');
        events.push({ id: `zoo-ah-goats-${ctx.turn}`, type: 'game.message', timestamp: Date.now(), entities: {}, data: { messageId: AfterHoursMessages.GOATS_CANDID }, narrate: true });
      }

      // Rabbits — Petting Zoo
      if (roomName.includes('Petting Zoo') && !heardAnimals['rabbits']) {
        heardAnimals['rabbits'] = true;
        ctx.world.awardScore(ScoreIds.AFTER_HOURS_RABBITS, ScorePoints[ScoreIds.AFTER_HOURS_RABBITS], 'Heard the rabbits after hours');
        events.push({ id: `zoo-ah-rabbits-${ctx.turn}`, type: 'game.message', timestamp: Date.now(), entities: {}, data: { messageId: AfterHoursMessages.RABBITS_CANDID }, narrate: true });
      }

      // Parrot — Aviary (scored here; the actual behavior swap happens separately)
      if (roomName.includes('Aviary') && !heardAnimals['parrot']) {
        heardAnimals['parrot'] = true;
        ctx.world.awardScore(ScoreIds.AFTER_HOURS_PARROT, ScorePoints[ScoreIds.AFTER_HOURS_PARROT], 'Heard the parrot after hours');
        events.push({ id: `zoo-ah-parrot-${ctx.turn}`, type: 'game.message', timestamp: Date.now(), entities: {}, data: { messageId: AfterHoursMessages.PARROT_CANDID }, narrate: true });
      }

      // Snake / Nocturnal exhibit
      if (roomName.includes('Nocturnal') && !heardAnimals['snake']) {
        heardAnimals['snake'] = true;
        ctx.world.awardScore(ScoreIds.AFTER_HOURS_SNAKE, ScorePoints[ScoreIds.AFTER_HOURS_SNAKE], 'Heard the snake after hours');
        events.push({ id: `zoo-ah-snake-${ctx.turn}`, type: 'game.message', timestamp: Date.now(), entities: {}, data: { messageId: AfterHoursMessages.SNAKE_CANDID }, narrate: true });
      }

      return events;
    },
    getRunnerState(): Record<string, unknown> { return { heardAnimals: { ...heardAnimals } }; },
    restoreRunnerState(state: Record<string, unknown>): void {
      const saved = (state.heardAnimals as Record<string, boolean>) ?? {};
      for (const key of Object.keys(saved)) heardAnimals[key] = saved[key];
    },
  };

  return [keeperDepartureDaemon, animalCandidDaemon];
}
