/**
 * Command Registry
 *
 * Central registry for debug and test commands.
 * Commands can be looked up by GDT code or test syntax.
 */

import type { DebugCommand, CommandCategory, CommandRegistry } from '../types.js';

/**
 * Create a new command registry
 */
export function createCommandRegistry(): CommandRegistry {
  const byCode = new Map<string, DebugCommand>();
  const byTestSyntax = new Map<string, DebugCommand>();
  const allCommands: DebugCommand[] = [];

  const registry: CommandRegistry = {
    register(command: DebugCommand): void {
      // Register by code (uppercase for case-insensitive lookup)
      byCode.set(command.code.toUpperCase(), command);

      // Register by test syntax if provided
      if (command.testSyntax) {
        byTestSyntax.set(command.testSyntax.toLowerCase(), command);
      }

      allCommands.push(command);
    },

    getByCode(code: string): DebugCommand | undefined {
      return byCode.get(code.toUpperCase());
    },

    getByTestSyntax(syntax: string): DebugCommand | undefined {
      return byTestSyntax.get(syntax.toLowerCase());
    },

    getAll(): DebugCommand[] {
      return [...allCommands];
    },

    getByCategory(category: CommandCategory): DebugCommand[] {
      return allCommands.filter((cmd) => cmd.category === category);
    },
  };

  return registry;
}

/**
 * Parse a GDT-style command input
 * Format: "CODE arg1 arg2" or just "CODE"
 */
export function parseGdtInput(input: string): { code: string; args: string[] } {
  const trimmed = input.trim();
  const parts = trimmed.split(/\s+/);
  const code = parts[0] || '';
  const args = parts.slice(1);

  return { code: code.toUpperCase(), args };
}

/**
 * Parse a test command input
 * Format: "$command arg1 arg2" or just "$command"
 */
export function parseTestInput(input: string): { syntax: string; args: string[] } | undefined {
  const trimmed = input.trim();

  if (!trimmed.startsWith('$')) {
    return undefined;
  }

  const withoutPrefix = trimmed.slice(1);
  const parts = withoutPrefix.split(/\s+/);
  const syntax = parts[0] || '';
  const args = parts.slice(1);

  return { syntax: syntax.toLowerCase(), args };
}
