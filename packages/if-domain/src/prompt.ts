/**
 * GamePrompt — input prompt as a first-class domain type (ADR-137)
 *
 * The prompt is a channel primitive (FyreVM heritage). Each prompt is a named
 * constant with a messageId resolved through the language provider.
 *
 * @public GamePrompt, DefaultPrompt, PROMPT_STATE_KEY
 * @context if-domain (platform-level type)
 */

/**
 * A game prompt resolved through the language layer.
 *
 * Concrete prompts are named constants:
 * ```typescript
 * const GDTPrompt: GamePrompt = { messageId: 'dungeo.gdt.prompt' };
 * ```
 */
export interface GamePrompt {
  /** Message ID resolved by the language provider */
  readonly messageId: string;
  /** Optional parameters for template substitution */
  readonly params?: Record<string, unknown>;
}

/**
 * Platform default prompt.
 * Resolves to '> ' via lang-en-us registration of 'if.platform.prompt'.
 */
export const DefaultPrompt: GamePrompt = { messageId: 'if.platform.prompt' };

/**
 * World state key for storing the active prompt.
 */
export const PROMPT_STATE_KEY = 'if.prompt';
