/**
 * Sharpee NPM Regression Test Story — "The Maintenance Facility"
 *
 * A purpose-built story that exercises every platform feature in the smallest
 * possible space. Each room, object, and NPC exists solely to test a specific
 * capability. Not intended as a playable game.
 *
 * FEATURES TESTED:
 *   1.  Rooms & navigation (4 rooms, cardinal directions)
 *   2.  Scenery (non-portable fixed objects)
 *   3.  Portable objects (take, drop, examine)
 *   4.  Containers (put in, take from)
 *   5.  Openable (open, close)
 *   6.  Lockable (lock, unlock with key)
 *   7.  Light/dark (dark room + light source)
 *   8.  Readable (read action)
 *   9.  Switchable (switch on/off)
 *   10. NPCs with autonomous behavior
 *   11. Event handlers (react to stdlib actions)
 *   12. Custom actions (story-specific grammar)
 *   13. Capability dispatch (entity-specific verb handling)
 *   14. Timed events (daemon + fuse)
 *   15. Scoring (points, score command)
 *   16. Wearable (wear, remove)
 *   17. Supporters (put on surface)
 *
 * LAYOUT:
 *   Control Room (start) --east--> Server Room
 *        |                              |
 *      south                          south
 *        |                              |
 *   Supply Closet (dark) --east--> Rooftop
 *
 * Public interface: default export of Story object
 * Owner: npm regression test suite
 */

import { Story, StoryConfig, GameEngine } from '@sharpee/engine';
import {
  WorldModel,
  IFEntity,
  EntityType,
  Direction,
  ITrait,
  IWorldModel,
  AuthorModel,
  CapabilityBehavior,
  CapabilityValidationResult,
  CapabilitySharedData,
  CapabilityEffect,
  createEffect,
  registerCapabilityBehavior,
  hasCapabilityBehavior,
  findTraitWithCapability,
  getBehaviorForCapability,
} from '@sharpee/world-model';
import {
  IdentityTrait,
  ActorTrait,
  ContainerTrait,
  SupporterTrait,
  RoomTrait,
  SceneryTrait,
  OpenableTrait,
  LockableTrait,
  DoorTrait,
  ReadableTrait,
  SwitchableTrait,
  LightSourceTrait,
  WearableTrait,
  NpcTrait,
} from '@sharpee/world-model';
import { ISemanticEvent } from '@sharpee/core';
import { NpcPlugin } from '@sharpee/plugin-npc';
import { SchedulerPlugin } from '@sharpee/plugin-scheduler';
import {
  NpcBehavior,
  NpcContext,
  NpcAction,
  Action,
  ActionContext,
  ValidationResult,
} from '@sharpee/stdlib';
import type { Parser } from '@sharpee/parser-en-us';
import type { LanguageProvider } from '@sharpee/lang-en-us';


// ============================================================================
// STORY CONFIGURATION
// ============================================================================

const config: StoryConfig = {
  id: 'regression',
  title: 'Maintenance Facility',
  author: 'Sharpee Regression Suite',
  version: '1.0.0',
  description: 'Platform regression test — every feature in four rooms.',
};


// ============================================================================
// CUSTOM TRAIT — InspectableTrait (for capability dispatch)
// ============================================================================

/**
 * A custom trait that registers the INSPECT capability.
 * When a player "inspects" an entity with this trait, the capability dispatch
 * system routes to the registered behavior.
 */
class InspectableTrait implements ITrait {
  static readonly type = 'regression.trait.inspectable' as const;
  static readonly capabilities = ['regression.action.inspecting'] as const;
  readonly type = InspectableTrait.type;
  readonly detail: string;
  constructor(detail: string) {
    this.detail = detail;
  }
}


// ============================================================================
// CAPABILITY BEHAVIOR — Inspect
// ============================================================================

const INSPECT_ACTION_ID = 'regression.action.inspecting';

