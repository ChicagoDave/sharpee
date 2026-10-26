/**
 * Setting action — `set <x> to <value>` (ADR-371 D3).
 *
 * SET has no standard semantics: a dial's positions are the thing's own.
 * The action parses the verb and carries the typed value; the target's
 * registered implementation decides whether the value is one of its
 * settings and writes it — the story-loader registers one such behavior
 * for every Chord thing marked `settable`, built from its reversible
 * states, and a TS story registers a capability behavior as with turning.
 * A target with no implementation refuses cant_set_that; a command with no
 * value refuses no_value before the implementation is looked up.
 *
 * The typed value rides into the behavior's sharedData and the interceptor
 * slot's seeded data as `value`, so a Chord `on the player setting to <x>`
 * head can be guarded on it (D4).
 *
 * Public interface: settingAction, settingLifecycle, SettingMessages.
 * Owner context: stdlib / standard actions / manipulation
 */

import { ActionContext } from '../../enhanced-types.js';
import { IFActions } from '../../constants.js';
import { createImplementationDispatchingAction } from '../dispatch-shared.js';
import type { ActionLifecycleDescriptor } from '../../lifecycle/index.js';
import { SettingMessages } from './setting-messages.js';

/** The typed value, trimmed and lowercased; undefined when the command carried none. */
function typedValue(context: ActionContext): string | undefined {
  const text = context.command.topic?.text?.trim().toLowerCase();
  return text ? text : undefined;
}

const built = createImplementationDispatchingAction({
  actionId: IFActions.SETTING,
  group: 'manipulation',
  reportEventType: 'if.event.set',
  blockedEventType: 'if.event.set_blocked',
  messages: {
    noTarget: SettingMessages.NO_TARGET,
    cantDoThat: SettingMessages.CANT_SET_THAT,
    done: SettingMessages.SET
  },
  extraMessages: [SettingMessages.NO_VALUE, SettingMessages.NOT_A_SETTING],
  earlyRefusal(context, target) {
    if (typedValue(context) === undefined) {
      return { valid: false, error: SettingMessages.NO_VALUE, params: { target: target.name } };
    }
    return undefined;
  },
  seed(context) {
    return { value: typedValue(context) };
  },
  reportParams(context) {
    const value = typedValue(context);
    return value ? { value } : {};
  }
});

export const settingAction = built.action;
export const settingLifecycle: ActionLifecycleDescriptor = built.lifecycle;
export { SettingMessages };
