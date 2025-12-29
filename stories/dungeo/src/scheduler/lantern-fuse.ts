/**
 * Lantern Battery Fuse - ADR-071 Phase 2
 *
 * The brass lantern has limited battery life (~330 turns when lit).
 * This fuse counts down while the lantern is on and pauses when off.
 *
 * Warnings at:
 * - 50 turns remaining: "Your lantern is getting dim."
 * - 20 turns remaining: "Your lantern flickers ominously."
 * - 0 turns remaining: "Your lantern flickers and goes out." (lantern dies)
 */

import { ISemanticEvent, EntityId } from '@sharpee/core';
import { WorldModel, LightSourceTrait, SwitchableTrait } from '@sharpee/world-model';
import { ISchedulerService, Fuse, SchedulerContext } from '@sharpee/engine';
import { DungeoSchedulerMessages } from './scheduler-messages';

// Fuse IDs
const LANTERN_BATTERY_FUSE = 'dungeo.lantern.battery';
const LANTERN_WARNING_DIM_FUSE = 'dungeo.lantern.warning.dim';
const LANTERN_WARNING_FLICKER_FUSE = 'dungeo.lantern.warning.flicker';

// Timing constants (in turns)
const LANTERN_INITIAL_FUEL = 330;
const WARNING_DIM_AT = 50;
const WARNING_FLICKER_AT = 20;

/**
 * Create the lantern battery fuse
 */
function createLanternBatteryFuse(lanternId: EntityId): Fuse {
  return {
    id: LANTERN_BATTERY_FUSE,
    name: 'Lantern Battery',
    turns: LANTERN_INITIAL_FUEL,
    entityId: lanternId,
    priority: 10,

    // Only tick when the lantern is actually lit
    tickCondition: (ctx: SchedulerContext): boolean => {
      const lantern = ctx.world.getEntity(lanternId);
      if (!lantern) return false;

      const lightSource = lantern.get(LightSourceTrait);
      return lightSource?.isLit === true;
    },

    // When battery dies
    trigger: (ctx: SchedulerContext): ISemanticEvent[] => {
      const lantern = ctx.world.getEntity(lanternId);
      if (!lantern) return [];

      // Turn off the lantern
      const lightSource = lantern.get(LightSourceTrait);
      const switchable = lantern.get(SwitchableTrait);

      if (lightSource) {
        lightSource.isLit = false;
        lightSource.fuelRemaining = 0;
      }
      if (switchable) {
        switchable.isOn = false;
      }

      return [{
        id: `lantern-dies-${ctx.turn}`,
        type: 'scheduler.fuse.triggered',
        timestamp: Date.now(),
        entities: { target: lanternId },
        data: {
          messageId: DungeoSchedulerMessages.LANTERN_DIES,
          fuseId: LANTERN_BATTERY_FUSE,
          isLightSource: true,
          willDarkenLocation: true
        }
      }];
    }
  };
}

/**
 * Create warning fuses (set up when main fuse is created)
 */
function createWarningFuses(
  scheduler: ISchedulerService,
  lanternId: EntityId,
  currentFuel: number
): void {
  // Dim warning at 50 turns remaining
  if (currentFuel > WARNING_DIM_AT) {
    scheduler.setFuse({
      id: LANTERN_WARNING_DIM_FUSE,
      name: 'Lantern Dim Warning',
      turns: currentFuel - WARNING_DIM_AT,
      entityId: lanternId,
      priority: 5,

      tickCondition: (ctx: SchedulerContext): boolean => {
        const lantern = ctx.world.getEntity(lanternId);
        if (!lantern) return false;
        const lightSource = lantern.get(LightSourceTrait);
        return lightSource?.isLit === true;
      },

      trigger: (ctx: SchedulerContext): ISemanticEvent[] => [{
        id: `lantern-dim-${ctx.turn}`,
        type: 'scheduler.fuse.triggered',
        timestamp: Date.now(),
        entities: { target: lanternId },
        data: {
          messageId: DungeoSchedulerMessages.LANTERN_DIM,
          fuseId: LANTERN_WARNING_DIM_FUSE
        }
      }]
    });
  }

  // Flicker warning at 20 turns remaining
  if (currentFuel > WARNING_FLICKER_AT) {
    scheduler.setFuse({
      id: LANTERN_WARNING_FLICKER_FUSE,
      name: 'Lantern Flicker Warning',
      turns: currentFuel - WARNING_FLICKER_AT,
      entityId: lanternId,
      priority: 5,

      tickCondition: (ctx: SchedulerContext): boolean => {
        const lantern = ctx.world.getEntity(lanternId);
        if (!lantern) return false;
        const lightSource = lantern.get(LightSourceTrait);
        return lightSource?.isLit === true;
      },

      trigger: (ctx: SchedulerContext): ISemanticEvent[] => [{
        id: `lantern-flicker-${ctx.turn}`,
        type: 'scheduler.fuse.triggered',
        timestamp: Date.now(),
        entities: { target: lanternId },
        data: {
          messageId: DungeoSchedulerMessages.LANTERN_FLICKERS,
          fuseId: LANTERN_WARNING_FLICKER_FUSE
        }
      }]
    });
  }
}

/**
 * Register lantern battery fuse and event handlers
 *
 * Call this from story.onEngineReady() to wire up the lantern.
 */
export function registerLanternFuse(
  scheduler: ISchedulerService,
  world: WorldModel
): void {
  // Find the lantern entity
  const lantern = world.getAllEntities().find(e => {
    const identity = e.get('identity') as { name?: string } | undefined;
    return identity?.name === 'brass lantern';
  });

  if (!lantern) {
    console.warn('Lantern not found - lantern fuse not registered');
    return;
  }

  const lanternId = lantern.id;

  // Get initial fuel from the lantern's LightSourceTrait
  const lightSource = lantern.get(LightSourceTrait);
  const initialFuel = lightSource?.fuelRemaining ?? LANTERN_INITIAL_FUEL;

  // Register the main battery fuse
  scheduler.setFuse(createLanternBatteryFuse(lanternId));

  // Register warning fuses
  createWarningFuses(scheduler, lanternId, initialFuel);

  // Register event handler to sync fuse state with lantern state
  // When lantern is turned on, ensure fuse is running
  // When lantern is turned off, pause fuse
  world.registerEventHandler('if.event.switched_on', (event, w) => {
    const data = event.data as Record<string, any> | undefined;
    const targetId = data?.target as string | undefined;

    if (targetId === lanternId) {
      // Resume fuses if paused
      scheduler.resumeFuse(LANTERN_BATTERY_FUSE);
      scheduler.resumeFuse(LANTERN_WARNING_DIM_FUSE);
      scheduler.resumeFuse(LANTERN_WARNING_FLICKER_FUSE);
    }
  });

  world.registerEventHandler('if.event.switched_off', (event, w) => {
    const data = event.data as Record<string, any> | undefined;
    const targetId = data?.target as string | undefined;

    if (targetId === lanternId) {
      // Pause fuses
      scheduler.pauseFuse(LANTERN_BATTERY_FUSE);
      scheduler.pauseFuse(LANTERN_WARNING_DIM_FUSE);
      scheduler.pauseFuse(LANTERN_WARNING_FLICKER_FUSE);
    }
  });
}

/**
 * Get the remaining battery turns for GDT display
 */
export function getLanternBatteryRemaining(scheduler: ISchedulerService): number | undefined {
  return scheduler.getFuseRemaining(LANTERN_BATTERY_FUSE);
}