const inspectBehavior: CapabilityBehavior = {
  validate(
    _entity: IFEntity,
    _world: WorldModel,
    _actorId: string,
    _sharedData: CapabilitySharedData,
  ): CapabilityValidationResult {
    return { valid: true };
  },
  execute(
    _entity: IFEntity,
    _world: WorldModel,
    _actorId: string,
    _sharedData: CapabilitySharedData,
  ): void {
    // No state change — inspect is read-only
  },
  report(
    entity: IFEntity,
    _world: WorldModel,
    _actorId: string,
    _sharedData: CapabilitySharedData,
  ): CapabilityEffect[] {
    const inspectable = entity.get(InspectableTrait);
    const detail = inspectable?.detail ?? 'Nothing notable.';
    return [
      createEffect('action.success', {
        actionId: INSPECT_ACTION_ID,
        messageId: 'regression.inspect.result',
        params: { target: entity.attributes.name || 'it', detail },
      }),
    ];
  },
  blocked(
    entity: IFEntity,
    _world: WorldModel,
    _actorId: string,
    _error: string,
    _sharedData: CapabilitySharedData,
  ): CapabilityEffect[] {
    return [
      createEffect('action.blocked', {
        actionId: INSPECT_ACTION_ID,
        messageId: 'regression.inspect.blocked',
        params: { target: entity.attributes.name || 'it' },
      }),
    ];
  },
};


// ============================================================================
// INSPECT ACTION — uses capability dispatch
// ============================================================================

const inspectAction: Action = {
  id: INSPECT_ACTION_ID,
  group: 'interaction',
  validate(context: ActionContext): ValidationResult {
    const entity = context.command.directObject?.entity;
    if (!entity) {
      return { valid: false, error: 'regression.inspect.no_target' };
    }
    const trait = findTraitWithCapability(entity, INSPECT_ACTION_ID);
    if (!trait) {
      return { valid: false, error: 'regression.inspect.not_inspectable' };
    }
    const behavior = getBehaviorForCapability(trait, INSPECT_ACTION_ID);
    if (!behavior) {
      return { valid: false, error: 'regression.inspect.not_inspectable' };
    }
    const sharedData: CapabilitySharedData = {};
    const result = behavior.validate(entity, context.world, context.player.id, sharedData);
    if (!result.valid) {
      return { valid: false, error: result.error };
    }
    context.sharedData.capEntity = entity;
    context.sharedData.capBehavior = behavior;
    context.sharedData.capSharedData = sharedData;
    return { valid: true };
  },
  execute(context: ActionContext): void {
    const entity = context.sharedData.capEntity as IFEntity;
    const behavior = context.sharedData.capBehavior as CapabilityBehavior;
    const sharedData = context.sharedData.capSharedData as CapabilitySharedData;
    if (entity && behavior) {
      behavior.execute(entity, context.world, context.player.id, sharedData);
      context.world.awardScore('inspect-server', 5, 'Inspected the server rack');
    }
  },
  report(context: ActionContext): ISemanticEvent[] {
    const entity = context.sharedData.capEntity as IFEntity;
    const behavior = context.sharedData.capBehavior as CapabilityBehavior;
    const sharedData = context.sharedData.capSharedData as CapabilitySharedData;
    if (!entity || !behavior) return [];
    const effects = behavior.report(entity, context.world, context.player.id, sharedData);
    return effects.map((effect) => context.event(effect.type, effect.payload));
  },
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [
      context.event('action.blocked', {
        messageId: result.error || 'regression.inspect.not_inspectable',
      }),
    ];
  },
};


// ============================================================================
// PING ACTION — story-specific custom action (no entity target)
// ============================================================================

const PING_ACTION_ID = 'regression.action.ping';

const pingAction: Action = {
  id: PING_ACTION_ID,
  group: 'communication',
  validate(context: ActionContext): ValidationResult {
    const loc = context.world.getLocation(context.player.id);
    if (loc !== rooftopId) {
      return { valid: false, error: 'regression.ping.wrong_room' };
    }
    return { valid: true };
  },
  execute(context: ActionContext): void {
    context.world.awardScore('ping-antenna', 10, 'Pinged the antenna');
  },
  report(context: ActionContext): ISemanticEvent[] {
    return [
      context.event('action.success', {
        messageId: 'regression.ping.success',
      }),
    ];
  },
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [
      context.event('action.blocked', {
        messageId: result.error || 'regression.ping.wrong_room',
      }),
    ];
  },
};


// ============================================================================
// ROOM IDS — set during initializeWorld, used by actions
// ============================================================================

