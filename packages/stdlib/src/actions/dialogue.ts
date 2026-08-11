/**
 * Dialogue-extension consultation for the conversation actions (ADR-102).
 *
 * ASK, TELL and TALK TO are thin shells: they validate the social
 * preconditions, then delegate to the world's registered
 * `DialogueExtension` for the actual response. This module is the single
 * consultation point, so the three actions cannot drift in how they
 * consult, merge parameters, or fall back.
 *
 * Public interface: consultDialogue, DialogueOutcome.
 * Owner context: @sharpee/stdlib / actions
 *
 * Precedence (ADR-310 D19a, David's ruling 2026-08-11): a **per-entity
 * interceptor beats the story-wide extension**. That ordering is
 * structural rather than enforced here — the action applies this
 * module's outcome to the primary event, and the ADR-228 lifecycle's
 * `runPostReport` runs afterwards, where a single interceptor may
 * `override` the primary message. Nothing here needs to know about
 * interceptors; it only has to run first.
 */

import type { DialogueExtension, DialogueResult } from '@sharpee/if-domain';
import { ActionContext } from './enhanced-types.js';

/**
 * What a handled consultation contributes to the action's primary event.
 */
export interface DialogueOutcome {
  /** The message ID the extension chose, if it supplied one. */
  messageId?: string;

  /** Parameters the extension supplied, to be merged over the defaults. */
  params?: Record<string, unknown>;
}

/**
 * Consult the world's dialogue extension, if one is registered.
 *
 * @param context - The acting context, used to reach the world
 * @param call - Invokes the appropriate handler on the extension. The
 *   caller picks the method so this module stays verb-agnostic.
 * @returns The outcome when an extension is registered AND reports
 *   `handled: true`; otherwise `undefined`, meaning the action reports
 *   its own default exactly as it did before any extension existed.
 */
export function consultDialogue(
  context: ActionContext,
  call: (extension: DialogueExtension) => DialogueResult
): DialogueOutcome | undefined {
  const extension = context.world.getDialogueExtension();
  if (!extension) return undefined;

  const result = call(extension);
  if (!result?.handled) return undefined;

  return { messageId: result.messageId, params: result.params };
}

/**
 * Resolve the primary event's message ID, preferring the extension's.
 *
 * A handled result with no `messageId` falls back to the default — the
 * extension is allowed to take responsibility for the exchange without
 * changing what is said.
 *
 * @param outcome - The consultation outcome, or undefined
 * @param fallback - The action's own default message ID
 * @returns The message ID to emit
 */
export function dialogueMessageId(
  outcome: DialogueOutcome | undefined,
  fallback: string
): string {
  return outcome?.messageId ?? fallback;
}

/**
 * Merge the extension's parameters over the action's defaults.
 *
 * Defaults are kept rather than replaced: the language layer needs the
 * action's own `target`/`topic` entity parameters (ADR-158) whether or
 * not an extension answered.
 *
 * @param defaults - The action's own template parameters
 * @param outcome - The consultation outcome, or undefined
 * @returns The merged parameter set
 */
export function dialogueParams(
  defaults: Record<string, unknown>,
  outcome: DialogueOutcome | undefined
): Record<string, unknown> {
  return outcome?.params ? { ...defaults, ...outcome.params } : defaults;
}
