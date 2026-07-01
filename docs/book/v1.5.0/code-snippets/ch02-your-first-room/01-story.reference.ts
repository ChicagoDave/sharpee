interface Story {
  config: StoryConfig;
  initializeWorld(world: WorldModel): void;
  createPlayer(world: WorldModel): IFEntity;
  // optional:
  getCustomActions?(): any[];
  getCustomVocabulary?(): CustomVocabulary;
  extendParser?(parser: Parser): void;
  isComplete?(): boolean;
}
