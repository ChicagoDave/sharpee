/**
 * Dialogue extension contract (ADR-102, ADR-310 D19a)
 *
 * The extension point stdlib's conversation actions (ASK, TELL, SAY,
 * TALK TO) delegate to. A story registers exactly one implementation
 * (ADR-102, "One Extension Per Story"); an implementation that needs
 * to vary behavior per NPC does so internally.
 *
 * This contract lives in `@sharpee/if-domain` rather than beside its
 * implementation for the reason `LanguageProvider` does: the consumer
 * (stdlib) must not depend on the implementor to know the shape of its
 * own extension point (CLAUDE.md rule 8). `@sharpee/character` provides
 * the platform's implementation, exactly as `@sharpee/lang-en-us`
 * provides the language one.
 *
 * Public interface: DialogueExtension, DialogueResult.
 * Owner context: @sharpee/if-domain — cross-layer contracts.
 *
 * Invariants:
 * - No runtime-specific and no implementation-specific types. The rich
 *   response-intent type lives in the implementing package and reaches
 *   this file only as the `TIntent` parameter — a concrete import would
 *   close a dependency cycle, since it needs `Mood`/`Coherence` from
 *   `@sharpee/world-model`, which already depends on this package
 *   (ADR-310 D19a).
 */

// ---------------------------------------------------------------------------
// Dialogue result
// ---------------------------------------------------------------------------

/**
 * The result of a dialogue extension handling a conversation action.
 * Carries everything the calling action needs to report.
 *
 * @typeParam TIntent - The implementation's structured response-intent
 *   type. Defaults to `unknown` so consumers that only route (stdlib)
 *   need not name it; implementations substitute their own.
 */
export interface DialogueResult<TIntent = unknown> {
  /** Whether the extension handled the input. */
  handled: boolean;

  /** Message ID for the action to emit via the reporting phase. */
  messageId?: string;

  /** Parameters for the language layer message. */
  params?: Record<string, unknown>;

  /** The structured response intent, for systems that need it. */
  responseIntent?: TIntent;
}

// ---------------------------------------------------------------------------
// Dialogue extension interface
// ---------------------------------------------------------------------------

/**
 * Interface for dialogue extensions (ADR-102).
 *
 * Stdlib conversation actions delegate to the registered extension to
 * produce conversation results. The extension resolves free text to
 * topics, evaluates its own constraints, and returns structured results;
 * it never mutates the world on the action's behalf.
 *
 * @typeParam TIntent - See {@link DialogueResult}.
 */
export interface DialogueExtension<TIntent = unknown> {
  /**
   * Handle ASK [npc] ABOUT [text].
   * The extension resolves text to a topic and selects a response.
   *
   * @param npcId - The NPC entity ID
   * @param aboutText - The raw text after "about"
   * @returns Dialogue result; `handled: false` if this extension declines
   */
  handleAsk(npcId: string, aboutText: string): DialogueResult<TIntent>;

  /**
   * Handle TELL [npc] ABOUT [text] — the confrontation path, where the
   * player presents information rather than requesting it.
   *
   * @param npcId - The NPC entity ID
   * @param aboutText - The raw text after "about"
   * @returns Dialogue result; `handled: false` if this extension declines
   */
  handleTell(npcId: string, aboutText: string): DialogueResult<TIntent>;

  /**
   * Handle SAY [text] or SAY [text] TO [npc].
   *
   * @param npcId - The NPC entity ID, or undefined for untargeted speech
   * @param spokenText - The raw spoken text
   * @returns Dialogue result; `handled: false` if this extension declines
   */
  handleSay(npcId: string | undefined, spokenText: string): DialogueResult<TIntent>;

  /**
   * Handle TALK TO [npc]. Initiates the conversation lifecycle and fires
   * any initiative triggers the implementation defines.
   *
   * @param npcId - The NPC entity ID
   * @returns Dialogue result; `handled: false` if this extension declines
   */
  handleTalkTo(npcId: string): DialogueResult<TIntent>;
}
