import { TurnPlugin } from './turn-plugin';

export class PluginRegistry {
  private plugins: Map<string, TurnPlugin> = new Map();

  register(plugin: TurnPlugin): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin already registered: ${plugin.id}`);
    }
    this.plugins.set(plugin.id, plugin);
  }

  unregister(id: string): void {
    this.plugins.delete(id);
  }

  getAll(): TurnPlugin[] {
    return Array.from(this.plugins.values()).sort(
      (a, b) => b.priority - a.priority
    );
  }

  getById(id: string): TurnPlugin | undefined {
    return this.plugins.get(id);
  }

  getStates(): Record<string, unknown> {
    const states: Record<string, unknown> = {};
    for (const plugin of this.plugins.values()) {
      if (plugin.getState) {
        states[plugin.id] = plugin.getState();
      }
    }
    return states;
  }

  setStates(states: Record<string, unknown>): void {
    for (const [id, state] of Object.entries(states)) {
      const plugin = this.plugins.get(id);
      if (plugin?.setState) {
        plugin.setState(state);
      }
    }
  }
}
