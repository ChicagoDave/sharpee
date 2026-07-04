const PHOTOGRAPH_ACTION_ID = 'zoo.action.photographing';

const PhotoMessages = {
  NO_CAMERA: 'zoo.photo.no_camera',
  TOOK_PHOTO: 'zoo.photo.took_photo',
} as const;

const photographAction: Action = {
  id: PHOTOGRAPH_ACTION_ID,
  group: 'interaction',

  validate(context: ActionContext): ValidationResult {
    const inventory = context.world
      .getContents(context.player.id);
    const hasCamera = inventory.some(item =>
      item.get(IdentityTrait)?.aliases?.includes('camera'));
    if (!hasCamera) {
      return { valid: false, error: PhotoMessages.NO_CAMERA };
    }

    const target = context.command.directObject?.entity;
    if (target) context.sharedData.photoTarget = target;
    return { valid: true };
  },

  execute(_context: ActionContext): void {
    // Photographs are cosmetic; nothing in the world changes.
  },

  report(context: ActionContext): ISemanticEvent[] {
    const target =
      context.sharedData.photoTarget as IFEntity | undefined;
    const name =
      target?.get(IdentityTrait)?.name || 'the scenery';
    return [context.event('zoo.event.photographed', {
      messageId: PhotoMessages.TOOK_PHOTO,
      params: { target: name },
    })];
  },

  blocked(
    context: ActionContext,
    result: ValidationResult,
  ): ISemanticEvent[] {
    return [context.event('zoo.event.photographing_blocked', {
      messageId: result.error || PhotoMessages.NO_CAMERA,
    })];
  },
};
