/**
 * Conversation lifecycle and attention management (ADR-142)
 *
 * A conversation is an active state that persists across non-conversation
 * actions and competes for the player's attention. NPC intent and strength
 * drive between-turn commentary and determine how aggressively the NPC
 * holds the player's focus.
 *
 * Public interface: ConversationIntent, ConversationStrength, ConversationContext,
 *   ContinuationEntry, InitiativeTrigger, ConversationLifecycle.
 * Owner context: @sharpee/character / conversation
 */

// ---------------------------------------------------------------------------
// Vocabulary types
// ---------------------------------------------------------------------------

/** How the NPC feels about continuing the conversation. */
export type ConversationIntent =
  | 'eager'      // wants to keep talking, proactive
  | 'reluctant'  // relieved when player stops asking
  | 'hostile'    // antagonistic, will disengage quickly
  | 'confessing' // unburdening, wants to continue
  | 'neutral';   // default — waits patiently

/** How aggressively the NPC holds the player's attention. */
export type ConversationStrength =
  | 'passive'    // yields on redirect or leave
  | 'assertive'  // protests but yields
  | 'blocking';  // prevents redirect and leaving

/** Result of attempting to redirect attention away from the current NPC. */
export type RedirectResult = 'yields' | 'protests' | 'blocks';

// ---------------------------------------------------------------------------
// Default decay thresholds per intent
// ---------------------------------------------------------------------------

/**
 * Default number of non-conversation turns before a conversation decays,
 * keyed by intent. Authors can override per conversation context.
 */
export const DEFAULT_DECAY_THRESHOLDS: Record<ConversationIntent, number> = {
  eager: 5,
  reluctant: 2,
  hostile: 3,
  confessing: 6,
  neutral: 4,
};

// ---------------------------------------------------------------------------
// Continuation and initiative
// ---------------------------------------------------------------------------

/** A scheduled NPC continuation message within a conversation context. */
export interface ContinuationEntry {
  /** Turns after context was set before this continuation fires. */
  afterTurns: number;

  /** Message ID for the continuation. */
  messageId: string;
}

/** An NPC initiative trigger — the NPC starts a conversation proactively. */
export interface InitiativeTrigger {
  /** Predicate conditions that must all be satisfied. */
  conditions: string[];

  /** Message ID when the NPC initiates. */
  messageId: string;
}

// ---------------------------------------------------------------------------
// Between-turn defaults
// ---------------------------------------------------------------------------

/**
 * Platform default between-turn commentary message IDs.
 * Keyed by `${intent}.${turnBucket}` where turnBucket is '1', '3+', or 'decay'.
 * Authors override per conversation context for character-specific flavor.
 */
export const BETWEEN_TURN_DEFAULTS: Record<string, string> = {
  // Eager
  'eager.1':     'character.conversation.eager.watches',
  'eager.3+':    'character.conversation.eager.tugs',
  'eager.decay': 'character.conversation.eager.sighs',

  // Reluctant
  'reluctant.1':     'character.conversation.reluctant.silence',
  'reluctant.3+':    'character.conversation.reluctant.ends',
  'reluctant.decay': 'character.conversation.reluctant.relief',

  // Hostile
  'hostile.1':     'character.conversation.hostile.glares',
  'hostile.3+':    'character.conversation.hostile.turns-away',
  'hostile.decay': 'character.conversation.hostile.dismisses',

  // Confessing
  'confessing.1':     'character.conversation.confessing.pauses',
  'confessing.3+':    'character.conversation.confessing.whispers',
  'confessing.decay': 'character.conversation.confessing.trails-off',

  // Neutral
  'neutral.1':     'character.conversation.neutral.silence',
  'neutral.3+':    'character.conversation.neutral.waits',
  'neutral.decay': 'character.conversation.neutral.drifts',
};

// ---------------------------------------------------------------------------
// Conversation context (the active state)
// ---------------------------------------------------------------------------

/** The persistent state of an active conversation. */
export interface ConversationContext {
  /** Entity ID of the NPC in this conversation. */
  npcId: string;

  /** Current conversation intent. */
  intent: ConversationIntent;

  /** Current conversation strength. */
  strength: ConversationStrength;

  /** Decay threshold (non-conversation turns before conversation ends). */
  decayThreshold: number;

  /** Number of non-conversation turns elapsed since last conversation action. */
  nonConversationTurns: number;

  /** Optional context label (e.g., 'confessing', 'caught'). */
  contextLabel?: string;

  /** Scheduled continuation messages within this context. */
  continuations: ContinuationEntry[];

  /** Author-overridden between-turn messages. Keyed by turn number. */
  betweenTurnOverrides: Map<number, string>;

  /** Author-overridden leave-attempt message. */
  onLeaveAttemptMessage?: string;
}

// ---------------------------------------------------------------------------
// Conversation lifecycle
// ---------------------------------------------------------------------------