let rooftopId = '';


// ============================================================================
// NPC BEHAVIOR — Patrol Bot
// ============================================================================

const BOT_PHRASES = [
  'BEEP. Systems nominal.',
  'BOOP. Running diagnostics.',
  'WHIRR. All sectors clear.',
];

const patrolBotBehavior: NpcBehavior = {
  id: 'regression-patrol-bot',
  name: 'Patrol Bot',
  onTurn(context: NpcContext): NpcAction[] {
    if (!context.playerVisible) return [];
    if (context.random.chance(0.6)) {
      return [
        {
          type: 'speak',
          messageId: 'npc.speech',
          data: {
            npcName: 'maintenance bot',
            text: context.random.pick(BOT_PHRASES),
          },
        },
      ];
    }
    return [];
  },
  onPlayerEnters(): NpcAction[] {
    return [
      {
        type: 'emote',
        messageId: 'npc.emote',
        data: {
          npcName: 'maintenance bot',
          text: 'The maintenance bot swivels its optical sensor toward you.',
        },
      },
    ];
  },
};


// ============================================================================
// THE STORY CLASS
// ============================================================================

class RegressionStory implements Story {
  config = config;

  /**
   * Create the player entity with standard actor traits.
   */
  createPlayer(world: WorldModel): IFEntity {
    const player = world.createEntity('yourself', EntityType.ACTOR);
    player.add(
      new IdentityTrait({
        name: 'yourself',
        description: 'A maintenance technician.',
        aliases: ['self', 'myself', 'me'],
        properName: true,
        article: '',
      }),
    );
    player.add(new ActorTrait({ isPlayer: true }));
    player.add(new ContainerTrait({ capacity: { maxItems: 10 } }));
    return player;
  }

