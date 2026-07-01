const feedId = this.entityIds.animalFeed;
const pettingZooId = this.roomIds.pettingZoo;

world.chainEvent(
  'if.event.dropped',
  (event: ISemanticEvent, w: IWorldModel): ISemanticEvent | null => {
    const data = event.data as Record<string, any>;

    // Is it the feed, dropped in the petting zoo?
    if (data.itemId !== feedId || data.toLocation !== pettingZooId) {
      return null;
    }

    // Only react once
    if (w.getStateValue('goats-fed')) return null;
    w.setStateValue('goats-fed', true);

    return {
      id: `zoo-goats-eat-${Date.now()}`,
      type: 'zoo.event.goats_react',
      timestamp: Date.now(),
      entities: {},
      data: {
        text: 'The pygmy goats spot the bag of feed and rush over! They ' +
              'crowd around, bleating excitedly, and devour the corn and ' +
              'pellets in seconds. The smallest goat looks up at you with ' +
              'big grateful eyes.',
      },
    };
  },
  { key: 'zoo.chain.goats-eat-feed' },
);
