const PETTING_ACTION_ID = 'zoo.action.petting';

const pettingAction: Action = {
  id: PETTING_ACTION_ID,
  group: 'interaction',

  validate(context: ActionContext): ValidationResult {
    const entity = context.command.directObject?.entity;
    if (!entity) return { valid: false, error: PetMessages.CANT_PET };

    // Find the trait on the target that claims this capability
    const trait = findTraitWithCapability(entity, PETTING_ACTION_ID);
    if (!trait) return { valid: false, error: PetMessages.CANT_PET };

    // Look up the behavior registered on this world for that trait + capability
    const behavior = context.world.getBehaviorForCapability(trait, PETTING_ACTION_ID);
    if (!behavior) return { valid: false, error: PetMessages.CANT_PET };

    // Delegate validation to the behavior
    const sharedData: CapabilitySharedData = {};
    const result = behavior.validate(entity, context.world, context.player.id, sharedData);
    if (!result.valid) return { valid: false, error: result.error };

    // Carry the resolved behavior into the later phases
    context.sharedData.capEntity = entity;
    context.sharedData.capBehavior = behavior;
    context.sharedData.capSharedData = sharedData;
    return { valid: true };
  },

  execute(context: ActionContext): void {
    const entity = context.sharedData.capEntity as IFEntity;
    const behavior = context.sharedData.capBehavior as CapabilityBehavior;
    const shared = context.sharedData.capSharedData as CapabilitySharedData;
    if (entity && behavior) behavior.execute(entity, context.world, context.player.id, shared);
  },

  report(context: ActionContext): ISemanticEvent[] {
    const entity = context.sharedData.capEntity as IFEntity;
    const behavior = context.sharedData.capBehavior as CapabilityBehavior;
    const shared = context.sharedData.capSharedData as CapabilitySharedData;
    if (!entity || !behavior) return [];
    const effects = behavior.report(entity, context.world, context.player.id, shared);
    return effects.map(effect => context.event(effect.type, effect.payload));
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('zoo.event.petting_blocked', {
      messageId: result.error || PetMessages.CANT_PET,
    })];
  },
};