  /**
   * Build the four-room facility and place all objects.
   */
  initializeWorld(world: WorldModel): void {
    world.setMaxScore(50);

    const player = world.getPlayer()!;

    // ---- ROOMS ----

    const controlRoom = world.createEntity('Control Room', EntityType.ROOM);
    controlRoom.add(new RoomTrait({ exits: {}, isDark: false }));
    controlRoom.add(
      new IdentityTrait({
        name: 'Control Room',
        description:
          'The main control room of the maintenance facility. Banks of monitors line the walls. A sturdy workbench dominates the center of the room. Exits lead east to the server room and south to the supply closet.',
        aliases: ['control room', 'control'],
        properName: false,
        article: 'the',
      }),
    );

    const serverRoom = world.createEntity('Server Room', EntityType.ROOM);
    serverRoom.add(new RoomTrait({ exits: {}, isDark: false }));
    serverRoom.add(
      new IdentityTrait({
        name: 'Server Room',
        description:
          'Rows of humming server racks fill this chilly room. Status LEDs blink in hypnotic patterns. A maintenance bot trundles between the racks. The control room is to the west and the rooftop is to the south.',
        aliases: ['server room', 'servers'],
        properName: false,
        article: 'the',
      }),
    );

    const supplyCloset = world.createEntity('Supply Closet', EntityType.ROOM);
    supplyCloset.add(new RoomTrait({ exits: {}, isDark: true }));
    supplyCloset.add(
      new IdentityTrait({
        name: 'Supply Closet',
        description:
          'A cramped closet lined with metal shelves. The air smells of machine oil and old circuit boards. The control room is back to the north. A passage leads east to the rooftop.',
        aliases: ['supply closet', 'closet'],
        properName: false,
        article: 'the',
      }),
    );

    const rooftop = world.createEntity('Rooftop', EntityType.ROOM);
    rooftop.add(new RoomTrait({ exits: {}, isDark: false }));
    rooftop.add(
      new IdentityTrait({
        name: 'Rooftop',
        description:
          'The flat rooftop of the facility. A large antenna array rises from a concrete base. The wind whips across the open space. Doors lead north to the server room and west to the supply closet.',
        aliases: ['rooftop', 'roof'],
        properName: false,
        article: 'the',
      }),
    );
    rooftopId = rooftop.id;

    // ---- CONNECTIONS ----

    world.connectRooms(controlRoom.id, serverRoom.id, Direction.EAST);
    world.connectRooms(controlRoom.id, supplyCloset.id, Direction.SOUTH);
    world.connectRooms(serverRoom.id, rooftop.id, Direction.SOUTH);
    world.connectRooms(supplyCloset.id, rooftop.id, Direction.EAST);

    // ---- SCENERY ----

    const monitors = world.createEntity('monitors', EntityType.ITEM);
    monitors.add(
      new IdentityTrait({
        name: 'monitors',
        description: 'A bank of CRT monitors displaying scrolling system logs.',
        aliases: ['monitors', 'screens', 'displays'],
        properName: false,
        article: 'the',
      }),
    );
    monitors.add(new SceneryTrait());
    world.moveEntity(monitors.id, controlRoom.id);

    const antenna = world.createEntity('antenna', EntityType.ITEM);
    antenna.add(
      new IdentityTrait({
        name: 'antenna array',
        description:
          'A forest of aluminum rods and dish receivers mounted on a heavy steel frame.',
        aliases: ['antenna', 'antenna array', 'array', 'dish'],
        properName: false,
        article: 'the',
      }),
    );
    antenna.add(new SceneryTrait());
    world.moveEntity(antenna.id, rooftop.id);

    // ---- SUPPORTER (workbench) ----

    const workbench = world.createEntity('workbench', EntityType.ITEM);
    workbench.add(
      new IdentityTrait({
        name: 'workbench',
        description: 'A heavy steel workbench bolted to the floor.',
        aliases: ['workbench', 'bench', 'table'],
        properName: false,
        article: 'a',
      }),
    );
    workbench.add(new SceneryTrait());
    workbench.add(new SupporterTrait({ capacity: { maxItems: 5 } }));
    world.moveEntity(workbench.id, controlRoom.id);

    // ---- PORTABLE OBJECTS ----

    const clipboard = world.createEntity('clipboard', EntityType.ITEM);
    clipboard.add(
      new IdentityTrait({
        name: 'clipboard',
        description: 'A battered metal clipboard with a maintenance checklist.',
        aliases: ['clipboard', 'checklist'],
        properName: false,
        article: 'a',
      }),
    );
    clipboard.add(
      new ReadableTrait({
        text: 'MAINTENANCE CHECKLIST:\n1. Check server rack temperatures\n2. Inspect antenna alignment\n3. Restock supply closet\n4. Run diagnostic ping',
      }),
    );
    world.moveEntity(clipboard.id, controlRoom.id);

    // ---- WEARABLE (hard hat) ----

    const hardHat = world.createEntity('hard hat', EntityType.ITEM);
    hardHat.add(
      new IdentityTrait({
        name: 'hard hat',
        description: 'A bright yellow hard hat with a facility logo.',
        aliases: ['hard hat', 'hat', 'helmet'],
        properName: false,
        article: 'a',
      }),
    );
    hardHat.add(new WearableTrait({ slot: 'head' }));
    world.moveEntity(hardHat.id, controlRoom.id);

    // ---- CONTAINER (toolbox, openable + lockable) ----

    const toolbox = world.createEntity('toolbox', EntityType.ITEM);
    toolbox.add(
      new IdentityTrait({
        name: 'toolbox',
        description: 'A red metal toolbox with a small padlock.',
        aliases: ['toolbox', 'tool box', 'box'],
        properName: false,
        article: 'a',
      }),
    );
    toolbox.add(new SceneryTrait());
    toolbox.add(new ContainerTrait({ capacity: { maxItems: 5 } }));
    toolbox.add(new OpenableTrait({ isOpen: false }));
    toolbox.add(new LockableTrait({ isLocked: true, keyId: '' })); // keyId set below
    world.moveEntity(toolbox.id, supplyCloset.id);

    // Wrench inside the toolbox (placed using AuthorModel to bypass closed-container check)
    const wrench = world.createEntity('wrench', EntityType.ITEM);
    wrench.add(
      new IdentityTrait({
        name: 'wrench',
        description: 'A heavy adjustable wrench.',
        aliases: ['wrench', 'spanner'],
        properName: false,
        article: 'a',
      }),
    );
    const authorModel = new AuthorModel(world.getDataStore());
    authorModel.moveEntity(wrench.id, toolbox.id);

    // Key for the toolbox
    const toolboxKey = world.createEntity('small key', EntityType.ITEM);
    toolboxKey.add(
      new IdentityTrait({
        name: 'small key',
        description: 'A small brass key that looks like it fits a padlock.',
        aliases: ['key', 'small key', 'brass key'],
        properName: false,
        article: 'a',
      }),
    );
    world.moveEntity(toolboxKey.id, controlRoom.id);

    // Wire up the lock
    const lockTrait = toolbox.get(LockableTrait);
    if (lockTrait) {
      lockTrait.keyId = toolboxKey.id;
    }

    // ---- SWITCHABLE + LIGHT SOURCE (flashlight) ----

    const flashlight = world.createEntity('flashlight', EntityType.ITEM);
    flashlight.add(
      new IdentityTrait({
        name: 'flashlight',
        description: 'A heavy-duty yellow flashlight.',
        aliases: ['flashlight', 'torch', 'light', 'lamp'],
        properName: false,
        article: 'a',
      }),
    );
    flashlight.add(new SwitchableTrait({ isOn: false }));
    flashlight.add(new LightSourceTrait({ brightness: 8, isLit: false }));
    world.moveEntity(flashlight.id, controlRoom.id);

    // ---- INSPECTABLE (server rack — capability dispatch) ----

    const serverRack = world.createEntity('server rack', EntityType.ITEM);
    serverRack.add(
      new IdentityTrait({
        name: 'server rack',
        description:
          'A tall black server rack with blinking LEDs. It looks like it could be inspected more closely.',
        aliases: ['server rack', 'rack', 'server', 'servers'],
        properName: false,
        article: 'a',
      }),
    );
    serverRack.add(new SceneryTrait());
    serverRack.add(new InspectableTrait('Temperature: 22°C. Load: 73%. All drives healthy.'));
    world.moveEntity(serverRack.id, serverRoom.id);

    // Register capability behavior
    if (!hasCapabilityBehavior(InspectableTrait.type, INSPECT_ACTION_ID)) {
      registerCapabilityBehavior(InspectableTrait.type, INSPECT_ACTION_ID, inspectBehavior);
    }

    // ---- NPC (maintenance bot) ----

    const bot = world.createEntity('maintenance bot', EntityType.ACTOR);
    bot.add(
      new IdentityTrait({
        name: 'maintenance bot',
        description:
          'A squat wheeled robot with a rotating optical sensor and a toolbelt of tiny arms.',
        aliases: ['bot', 'maintenance bot', 'robot'],
        properName: false,
        article: 'a',
      }),
    );
    bot.add(new ActorTrait({ isPlayer: false }));
    bot.add(new NpcTrait({ behaviorId: 'regression-patrol-bot' }));
    world.moveEntity(bot.id, serverRoom.id);

    // ---- PLACE PLAYER ----

    world.moveEntity(player.id, controlRoom.id);
  }

