const mapId = this.entityIds.zooMap;
world.chainEvent(
  'if.event.taken',
  (event: ISemanticEvent, w: IWorldModel) => {
    const data = event.data as Record<string, any>;
    if (data.itemId === mapId) {
      w.awardScore(ScoreIds.COLLECT_MAP,
        ScorePoints[ScoreIds.COLLECT_MAP],
        'Collected the zoo map');
    }
    return null;
  },
  { key: 'zoo.chain.take-scoring' },
);

const brochureId = this.entityIds.brochure;
world.chainEvent(
  'if.event.read',
  (event: ISemanticEvent, w: IWorldModel) => {
    const data = event.data as Record<string, any>;
    if (data.entityId === brochureId ||
        data.targetId === brochureId) {
      w.awardScore(ScoreIds.READ_BROCHURE,
        ScorePoints[ScoreIds.READ_BROCHURE],
        'Read the zoo brochure');
    }
    return null;
  },
  { key: 'zoo.chain.read-scoring' },
);
