world.chainEvent(
  'if.event.dropped',
  (event, w) => {
    const data = event.data as Record<string, any>;
    // not our item, ignore
    if (data.itemId !== feedId) return null;
    return {
      id: `goats-react-${Date.now()}`,
      type: 'zoo.event.goats_react',
      timestamp: Date.now(),
      entities: {},
      data: { text: 'The goats rush over and devour the feed!' },
    };
  },
  { key: 'zoo.chain.goats-eat-feed' },
);
