import { Story, StoryConfig } from '@sharpee/engine';
import { WorldModel, IFEntity, EntityType } from '@sharpee/world-model';
import {
  IdentityTrait,
  ActorTrait,
  ContainerTrait,
  RoomTrait,
  SceneryTrait,
} from '@sharpee/world-model';

const config: StoryConfig = {
  id: 'familyzoo',
  title: 'Family Zoo',
  author: 'Sharpee Tutorial',
  version: '0.1.0',
  description: 'A small family zoo: Learn Sharpee one concept at a time.',
};

class FamilyZooStory implements Story {
  config = config;

  // createPlayer(world)     - fills in next
  // initializeWorld(world)  - and after that
}