  /**
   * Return custom story-specific actions.
   */
  getCustomActions(): Action[] {
    return [inspectAction, pingAction];
  }

  /**
   * Extend the parser with story-specific grammar patterns.
   */
  extendParser(parser: Parser): void {
    const grammar = parser.getStoryGrammar();

    // INSPECT :thing — routed through capability dispatch
    grammar
      .define('inspect :thing')
      .mapsTo(INSPECT_ACTION_ID)
      .withPriority(150)
      .build();

    // PING — no target, just the action (requires being on the rooftop)
    grammar
      .define('ping')
      .mapsTo(PING_ACTION_ID)
      .withPriority(150)
      .build();

    grammar
      .define('ping antenna')
      .mapsTo(PING_ACTION_ID)
      .withPriority(150)
      .build();

    // WEAR :thing — wearing grammar not in stdlib parser yet
    grammar
      .forAction('if.action.wearing')
      .verbs(['wear', 'don'])
      .pattern(':target')
      .build();

    grammar
      .define('put on :target')
      .mapsTo('if.action.wearing')
      .withPriority(95)
      .build();

    // TAKE OFF :thing — removing worn items
    grammar
      .define('take off :target')
      .mapsTo('if.action.taking_off')
      .withPriority(95)
      .build();

    grammar
      .define('remove :target')
      .mapsTo('if.action.taking_off')
      .withPriority(95)
      .build();
  }

