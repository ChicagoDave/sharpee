const FEED_ACTION_ID = 'zoo.action.feeding';

const FeedMessages = {
  NO_FEED: 'zoo.feeding.no_feed',
  NOT_AN_ANIMAL: 'zoo.feeding.not_animal',
  ALREADY_FED: 'zoo.feeding.already_fed',
  FED_GOATS: 'zoo.feeding.fed_goats',
  FED_RABBITS: 'zoo.feeding.fed_rabbits',
  FED_GENERIC: 'zoo.feeding.fed_generic',
} as const;

const feedAction: Action = {
  id: FEED_ACTION_ID,
  group: 'interaction',

  validate(context: ActionContext): ValidationResult {
    const target = context.command.directObject?.entity;

    // Player must be carrying the feed
    const inventory = context.world
      .getContents(context.player.id);
    const hasFeed = inventory.some(item =>
      item.get(IdentityTrait)?.aliases?.includes('feed'));
    if (!hasFeed) {
      return { valid: false, error: FeedMessages.NO_FEED };
    }

    // There must be a target, and it must be feedable
    if (!target) {
      return { valid: false, error: FeedMessages.NOT_AN_ANIMAL };
    }
    const name =
      target.get(IdentityTrait)?.name?.toLowerCase() || '';
    const feedable = ['pygmy goats', 'rabbits']
      .some(a => name.includes(a));
    if (!feedable) {
      return { valid: false, error: FeedMessages.NOT_AN_ANIMAL };
    }

    // Not already fed
    if (context.world.getStateValue(`fed-${target.id}`)) {
      return { valid: false, error: FeedMessages.ALREADY_FED };
    }

    // Hand the target to the later phases
    context.sharedData.feedTarget = target;
    return { valid: true };
  },

  execute(context: ActionContext): void {
    const target = context.sharedData.feedTarget as IFEntity;
    if (target) {
      context.world.setStateValue(`fed-${target.id}`, true);
    }
  },

  report(context: ActionContext): ISemanticEvent[] {
    const target = context.sharedData.feedTarget as IFEntity;
    const name =
      target?.get(IdentityTrait)?.name?.toLowerCase() || '';

    let messageId: string = FeedMessages.FED_GENERIC;
    if (name.includes('goats')) {
      messageId = FeedMessages.FED_GOATS;
    } else if (name.includes('rabbits')) {
      messageId = FeedMessages.FED_RABBITS;
    }

    return [context.event('zoo.event.fed', {
      messageId,
      params: {
        animal: target?.get(IdentityTrait)?.name || 'animal',
      },
    })];
  },

  blocked(
    context: ActionContext,
    result: ValidationResult,
  ): ISemanticEvent[] {
    return [context.event('zoo.event.feeding_blocked', {
      messageId: result.error || FeedMessages.NOT_AN_ANIMAL,
    })];
  },
};
