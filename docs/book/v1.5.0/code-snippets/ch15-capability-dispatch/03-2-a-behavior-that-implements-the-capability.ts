const PetMessages = {
  PET_GOATS: 'zoo.petting.goats',
  PET_RABBITS: 'zoo.petting.rabbits',
  PET_PARROT: 'zoo.petting.parrot',
  CANT_PET: 'zoo.petting.cant_pet',
} as const;

const pettingBehavior: CapabilityBehavior = {
  validate(_entity, _world, _actorId, _shared): CapabilityValidationResult {
    return { valid: true };          // every pettable animal accepts a pet
  },

  execute(_entity, _world, _actorId, _shared): void {
    // no world mutation; petting is cosmetic
  },

  report(entity, _world, _actorId, _shared): CapabilityEffect[] {
    const pettable = entity.get(PettableTrait);
    let messageId: string = PetMessages.CANT_PET;
    switch (pettable?.animalKind) {
      case 'goats':   messageId = PetMessages.PET_GOATS; break;
      case 'rabbits': messageId = PetMessages.PET_RABBITS; break;
      case 'parrot':  messageId = PetMessages.PET_PARROT; break;
    }
    return [createEffect('zoo.event.petted', {
      messageId,
      params: { target: entity.name },
    })];
  },

  blocked(entity, _world, _actorId, error, _shared): CapabilityEffect[] {
    return [createEffect('zoo.event.petting_blocked', {
      messageId: error,
      params: { target: entity.name },
    })];
  },
};
