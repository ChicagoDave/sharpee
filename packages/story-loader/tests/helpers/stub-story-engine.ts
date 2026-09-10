/**
 * A complete `StoryEngine` double for driving `ChordStory.onEngineReady`
 * in a unit test (ADR-343).
 *
 * The hook takes the platform's story-facing role, on which every member
 * exists — so a test drives it with a whole engine-shaped object and
 * overrides only what it asserts on. Before ADR-343 these tests passed
 * one- and two-member object literals and the loader probed each member
 * before calling it; the role retired the probes, and this helper is
 * what replaced them. It is a test double, not a fake engine: members
 * the loader reads at ready time return usable values, and the rest are
 * no-ops that record nothing.
 *
 * Public interface: `stubStoryEngine`, `recordingPluginRegistry`.
 * Owner context: `@sharpee/story-loader` test helpers.
 */

import type { StoryEngine } from '@sharpee/engine';
import { DEFAULT_TEXT_CAPABILITIES, EngineRandomService } from '@sharpee/engine';
import { PluginRegistry, type TurnPlugin } from '@sharpee/plugins';
import { createNpcService } from '@sharpee/stdlib';
import { WorldModel } from '@sharpee/world-model';

/**
 * A real {@link PluginRegistry} that also appends each registration to
 * `sink`, in the order the loader made it.
 *
 * The registry itself is the production class — duplicate ids still
 * throw — because the only thing a test needs that the real one does not
 * give is registration *order*: `getAll()` sorts by priority, which is
 * the run order, not the install order several of these tests assert on.
 *
 * @param sink the array registrations are appended to
 * @returns a live registry wired to that sink
 */
export function recordingPluginRegistry(sink: TurnPlugin[]): PluginRegistry {
  const registry = new PluginRegistry();
  const register = registry.register.bind(registry);
  registry.register = (plugin: TurnPlugin) => {
    sink.push(plugin);
    register(plugin);
  };
  return registry;
}

/**
 * Build a `StoryEngine` double with every member present.
 *
 * Each read returns the same instance for the lifetime of the double, as
 * a real engine does: a test that registers through the returned registry
 * or NPC service and then reads it back gets the object it wrote to.
 *
 * @param overrides members the test supplies itself — a plugin registry
 *   that collects what the loader registers, a `registerSlotEntry` that
 *   captures entries, and so on. Anything omitted gets the default below.
 * @returns a complete `StoryEngine`
 */
export function stubStoryEngine(overrides: Partial<StoryEngine> = {}): StoryEngine {
  const world = new WorldModel();
  const registry = new PluginRegistry();
  const npcService = createNpcService();
  const random = new EngineRandomService(7);
  const base: StoryEngine = {
    // Registration — no-ops unless a test is watching one.
    getPluginRegistry: () => registry,
    getNpcService: () => npcService,
    registerSlotEntry: () => undefined,
    registerSlotContributor: () => undefined,
    registerParsedCommandTransformer: () => undefined,
    registerInputMode: () => undefined,

    // Reads — real enough for what the loader does at ready time: it
    // reads the turn counter, the capability set, and the random source.
    getWorld: () => world,
    getContext: () => ({
      currentTurn: 0,
      player: world.getPlayer() ?? (undefined as never),
      history: [],
      metadata: { started: new Date(0), lastPlayed: new Date(0) },
    }),
    getLanguageProvider: () => undefined as never,
    getEventProcessor: () => undefined as never,
    getRandomService: () => random,
    getClientCapabilities: () => DEFAULT_TEXT_CAPABILITIES,

    // Acting — the loader binds this; nothing in a loader unit test acts.
    executeAsActor: () => ({ success: false, events: [] }),
  };
  return { ...base, ...overrides };
}
