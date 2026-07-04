import { GameEngine } from '@sharpee/engine';
import { ISemanticEvent } from '@sharpee/core';
import { IWorldModel } from '@sharpee/world-model';

class FamilyZooStory implements Story {
  config = config;

  private roomIds: { giftShop: string; pettingZoo: string } =
    { giftShop: '', pettingZoo: '' };
  private entityIds: {
    animalFeed: string;
    penny: string;
    souvenirPress: string;
  } = { animalFeed: '', penny: '', souvenirPress: '' };

  // createPlayer / initializeWorld / onEngineReady …
}
