const feedAction: Action = {
  id: 'zoo.action.feeding',
  group: 'interaction',

  // Phase 1: can the action proceed?
  validate(context: ActionContext): ValidationResult {
    if (!hasRequiredItem) return { valid: false, error: 'no_feed' };
    return { valid: true };
  },

  // Phase 2: mutate the world (only runs if valid)
  execute(context: ActionContext): void {
    context.world.setStateValue('item-used', true);
  },

  // Phase 3: success events (text output)
  report(context: ActionContext): ISemanticEvent[] {
    return [context.event('zoo.event.fed', { messageId: 'fed_goats' })];
  },

  // Phase 4: failure events (runs instead of execute/report if invalid)
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('zoo.event.feeding_blocked', { messageId: result.error })];
  },
};
