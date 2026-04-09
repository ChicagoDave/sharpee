/**
 * Goal builder API (ADR-145 layer 5)
 *
 * Fluent builder for defining NPC goals with activation conditions,
 * pursuit modes, behavior sequences, and interruption rules.
 * Returns from CharacterBuilder.goal(id) and compiles to GoalDef
 * stored in CompiledCharacter.goalDefs.
 *
 * Public interface: GoalBuilder.
 * Owner context: @sharpee/character / goals
 */

import {
  GoalPriority,
  PursuitMode,
  GoalStep,
  GoalDef,
} from './goal-types';

/**
 * Fluent builder for a single goal definition.
 *
 * Usage:
 * ```
 * builder.goal('eliminate-player')
 *   .activatesWhen('knows murder discovered', 'has weapon')
 *   .priority('critical')
 *   .mode('prepared')
 *   .pursues([
 *     { type: 'moveTo', target: 'study' },
 *     { type: 'acquire', target: 'knife' },
 *   ])
 *   .actsWhen('alone with player')
 *   .act('colonel-attacks-player')
 *   .onInterrupt('colonel-retreats')
 *   .resumeOnClear(true)
 *   .done()
 * ```
 */
export class GoalBuilder<TParent> {
  private readonly _id: string;
  private readonly _parent: TParent;
  private readonly _finalize: (def: GoalDef) => void;
  private readonly _activatesWhen: string[] = [];
  private readonly _interruptedBy: string[] = [];
  private _priority: GoalPriority = 'medium';
  private _mode: PursuitMode = 'sequential';
  private _steps: GoalStep[] = [];
  private readonly _actsWhen: string[] = [];
  private _actMessageId?: string;
  private _onInterrupt?: string;
  private _resumeOnClear = false;

  /**
   * Create a new goal builder.
   *
   * @param id - Unique goal identifier
   * @param parent - Parent builder to return to on .done()
   * @param finalize - Callback to register the compiled GoalDef
   */
  constructor(id: string, parent: TParent, finalize: (def: GoalDef) => void) {
    this._id = id;
    this._parent = parent;
    this._finalize = finalize;
  }

  /**
   * Set predicate conditions that activate this goal.
   *
   * @param predicates - Predicate names (all must be true)
   * @returns this for chaining
   */
  activatesWhen(...predicates: string[]): GoalBuilder<TParent> {
    this._activatesWhen.push(...predicates);
    return this;
  }

  /**
   * Set goal priority.
   *
   * @param priority - Priority word
   * @returns this for chaining
   */
  priority(priority: GoalPriority): GoalBuilder<TParent> {
    this._priority = priority;
    return this;
  }

  /**
   * Set pursuit mode.
   *
   * @param mode - How the NPC pursues the goal
   * @returns this for chaining
   */
  mode(mode: PursuitMode): GoalBuilder<TParent> {
    this._mode = mode;
    return this;
  }

  /**
   * Set the behavior sequence (for sequential and prepared modes).
   *
   * @param steps - Array of goal steps
   * @returns this for chaining
   */
  pursues(steps: GoalStep[]): GoalBuilder<TParent> {
    this._steps = [...steps];
    return this;
  }

  /**
   * Set conditions for the final act (opportunistic/prepared modes).
   *
   * @param predicates - Predicate names (all must be true)
   * @returns this for chaining
   */
  actsWhen(...predicates: string[]): GoalBuilder<TParent> {
    this._actsWhen.push(...predicates);
    return this;
  }

  /**
   * Set the message ID for the final act.
   *
   * @param messageId - Message ID
   * @returns this for chaining
   */
  act(messageId: string): GoalBuilder<TParent> {
    this._actMessageId = messageId;
    return this;
  }

  /**
   * Set predicate conditions that interrupt (suspend) this goal.
   *
   * @param predicates - Predicate names
   * @returns this for chaining
   */
  interruptedBy(...predicates: string[]): GoalBuilder<TParent> {
    this._interruptedBy.push(...predicates);
    return this;
  }

  /**
   * Set the message ID when the goal is interrupted.
   *
   * @param messageId - Message ID
   * @returns this for chaining
   */
  onInterrupt(messageId: string): GoalBuilder<TParent> {
    this._onInterrupt = messageId;
    return this;
  }

  /**
   * Set whether the goal resumes from where it left off after interruption.
   *
   * @param resume - Whether to resume
   * @returns this for chaining
   */
  resumeOnClear(resume: boolean): GoalBuilder<TParent> {
    this._resumeOnClear = resume;
    return this;
  }

  /**
   * Finalize this goal definition and return the parent builder.
   *
   * @returns The parent builder
   */
  done(): TParent {
    this._finalize(this._buildDef());
    return this._parent;
  }

  /**
   * Compile the parent builder, auto-finalizing this goal.
   * Allows calling .compile() directly from a goal chain without .done().
   *
   * @returns Compiled character data (delegates to parent's compile())
   */
  compile(): ReturnType<TParent extends { compile(): infer R } ? () => R : never> {
    const parent = this.done();
    return (parent as any).compile();
  }

  /** @internal Build the GoalDef without finalizing. */
  _buildDef(): GoalDef {
    const def: GoalDef = {
      id: this._id,
      activatesWhen: [...this._activatesWhen],
      priority: this._priority,
      mode: this._mode,
    };

    if (this._steps.length > 0) def.steps = [...this._steps];
    if (this._interruptedBy.length > 0) def.interruptedBy = [...this._interruptedBy];
    if (this._actsWhen.length > 0) def.actsWhen = [...this._actsWhen];
    if (this._actMessageId !== undefined) def.actMessageId = this._actMessageId;
    if (this._onInterrupt !== undefined) def.onInterrupt = this._onInterrupt;
    if (this._resumeOnClear) def.resumeOnClear = true;

    return def;
  }
}
