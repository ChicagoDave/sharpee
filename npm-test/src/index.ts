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

import { Story, StoryConfig, GameEngine, CustomVocabulary } from '@sharpee/engine';
import { WorldModel, IFEntity, EntityType, IWorldModel } from '@sharpee/world-model';
import { IdentityTrait, ActorTrait, ContainerTrait } from '@sharpee/world-model';
import { ISemanticEvent } from '@sharpee/core';
import { NpcPlugin } from '@sharpee/plugin-npc';
import { SchedulerPlugin } from '@sharpee/plugin-scheduler';
import { StateMachinePlugin } from '@sharpee/plugin-state-machine';
import { Action } from '@sharpee/stdlib';
import type { Parser } from '@sharpee/parser-en-us';
import type { LanguageProvider } from '@sharpee/lang-en-us';

import { INSPECT_ACTION_ID } from './behaviors';
import {
  inspectAction, pingAction, PING_ACTION_ID,
  statusAction, STATUS_ACTION_ID,
  checkAction, CHECK_ACTION_ID,
} from './actions';
import { patrolBotBehavior } from './npcs';
import { setupWorld, getRoomIds } from './world-setup';


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
   * Build the facility and place all objects.
   */
  initializeWorld(world: WorldModel): void {
    setupWorld(world);

    // --- Custom state (for 38-custom-state test) ---
    world.setStateValue('facility.status', 'operational');
    world.setStateValue('facility.alert', 'green');

    // --- Scope override (for 39-scope-override test) ---
    // Make the antenna visible from any room (level 2 = VISIBLE)
    const rooftopId = getRoomIds().rooftop;
    const rooftopContents = world.getContents(rooftopId);
    for (const entity of rooftopContents) {
      const identity = entity.get(IdentityTrait);
      if (identity?.name === 'antenna array') {
        entity.setMinimumScope(2);
        break;
      }
    }

    // --- Annotations (for 40-annotations test) ---
    const controlRoomId = getRoomIds().controlRoom;
    const controlRoom = world.getEntity(controlRoomId);
    if (controlRoom) {
      controlRoom.annotate('illustration', {
        id: 'control-room-overview',
        src: 'control-room.jpg',
        alt: 'The main control room with banks of monitors',
        trigger: 'on-enter',
      });
    }
  }

  /**
   * Return custom story-specific actions.
   */
  getCustomActions(): Action[] {
    return [inspectAction, pingAction, statusAction, checkAction];
  }

  /**
   * Return custom vocabulary (noun synonyms for testing).
   */
  getCustomVocabulary(): CustomVocabulary {
    return {
      nouns: [
        { word: 'device', entityId: 'flashlight', priority: 50 },
      ],
    };
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

    // CLIMB :thing — climbing grammar not in stdlib parser yet
    grammar
      .forAction('if.action.climbing')
      .verbs(['climb', 'scale'])
      .pattern(':target')
      .build();

    grammar
      .define('climb up :target')
      .mapsTo('if.action.climbing')
      .withPriority(95)
      .build();

    // TALK TO :actor — talking grammar not in stdlib parser
    grammar
      .define('talk to :target')
      .mapsTo('if.action.talking')
      .withPriority(95)
      .build();

    grammar
      .define('talk :target')
      .mapsTo('if.action.talking')
      .withPriority(90)
      .build();

    // SMELL :thing — smelling grammar not in stdlib parser
    grammar
      .forAction('if.action.smelling')
      .verbs(['smell', 'sniff'])
      .pattern(':target')
      .build();

    // LISTEN TO :thing — listening grammar not in stdlib parser
    grammar
      .define('listen to :target')
      .mapsTo('if.action.listening')
      .withPriority(95)
      .build();

    grammar
      .define('listen')
      .mapsTo('if.action.listening')
      .withPriority(95)
      .build();

    // STATUS — reports custom state values
    grammar
      .define('status')
      .mapsTo(STATUS_ACTION_ID)
      .withPriority(150)
      .build();

    grammar
      .define('facility status')
      .mapsTo(STATUS_ACTION_ID)
      .withPriority(150)
      .build();

    // CHECK — reports annotation count on current room
    grammar
      .define('check room')
      .mapsTo(CHECK_ACTION_ID)
      .withPriority(150)
      .build();

    grammar
      .define('check annotations')
      .mapsTo(CHECK_ACTION_ID)
      .withPriority(150)
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

    // Status action messages
    language.addMessage('regression.status.report', 'FACILITY STATUS: {facilityStatus}. Alert level: {alertLevel}.');
    language.addMessage('regression.status.error', 'Unable to retrieve facility status.');

    // Check action messages
    language.addMessage('regression.check.report', 'Room annotations: {count} illustration(s) found.');
    language.addMessage('regression.check.error', 'Unable to check annotations.');

    // State machine messages
    language.addMessage('regression.machine.activated', 'The emergency generator hums to life. Power restored!');
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

    // --- State Machine Plugin (for 37-state-machine test) ---
    const stateMachinePlugin = new StateMachinePlugin();
    engine.getPluginRegistry().register(stateMachinePlugin);
    const smRegistry = stateMachinePlugin.getRegistry();
    smRegistry.register({
      id: 'regression.generator',
      initialState: 'inactive',
      states: {
        inactive: {
          transitions: [
            {
              target: 'active',
              trigger: { type: 'action', actionId: 'regression.action.ping' },
              effects: [
                { type: 'message', messageId: 'regression.machine.activated' },
              ],
            },
          ],
        },
        active: {},
      },
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
        if (!name || name === 'Control Room') return null;
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
