import { TurnPlugin } from './turn-plugin.js';

/**
 * Holds the turn plugins for a running game and hands them to the engine in
 * priority order each turn (ADR-120). The engine owns the single registry;
 * stories add behaviour through the plugin packages (NPC, scheduler, state
 * machine) rather than implementing {@link TurnPlugin} directly.
 */
export class PluginRegistry {
  private plugins: Map<string, TurnPlugin> = new Map();

  /** Register a plugin. Throws if a plugin with the same id is already registered. */
  register(plugin: TurnPlugin): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin already registered: ${plugin.id}`);
    }
    this.plugins.set(plugin.id, plugin);
  }

  /** Remove a plugin by id; a no-op if no such plugin is registered. */
  unregister(id: string): void {
    this.plugins.delete(id);
  }

  /** Remove all registered plugins. */
  clear(): void {
    this.plugins.clear();
  }

  /** All registered plugins, sorted by descending priority (turn run order). */
  getAll(): TurnPlugin[] {
    return Array.from(this.plugins.values()).sort(
      (a, b) => b.priority - a.priority
    );
  }

  /** Look up a single plugin by id, or `undefined` if absent. */
  getById(id: string): TurnPlugin | undefined {
    return this.plugins.get(id);
  }

  /**
   * Collect each plugin's {@link TurnPlugin.getState} result, keyed by plugin id,
   * for inclusion in a save. Plugins without `getState` are omitted.
   */
  getStates(): Record<string, unknown> {
    const states: Record<string, unknown> = {};
    for (const plugin of this.plugins.values()) {
      if (plugin.getState) {
        states[plugin.id] = plugin.getState();
      }
    }
    return states;
  }

  /**
   * Restore plugin state from a prior {@link PluginRegistry.getStates} result on
   * load, calling each matching plugin's {@link TurnPlugin.setState}. Entries
   * with no registered plugin (or no `setState`) are skipped.
   */
  setStates(states: Record<string, unknown>): void {
    for (const [id, state] of Object.entries(states)) {
      const plugin = this.plugins.get(id);
      if (plugin?.setState) {
        plugin.setState(state);
      }
    }
  }
}
