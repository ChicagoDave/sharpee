/**
 * The history stage: record a successful command, update the pronoun
 * context, and register a refusal's referent.
 *
 * A successful command joins the command history and updates what "it",
 * "them", "him", and "her" resolve to. A refusal that names an entity
 * ("The oak door is closed.") makes it the pronoun referent — the player
 * expects to act on whatever was just mentioned. A blocked action counts
 * as a successful turn (its `blocked()` events are ordinary events), so
 * this reads the events, not the success flag: only `blocked: true`
 * events and the events of a failed turn are scanned.
 *
 * Public interface: `commandHistoryStage`.
 * Owner context: `@sharpee/engine` — the turn cycle.
 *
 * References: ADR-089 (pronoun context); GH #97 (the refusal referent).
 */

import type { ISemanticEvent } from '@sharpee/core';
import { StandardCapabilities } from '@sharpee/world-model';
import type { CommandHistoryData, CommandHistoryEntry } from '@sharpee/stdlib';
import { hasPronounContext } from '../parser-interface.js';
import type { TurnResult } from '../types.js';
import type { TurnStage, TurnEngine } from './context.js';

/**
 * Record a successful command in the command-history capability, when the
 * story registered one, trimmed to the capability's `maxEntries`. A turn
 * with no action id (a parse error, say) records nothing.
 */
function updateCommandHistory(engine: TurnEngine, result: TurnResult, input: string, turn: number): void {
  // Get command history capability
  const historyData = engine.world.getCapability(StandardCapabilities.COMMAND_HISTORY) as CommandHistoryData | null;
  if (!historyData) {
    // Command history capability not registered
    return;
  }

  // Note: Meta-commands (again, undo, save, etc.) never reach this stage —
  // the parse stage routes them to META_STAGES. No need for string-based exclusion.

  // Get the action ID from the result
  const actionId = result.actionId;
  if (!actionId) {
    // No action was executed (parse error, etc.)
    return;
  }

  // Extract the parsed command structure
  let parsedCommand: any = {
    verb: result.parsedCommand?.action || input.split(' ')[0]
  };

  // If we have a full parsed command structure, use it
  if (result.parsedCommand) {
    const parsed = result.parsedCommand;

    // Handle new ParsedCommand structure (has structure property)
    if (parsed.structure) {
      parsedCommand = {
        verb: parsed.structure.verb?.text || parsed.action,
        directObject: parsed.structure.directObject?.text,
        preposition: parsed.structure.preposition?.text,
        indirectObject: parsed.structure.indirectObject?.text
      };
    }
    // Handle old ParsedCommandV1 structure (directObject at top level)
    // Use type assertion for backward compatibility
    else {
      const v1 = parsed as unknown as { directObject?: { text?: string }; indirectObject?: { text?: string }; preposition?: string };
      if (v1.directObject || v1.indirectObject) {
        parsedCommand = {
          verb: parsed.action,
          directObject: v1.directObject?.text,
          preposition: v1.preposition,
          indirectObject: v1.indirectObject?.text
        };
      }
    }
  }

  // Create the history entry
  const entry: CommandHistoryEntry = {
    actionId,
    originalText: input,
    parsedCommand,
    turnNumber: turn,
    timestamp: Date.now()
  };

  // Add to history
  if (!historyData.entries) {
    historyData.entries = [];
  }
  historyData.entries.push(entry);

  // Trim to maxEntries if needed
  const maxEntries = historyData.maxEntries || 100;
  if (historyData.entries.length > maxEntries) {
    historyData.entries = historyData.entries.slice(-maxEntries);
  }
}

/**
 * GH #97: a refused turn still names what the player meant — the first
 * noun phrase among the refusal's params becomes the parser's pronoun
 * referent, so `it` next turn means that. The first such phrase wins; a
 * turn naming nothing leaves the context alone. Nothing happens when the
 * parser cannot register referents.
 */
function registerBlockedReferent(engine: TurnEngine, events: ISemanticEvent[], turn: number): void {
  const parser = engine.parser as unknown as { registerPronounEntity?: (id: string, text: string, turn: number) => void } | undefined;
  if (!parser || typeof parser.registerPronounEntity !== 'function') return;
  for (const event of events) {
    const params = (event.data as { params?: Record<string, unknown> } | undefined)?.params;
    if (!params) continue;
    for (const value of Object.values(params)) {
      const np = value as { kind?: unknown; referableId?: unknown; name?: unknown } | null;
      if (np && typeof np === 'object' && np.kind === 'noun' && typeof np.referableId === 'string') {
        parser.registerPronounEntity(np.referableId, typeof np.name === 'string' ? np.name : np.referableId, turn);
        return;
      }
    }
  }
}

export const commandHistoryStage: TurnStage = {
  name: 'command-history',
  requires: ['execute-command'],
  async run(context) {
    const { engine, turn } = context;
    const result = context.result!;

    if (result.success) {
      updateCommandHistory(engine, result, context.input, turn);
      if (engine.parser && hasPronounContext(engine.parser) && result.validatedCommand) {
        engine.parser.updatePronounContext(result.validatedCommand, turn);
      }
    }
    registerBlockedReferent(
      engine,
      result.success
        ? result.events.filter((e) => (e.data as { blocked?: unknown } | undefined)?.blocked === true)
        : result.events,
      turn
    );
    return 'continue';
  }
};