/**
 * Manages the lifecycle of an active conversation between the player
 * and a single NPC. Tracks intent, strength, decay, attention shifts,
 * NPC continuation scheduling, and NPC initiative triggers.
 *
 * One instance per game session. The active conversation is singular —
 * the player can only be in one conversation at a time.
 */
export class ConversationLifecycle {
  /** The currently active conversation, or null if none. */
  private context: ConversationContext | null = null;

  /** Registered NPC initiative triggers. Keyed by NPC entity ID. */
  private initiativeTriggers: Map<string, InitiativeTrigger[]> = new Map();

  // =========================================================================
  // Lifecycle transitions
  // =========================================================================

  /**
   * Begin a conversation with an NPC.
   * If a conversation is already active, it is ended first.
   *
   * @param npcId - The NPC entity ID
   * @param intent - The NPC's conversation intent
   * @param strength - The NPC's conversation strength
   */
  begin(
    npcId: string,
    intent: ConversationIntent = 'neutral',
    strength: ConversationStrength = 'passive',
  ): void {
    this.context = {
      npcId,
      intent,
      strength,
      decayThreshold: DEFAULT_DECAY_THRESHOLDS[intent],
      nonConversationTurns: 0,
      continuations: [],
      betweenTurnOverrides: new Map(),
    };
  }

  /**
   * End the current conversation.
   * No-op if no conversation is active.
   */
  end(): void {
    this.context = null;
  }

  /**
   * Update the conversation context mid-conversation.
   * Used when an NPC response changes the conversation's tone
   * (e.g., a confess response shifts intent to 'eager' and strength to 'assertive').
   *
   * @param label - Context label
   * @param intent - New intent (or keep current)
   * @param strength - New strength (or keep current)
   * @param decayThreshold - New decay threshold (or derive from intent)
   */
  setContext(
    label: string,
    intent?: ConversationIntent,
    strength?: ConversationStrength,
    decayThreshold?: number,
  ): void {
    if (!this.context) return;

    this.context.contextLabel = label;

    if (intent !== undefined) {
      this.context.intent = intent;
      // Reset decay threshold to match new intent unless explicitly overridden
      this.context.decayThreshold = decayThreshold ?? DEFAULT_DECAY_THRESHOLDS[intent];
    } else if (decayThreshold !== undefined) {
      this.context.decayThreshold = decayThreshold;
    }

    if (strength !== undefined) {
      this.context.strength = strength;
    }

    // Reset non-conversation turn counter on context change
    this.context.nonConversationTurns = 0;
  }

  // =========================================================================
  // State queries
  // =========================================================================

  /** Whether a conversation is currently active. */
  isActive(): boolean {
    return this.context !== null;
  }

  /** Whether the active conversation is blocking. */
  isBlocking(): boolean {
    return this.context?.strength === 'blocking';
  }

  /** Get the active conversation context, or null. */
  getContext(): Readonly<ConversationContext> | null {
    return this.context;
  }

  /** Get the NPC ID of the active conversation, or null. */
  getActiveNpcId(): string | null {
    return this.context?.npcId ?? null;
  }

  // =========================================================================
  // Non-conversation turn tracking and decay
  // =========================================================================

  /**
   * Record that a non-conversation turn occurred.
   * Increments the decay counter and returns whether the conversation
   * should end (decay threshold reached).
   *
   * @returns True if the conversation decayed and ended
   */
  recordNonConversationTurn(): boolean {
    if (!this.context) return false;

    this.context.nonConversationTurns++;

    if (this.context.nonConversationTurns >= this.context.decayThreshold) {
      this.end();
      return true;
    }

    return false;
  }

  /**
   * Get the between-turn commentary message ID for the current state.
   * Returns author override if set, otherwise the platform default.
   *
   * @returns Message ID for between-turn commentary, or undefined if no conversation
   */
  getBetweenTurnMessage(): string | undefined {
    if (!this.context) return undefined;

    const turns = this.context.nonConversationTurns;

    // Check author overrides first
    const override = this.context.betweenTurnOverrides.get(turns);
    if (override) return override;

    // Platform defaults — bucket into '1', '3+', or 'decay'
    const bucket = turns >= 3 ? '3+' : String(turns);
    const key = `${this.context.intent}.${bucket}`;
    return BETWEEN_TURN_DEFAULTS[key];
  }

  /**
   * Register an author-overridden between-turn message for the active context.
   *
   * @param turnNumber - Which non-conversation turn this fires on
   * @param messageId - The message ID
   */
  setBetweenTurnOverride(turnNumber: number, messageId: string): void {
    if (!this.context) return;
    this.context.betweenTurnOverrides.set(turnNumber, messageId);
  }

  /**
   * Set the leave-attempt message for a blocking conversation.
   *
   * @param messageId - The message ID when the player tries to leave
   */
  setOnLeaveAttemptMessage(messageId: string): void {
    if (!this.context) return;
    this.context.onLeaveAttemptMessage = messageId;
  }

