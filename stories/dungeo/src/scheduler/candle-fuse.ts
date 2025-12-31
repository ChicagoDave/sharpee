/**
 * Candle Burning Fuse - ADR-071 Phase 2
 *
 * The candles have limited burn time (~50 turns when lit).
 * Unlike the lantern, candles cannot be relit once extinguished.
 *
 * Warnings at:
 * - 15 turns remaining: "The candles are burning low."
 * - 5 turns remaining: "The candles flicker."
 * - 0 turns remaining: "The candles sputter and go out." (candles die)
 */

import { ISemanticEvent, EntityId } from '@sharpee/core';
import { WorldModel, LightSourceTrait, SwitchableTrait, IdentityTrait } from '@sharpee/world-model';
import { ISchedulerService, Fuse, SchedulerContext } from '@sharpee/engine';
import { DungeoSchedulerMessages } from './scheduler-messages';

// Fuse IDs
const CANDLE_BURN_FUSE = 'dungeo.candles.burn';
const CANDLE_WARNING_LOW_FUSE = 'dungeo.candles.warning.low';
const CANDLE_WARNING_FLICKER_FUSE = 'dungeo.candles.warning.flicker';

// Timing constants (in turns)
const CANDLE_INITIAL_FUEL = 50;
const WARNING_LOW_AT = 15;
const WARNING_FLICKER_AT = 5;

/**
 * Create the candle burning fuse
 */
function createCandleBurnFuse(candleId: EntityId): Fuse {
  return {
    id: CANDLE_BURN_FUSE,
    name: 'Candle Burning',
    turns: CANDLE_INITIAL_FUEL,
    entityId: candleId,
    priority: 10,

    // Only tick when the candles are actually lit
    tickCondition: (ctx: SchedulerContext): boolean => {
      const candles = ctx.world.getEntity(candleId);
      if (!candles) return false;

      const lightSource = candles.get(LightSourceTrait);
      return lightSource?.isLit === true;
    },

    // When candles burn out
    trigger: (ctx: SchedulerContext): ISemanticEvent[] => {
      const candles = ctx.world.getEntity(candleId);
      if (!candles) return [];

      // Turn off and mark as dead
      const lightSource = candles.get(LightSourceTrait);
      const switchable = candles.get(SwitchableTrait);
      const identity = candles.get(IdentityTrait);

      if (lightSource) {
        lightSource.isLit = false;
        lightSource.fuelRemaining = 0;
      }
      if (switchable) {
        switchable.isOn = false;
      }

      // Update the description to reflect burned out state
      if (identity) {
        identity.description = 'A pair of burned-out candle stubs.';
        identity.name = 'burned-out candles';
      }

      // Mark as no longer lightable
      (candles as any).burnedOut = true;

      return [{
        id: `candles-out-${ctx.turn}`,
        type: 'scheduler.fuse.triggered',
        timestamp: Date.now(),
        entities: { target: candleId },
        data: {
          messageId: DungeoSchedulerMessages.CANDLES_OUT,
          fuseId: CANDLE_BURN_FUSE,
          isLightSource: true,
          willDarkenLocation: true
        }
      }];
    }
  };
}

/**
 * Create warning fuses
 */
