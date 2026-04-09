/**
 * Influence builder API (ADR-146 layer 5)
 *
 * Fluent builder for defining NPC influences and resistances.
 * Returns from CharacterBuilder.influence(name) and compiles to
 * InfluenceDef stored in CompiledCharacter.influenceDefs.
 *
 * Public interface: InfluenceBuilder.
 * Owner context: @sharpee/character / influence
 */

import {
  InfluenceMode,
  InfluenceRange,
  InfluenceDuration,
  InfluenceEffect,
  InfluenceSchedule,
  InfluenceDef,
} from './influence-types';

/**
 * Fluent builder for a single influence definition.
 *
 * Usage:
 * ```
 * builder.influence('seduction')
 *   .mode('passive')
 *   .range('proximity')
 *   .effect({ focus: 'clouded', mood: 'distracted' })
 *   .duration('while present')
 *   .witnessed('ginger-brushes-against-{target}')
 *   .resisted('ginger-brushes-against-{target}-no-effect')
 *   .done()
 * ```
 */
export class InfluenceBuilder<TParent> {
  private readonly _name: string;
  private readonly _parent: TParent;
  private readonly _finalize: (def: InfluenceDef) => void;
  private _mode: InfluenceMode = 'passive';
  private _range: InfluenceRange = 'proximity';
  private _effect: InfluenceEffect = {};
  private _duration: InfluenceDuration = 'while present';
  private _witnessed?: string;
  private _resisted?: string;
  private _schedule?: InfluenceSchedule;
  private _onPlayerAction?: string;
  private _lingeringTurns?: number;
  private _lingeringClearCondition?: string;

  /**
   * Create a new influence builder.
   *
   * @param name - Author-defined influence name
   * @param parent - Parent builder to return to on .done()
   * @param finalize - Callback to register the compiled InfluenceDef
   */
  constructor(name: string, parent: TParent, finalize: (def: InfluenceDef) => void) {
    this._name = name;
    this._parent = parent;
    this._finalize = finalize;
  }

  /**
   * Set the influence mode.
   *
   * @param mode - 'passive' or 'active'
   * @returns this for chaining
   */
  mode(mode: InfluenceMode): InfluenceBuilder<TParent> {
    this._mode = mode;
    return this;
  }

  /**
   * Set the influence range.
   *
   * @param range - 'proximity', 'targeted', or 'room'
   * @returns this for chaining
   */
  range(range: InfluenceRange): InfluenceBuilder<TParent> {
    this._range = range;
    return this;
  }

  /**
   * Set the effect mutations applied to targets.
   *
   * @param effect - Character state mutations
   * @returns this for chaining
   */
  effect(effect: InfluenceEffect): InfluenceBuilder<TParent> {
    this._effect = { ...effect };
    return this;
  }

  /**
   * Set the duration type.
   *
   * @param duration - 'while present', 'momentary', or 'lingering'
   * @returns this for chaining
   */
  duration(duration: InfluenceDuration): InfluenceBuilder<TParent> {
    this._duration = duration;
    return this;
  }

  /**
   * Set the message ID when the target is affected.
   *
   * @param messageId - Message ID
   * @returns this for chaining
   */
  witnessed(messageId: string): InfluenceBuilder<TParent> {
    this._witnessed = messageId;
    return this;
  }

  /**
   * Set the message ID when the target resists.
   *
   * @param messageId - Message ID
   * @returns this for chaining
   */
  resisted(messageId: string): InfluenceBuilder<TParent> {
    this._resisted = messageId;
    return this;
  }

  /**
   * Set scheduling conditions for passive influences.
   *
   * @param schedule - Schedule with predicate conditions
   * @returns this for chaining
   */
  schedule(schedule: InfluenceSchedule): InfluenceBuilder<TParent> {
    this._schedule = { ...schedule };
    return this;
  }

  /**
   * Set the message ID when PC tries to act while under this influence.
   *
   * @param messageId - Message ID
   * @returns this for chaining
   */
  onPlayerAction(messageId: string): InfluenceBuilder<TParent> {
    this._onPlayerAction = messageId;
    return this;
  }

  /**
   * Set lingering duration in turns.
   *
   * @param turns - Number of turns the effect persists
   * @returns this for chaining
   */
  lingeringTurns(turns: number): InfluenceBuilder<TParent> {
    this._lingeringTurns = turns;
    return this;
  }

  /**
   * Set a predicate condition that clears a lingering effect.
   *
   * @param condition - Predicate condition
   * @returns this for chaining
   */
  clearsWhen(condition: string): InfluenceBuilder<TParent> {
    this._lingeringClearCondition = condition;
    return this;
  }

  /**
   * Finalize this influence definition and return the parent builder.
   *
   * @returns The parent builder
   */
  done(): TParent {
    this._finalize(this._buildDef());
    return this._parent;
  }

  /**
   * Compile the parent builder, auto-finalizing this influence.
   *
   * @returns Compiled character data (delegates to parent's compile())
   */
  compile(): ReturnType<TParent extends { compile(): infer R } ? () => R : never> {
    const parent = this.done();
    return (parent as any).compile();
  }

  /** @internal Build the InfluenceDef without finalizing. */
  _buildDef(): InfluenceDef {
    const def: InfluenceDef = {
      name: this._name,
      mode: this._mode,
      range: this._range,
      effect: { ...this._effect },
      duration: this._duration,
    };

    if (this._witnessed !== undefined) def.witnessed = this._witnessed;
    if (this._resisted !== undefined) def.resisted = this._resisted;
    if (this._schedule !== undefined) def.schedule = { ...this._schedule };
    if (this._onPlayerAction !== undefined) def.onPlayerAction = this._onPlayerAction;
    if (this._lingeringTurns !== undefined) def.lingeringTurns = this._lingeringTurns;
    if (this._lingeringClearCondition !== undefined) def.lingeringClearCondition = this._lingeringClearCondition;

    return def;
  }
}