  /**
   * Extend the language with story-specific messages.
   */
  extendLanguage(language: LanguageProvider): void {
    // Inspect messages
    language.addMessage('regression.inspect.result', 'INSPECTION REPORT — Temperature: 22°C. Load: 73%. All drives healthy.');
    language.addMessage('regression.inspect.blocked', "You can't inspect that.");
    language.addMessage('regression.inspect.no_target', 'Inspect what?');
    language.addMessage('regression.inspect.not_inspectable', "That's not something you can inspect.");

    // Ping messages
    language.addMessage('regression.ping.success', 'You send a diagnostic ping through the antenna array. PING... PONG! Signal strong. All clear.');
    language.addMessage('regression.ping.wrong_room', 'There is no antenna here to ping.');

    // Event handler messages
    language.addMessage('regression.taken.alarm', 'A small alarm chirps briefly as you pick that up. The inventory system has been updated.');
  }

  /**
   * Called after the engine is fully initialized. Register plugins, daemons,
   * event handlers, and scoring chains.
   */
  onEngineReady(engine: GameEngine): void {
    const world = engine.getWorld();

    // --- NPC Plugin ---
    const npcPlugin = new NpcPlugin();
    engine.getPluginRegistry().register(npcPlugin);
    const npcService = npcPlugin.getNpcService();
    npcService.registerBehavior(patrolBotBehavior);

    // --- Scheduler Plugin ---
    const schedulerPlugin = new SchedulerPlugin();
    engine.getPluginRegistry().register(schedulerPlugin);
    const scheduler = schedulerPlugin.getScheduler();

    // Daemon: status update on the 3rd turn (runOnce)
    // Uses runOnce to fire exactly once, making the test deterministic
    let daemonTurnCount = 0;
    scheduler.registerDaemon({
      id: 'regression.daemon.status',
      name: 'Status Update Daemon',
      runOnce: true,
      condition: () => {
        daemonTurnCount++;
        return daemonTurnCount >= 3;
      },
      run: () => [
        {
          id: `status-${Date.now()}`,
          type: 'regression.event.status_update',
          timestamp: Date.now(),
          entities: {},
          data: { text: 'FACILITY STATUS: All systems operational.' },
        },
      ],
    });

    // Fuse: pressure alarm after 8 turns
    scheduler.setFuse({
      id: 'regression.fuse.pressure',
      name: 'Pressure Alarm Fuse',
      turns: 8,
      trigger: () => [
        {
          id: `pressure-${Date.now()}`,
          type: 'regression.event.pressure_alarm',
          timestamp: Date.now(),
          entities: {},
          data: {
            text: 'WARNING: Coolant pressure has exceeded safe limits. Please check the server room.',
          },
        },
      ],
    });

    // --- Event handler: chirp alarm when player takes anything ---
    world.chainEvent(
      'if.event.taken',
      (event: ISemanticEvent, _w: IWorldModel): ISemanticEvent | null => {
        return {
          id: `alarm-${Date.now()}`,
          type: 'regression.event.taken_alarm',
          timestamp: Date.now(),
          entities: {},
          data: { text: 'A small alarm chirps briefly as you pick that up. The inventory system has been updated.' },
        };
      },
      { key: 'regression.chain.taken-alarm' },
    );

    // --- Scoring: award points for visiting new rooms ---
    const visitedRooms = new Set<string>();
    world.chainEvent(
      'if.event.actor_moved',
      (event: ISemanticEvent, w: IWorldModel): ISemanticEvent | null => {
        const data = event.data as Record<string, unknown>;
        const toRoom = (data.toRoom || data.destination) as string | undefined;
        if (!toRoom || visitedRooms.has(toRoom)) return null;
        const roomEntity = w.getEntity(toRoom);
        if (!roomEntity) return null;
        const name = roomEntity.get(IdentityTrait)?.name;
        if (!name || name === 'Control Room') return null; // Don't score the start room
        visitedRooms.add(toRoom);
        w.awardScore(`visit-${toRoom}`, 5, `Visited ${name}`);
        return null;
      },
      { key: 'regression.chain.room-scoring' },
    );
  }
}

export const story = new RegressionStory();
export default story;