function createWarningFuses(
  scheduler: ISchedulerService,
  candleId: EntityId,
  currentFuel: number
): void {
  // Low warning at 15 turns remaining
  if (currentFuel > WARNING_LOW_AT) {
    scheduler.setFuse({
      id: CANDLE_WARNING_LOW_FUSE,
      name: 'Candle Low Warning',
      turns: currentFuel - WARNING_LOW_AT,
      entityId: candleId,
      priority: 5,

      tickCondition: (ctx: SchedulerContext): boolean => {
        const candles = ctx.world.getEntity(candleId);
        if (!candles) return false;
        const lightSource = candles.get(LightSourceTrait);
        return lightSource?.isLit === true;
      },

      trigger: (ctx: SchedulerContext): ISemanticEvent[] => [{
        id: `candles-low-${ctx.turn}`,
        type: 'scheduler.fuse.triggered',
        timestamp: Date.now(),
        entities: { target: candleId },
        data: {
          messageId: DungeoSchedulerMessages.CANDLES_LOW,
          fuseId: CANDLE_WARNING_LOW_FUSE
        }
      }]
    });
  }

  // Flicker warning at 5 turns remaining
  if (currentFuel > WARNING_FLICKER_AT) {
    scheduler.setFuse({
      id: CANDLE_WARNING_FLICKER_FUSE,
      name: 'Candle Flicker Warning',
      turns: currentFuel - WARNING_FLICKER_AT,
      entityId: candleId,
      priority: 5,

      tickCondition: (ctx: SchedulerContext): boolean => {
        const candles = ctx.world.getEntity(candleId);
        if (!candles) return false;
        const lightSource = candles.get(LightSourceTrait);
        return lightSource?.isLit === true;
      },

      trigger: (ctx: SchedulerContext): ISemanticEvent[] => [{
        id: `candles-flicker-${ctx.turn}`,
        type: 'scheduler.fuse.triggered',
        timestamp: Date.now(),
        entities: { target: candleId },
        data: {
          messageId: DungeoSchedulerMessages.CANDLES_FLICKER,
          fuseId: CANDLE_WARNING_FLICKER_FUSE
        }
      }]
    });
  }
}

/**
 * Register candle burning fuse and event handlers
 *
 * Call this from story.onEngineReady() to wire up the candles.
 */
export function registerCandleFuse(
  scheduler: ISchedulerService,
  world: WorldModel
): void {
  // Find the candles entity
  const candles = world.getAllEntities().find(e => {
    const identity = e.get('identity') as { name?: string } | undefined;
    return identity?.name === 'pair of candles';
  });

  if (!candles) {
    console.warn('Candles not found - candle fuse not registered');
    return;
  }

  const candleId = candles.id;

  // Get initial fuel from the candles' LightSourceTrait
  const lightSource = candles.get(LightSourceTrait);
  const initialFuel = lightSource?.fuelRemaining ?? CANDLE_INITIAL_FUEL;

  // Register the main burn fuse
  scheduler.setFuse(createCandleBurnFuse(candleId));

  // Register warning fuses
  createWarningFuses(scheduler, candleId, initialFuel);

  // Register event handler to sync fuse state with candle state
  world.registerEventHandler('if.event.switched_on', (event, w) => {
    const data = event.data as Record<string, any> | undefined;
    const targetId = data?.target as string | undefined;

    if (targetId === candleId) {
      // Check if candles are burned out
      const candleEntity = w.getEntity(candleId);
      if ((candleEntity as any)?.burnedOut) {
        // Cannot light burned out candles - this should be handled by the action
        return;
      }

      // Resume fuses if paused
      scheduler.resumeFuse(CANDLE_BURN_FUSE);
      scheduler.resumeFuse(CANDLE_WARNING_LOW_FUSE);
      scheduler.resumeFuse(CANDLE_WARNING_FLICKER_FUSE);
    }
  });

  world.registerEventHandler('if.event.switched_off', (event, w) => {
    const data = event.data as Record<string, any> | undefined;
    const targetId = data?.target as string | undefined;

    if (targetId === candleId) {
      // Pause fuses
      scheduler.pauseFuse(CANDLE_BURN_FUSE);
      scheduler.pauseFuse(CANDLE_WARNING_LOW_FUSE);
      scheduler.pauseFuse(CANDLE_WARNING_FLICKER_FUSE);
    }
  });
}

/**
 * Get the remaining candle turns for GDT display
 */
export function getCandleBurnRemaining(scheduler: ISchedulerService): number | undefined {
  return scheduler.getFuseRemaining(CANDLE_BURN_FUSE);
}