  /**
   * Get the leave-attempt message ID, if any.
   *
   * @returns Message ID, or undefined
   */
  getOnLeaveAttemptMessage(): string | undefined {
    return this.context?.onLeaveAttemptMessage;
  }

  // =========================================================================
  // Attention management
  // =========================================================================

  /**
   * Attempt to redirect the player's attention to a different NPC.
   * The result depends on the current conversation's strength:
   * - passive: yields immediately
   * - assertive: protests but yields (conversation ends)
   * - blocking: blocks the redirect (conversation stays active)
   *
   * @param _toNpcId - The NPC the player is trying to talk to
   * @returns The result of the redirect attempt
   */
  attemptRedirect(_toNpcId: string): RedirectResult {
    if (!this.context) return 'yields';

    switch (this.context.strength) {
      case 'passive':
        this.end();
        return 'yields';

      case 'assertive':
        this.end();
        return 'protests';

      case 'blocking':
        return 'blocks';
    }
  }

  /**
   * Attempt to leave the room during an active conversation.
   * Same strength-based rules as redirect.
   *
   * @returns The result of the leave attempt
   */
  attemptLeave(): RedirectResult {
    if (!this.context) return 'yields';

    switch (this.context.strength) {
      case 'passive':
        this.end();
        return 'yields';

      case 'assertive':
        this.end();
        return 'protests';

      case 'blocking':
        return 'blocks';
    }
  }

  // =========================================================================
  // NPC continuation scheduling
  // =========================================================================

  /**
   * Schedule a continuation message for N turns after context was set.
   *
   * @param afterTurns - Number of turns after context was set
   * @param messageId - The message ID
   */
  scheduleAfter(afterTurns: number, messageId: string): void {
    if (!this.context) return;
    this.context.continuations.push({ afterTurns, messageId });
  }

  /**
   * Get the continuation message for the current turn count, if any.
   * Continuations fire based on non-conversation turns elapsed.
   *
   * @returns Message ID if a continuation is scheduled for this turn, or undefined
   */
  getContinuationMessage(): string | undefined {
    if (!this.context) return undefined;

    const turns = this.context.nonConversationTurns;
    const entry = this.context.continuations.find(c => c.afterTurns === turns);
    return entry?.messageId;
  }

  // =========================================================================
  // NPC initiative triggers
  // =========================================================================

  /**
   * Register an initiative trigger for an NPC.
   * The NPC will initiate conversation when conditions are met.
   *
   * @param npcId - The NPC entity ID
   * @param conditions - Predicate conditions that must be satisfied
   * @param messageId - The message ID when the NPC initiates
   */
  registerInitiative(npcId: string, conditions: string[], messageId: string): void {
    const triggers = this.initiativeTriggers.get(npcId) ?? [];
    triggers.push({ conditions, messageId });
    this.initiativeTriggers.set(npcId, triggers);
  }

  /**
   * Get initiative triggers for an NPC.
   *
   * @param npcId - The NPC entity ID
   * @returns Array of initiative triggers, or empty array
   */
  getInitiativeTriggers(npcId: string): InitiativeTrigger[] {
    return this.initiativeTriggers.get(npcId) ?? [];
  }

  // =========================================================================
  // Serialization
  // =========================================================================

  /** Export lifecycle state for save/restore. */
  toJSON(): ConversationLifecycleState {
    return {
      context: this.context
        ? {
            ...this.context,
            betweenTurnOverrides: Object.fromEntries(this.context.betweenTurnOverrides),
          }
        : null,
      initiativeTriggers: Object.fromEntries(
        Array.from(this.initiativeTriggers.entries()).map(
          ([npcId, triggers]) => [npcId, triggers],
        ),
      ),
    };
  }

  /** Restore lifecycle state from serialized data. */
  static fromJSON(state: ConversationLifecycleState): ConversationLifecycle {
    const lifecycle = new ConversationLifecycle();

    if (state.context) {
      lifecycle.context = {
        ...state.context,
        betweenTurnOverrides: new Map(
          Object.entries(state.context.betweenTurnOverrides).map(
            ([k, v]) => [Number(k), v] as [number, string],
          ),
        ),
      };
    }

    for (const [npcId, triggers] of Object.entries(state.initiativeTriggers)) {
      lifecycle.initiativeTriggers.set(npcId, triggers);
    }

    return lifecycle;
  }
}

// ---------------------------------------------------------------------------
// Serialization types
// ---------------------------------------------------------------------------

/** Serialized lifecycle state. */
export interface ConversationLifecycleState {
  context: (Omit<ConversationContext, 'betweenTurnOverrides'> & {
    betweenTurnOverrides: Record<string, string>;
  }) | null;
  initiativeTriggers: Record<string, InitiativeTrigger[]>;
}
