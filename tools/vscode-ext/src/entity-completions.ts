/**
 * Entity ID autocomplete for Sharpee story TypeScript files.
 *
 * Provides completion items for room IDs, entity IDs, and NPC IDs
 * when editing story source code. Completions are sourced from the
 * cached world data in WorldExplorerProvider (populated by --world-json).
 *
 * Trigger contexts: string literals inside getEntity(), moveEntity(),
 * destination properties, and other entity-reference patterns.
 *
 * Public interface: SharpeeCompletionProvider
 * Owner: tools/vscode-ext
 */

import * as vscode from 'vscode';
import { WorldExplorerProvider } from './world-explorer';

// ---------------------------------------------------------------------------
// Completion context patterns
// ---------------------------------------------------------------------------

/**
 * Patterns that indicate the cursor is inside an entity ID context.
 * Each pattern specifies what to match on the line prefix and what
 * kind of completions to offer.
 */
interface CompletionContext {
  /** Regex tested against the text before the cursor. */
  pattern: RegExp;
  /** Which entity kinds to suggest. */
  kinds: ('room' | 'entity' | 'npc')[];
}

const COMPLETION_CONTEXTS: CompletionContext[] = [
  // world.getEntity('...' — any entity
  { pattern: /getEntity\(\s*['"`]$/, kinds: ['room', 'entity', 'npc'] },

  // world.moveEntity(something, '...' — destination is a room or container
  { pattern: /moveEntity\([^,]+,\s*['"`]$/, kinds: ['room', 'entity'] },

  // destination: '...' — room ID
  { pattern: /destination:\s*['"`]$/, kinds: ['room'] },

  // location: '...' — room ID
  { pattern: /location:\s*['"`]$/, kinds: ['room'] },

  // keyId: '...' — entity ID (usually a key)
  { pattern: /keyId:\s*['"`]$/, kinds: ['entity'] },

  // world.helpers().room('...' — room ID
  { pattern: /\.room\(\s*['"`]$/, kinds: ['room'] },

  // setStateValue(key, '...' — could be any entity
  { pattern: /setStateValue\([^,]+,\s*['"`]$/, kinds: ['room', 'entity', 'npc'] },

  // Generic: inside a function call with 'id' or 'Id' in the parameter name context
  // e.g., roomId: '...',  targetId: '...',  entityId: '...'
  { pattern: /[rR]oomId:\s*['"`]$/, kinds: ['room'] },
  { pattern: /[eE]ntityId:\s*['"`]$/, kinds: ['room', 'entity', 'npc'] },
  { pattern: /targetId:\s*['"`]$/, kinds: ['room', 'entity', 'npc'] },
  { pattern: /npcId:\s*['"`]$/, kinds: ['npc'] },
];

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * Provides entity ID completions in TypeScript story files.
 * Reads cached world data from the WorldExplorerProvider singleton.
 */
export class SharpeeCompletionProvider implements vscode.CompletionItemProvider {
  constructor(private readonly worldExplorer: WorldExplorerProvider) {}

  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.CompletionItem[] | undefined {
    // Check if autocomplete is enabled
    const config = vscode.workspace.getConfiguration('sharpee');
    if (!config.get<boolean>('enableEntityAutocomplete', true)) {
      return undefined;
    }

    const worldData = this.worldExplorer.getWorldData();
    if (!worldData) return undefined;

    // Get text from line start to cursor
    const linePrefix = document.lineAt(position).text.substring(0, position.character);

    // Find matching context
    const matchedKinds = this.detectContext(linePrefix);
    if (!matchedKinds) return undefined;

    const items: vscode.CompletionItem[] = [];

    if (matchedKinds.includes('room')) {
      for (const room of worldData.rooms) {
        items.push(this.buildRoomCompletion(room));
      }
    }

    if (matchedKinds.includes('entity')) {
      for (const entity of worldData.entities) {
        items.push(this.buildEntityCompletion(entity, worldData));
      }
    }

    if (matchedKinds.includes('npc')) {
      for (const npc of worldData.npcs) {
        items.push(this.buildNpcCompletion(npc, worldData));
      }
    }

    return items.length > 0 ? items : undefined;
  }

  /**
   * Tests the line prefix against known completion contexts.
   *
   * @returns The set of entity kinds to suggest, or null if no context matches
   */
  private detectContext(linePrefix: string): ('room' | 'entity' | 'npc')[] | null {
    for (const ctx of COMPLETION_CONTEXTS) {
      if (ctx.pattern.test(linePrefix)) {
        return ctx.kinds;
      }
    }
    return null;
  }

  /**
   * Builds a completion item for a room.
   */
  private buildRoomCompletion(room: {
    id: string;
    name: string;
    aliases: string[];
    isDark: boolean;
    exits: Record<string, { id: string; name: string }>;
  }): vscode.CompletionItem {
    const item = new vscode.CompletionItem(room.id, vscode.CompletionItemKind.Reference);
    item.detail = room.name;
    item.sortText = `0_${room.name}`;

    const exitLines = Object.entries(room.exits)
      .map(([dir, dest]) => `- ${dir} → ${dest.name}`)
      .join('\n');

    const doc = new vscode.MarkdownString();
    doc.appendMarkdown(`**${room.name}** \`${room.id}\`\n\n`);
    doc.appendMarkdown(`Type: Room${room.isDark ? ' (dark)' : ''}\n\n`);
    if (exitLines) {
      doc.appendMarkdown(`**Exits:**\n${exitLines}\n`);
    }
    item.documentation = doc;

    return item;
  }

  /**
   * Builds a completion item for a non-room, non-NPC entity.
   */
  private buildEntityCompletion(
    entity: { id: string; name: string; location: string | null; traits: string[] },
    worldData: { rooms: { id: string; name: string }[] },
  ): vscode.CompletionItem {
    const item = new vscode.CompletionItem(entity.id, vscode.CompletionItemKind.Value);
    item.detail = entity.name;
    item.sortText = `1_${entity.name}`;

    const locName = entity.location
      ? (worldData.rooms.find(r => r.id === entity.location)?.name ?? entity.location)
      : '(no location)';

    const doc = new vscode.MarkdownString();
    doc.appendMarkdown(`**${entity.name}** \`${entity.id}\`\n\n`);
    doc.appendMarkdown(`Location: ${locName}\n\n`);
    doc.appendMarkdown(`Traits: ${entity.traits.join(', ')}\n`);
    item.documentation = doc;

    return item;
  }

  /**
   * Builds a completion item for an NPC.
   */
  private buildNpcCompletion(
    npc: { id: string; name: string; location: string | null; traits: string[]; behaviorId: string | null },
    worldData: { rooms: { id: string; name: string }[] },
  ): vscode.CompletionItem {
    const item = new vscode.CompletionItem(npc.id, vscode.CompletionItemKind.Class);
    item.detail = `${npc.name} (NPC)`;
    item.sortText = `2_${npc.name}`;

    const locName = npc.location
      ? (worldData.rooms.find(r => r.id === npc.location)?.name ?? npc.location)
      : '(no location)';

    const doc = new vscode.MarkdownString();
    doc.appendMarkdown(`**${npc.name}** \`${npc.id}\` — NPC\n\n`);
    doc.appendMarkdown(`Location: ${locName}\n\n`);
    if (npc.behaviorId) {
      doc.appendMarkdown(`Behavior: \`${npc.behaviorId}\`\n\n`);
    }
    doc.appendMarkdown(`Traits: ${npc.traits.join(', ')}\n`);
    item.documentation = doc;

    return item;
  }
}
