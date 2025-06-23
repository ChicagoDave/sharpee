import { 
  IFEntityType,
  IFAttributes,
  IFEntity,
  DoorAttributes,
  EntityId
} from '@sharpee/core/src/world-model/if-entities/types';
import { StoryBuilder, ForgeContext } from './story-builder';
import { IFRelationship } from '@sharpee/core/src/world-model/if-entities/relationships';
import { Direction } from '@sharpee/core/src/world-model/if-entities/relationships';

/**
 * Builder for creating and configuring doors in the story
 */
export class DoorBuilder {
  private storyBuilder: StoryBuilder;
  private doorId: string;
  private config: DoorConfig;

  constructor(storyBuilder: StoryBuilder, doorId: string, config: DoorConfig) {
    this.storyBuilder = storyBuilder;
    this.doorId = doorId;
    this.config = config;
  }

  /**
   * Make the door lockable with a specific key
   */
  public withLock(keyId: string): DoorBuilder {
    this.config.attributes.lockable = true;
    this.config.attributes.key = keyId;
    return this;
  }

  /**
   * Set the door's initial state (open/closed)
   */
  public initialState(isOpen: boolean): DoorBuilder {
    this.config.attributes.open = isOpen;
    return this;
  }

  /**
   * Add a description for when the door is closed
   */
  public closedDescription(description: string): DoorBuilder {
    this.config.closedDescription = description;
    return this;
  }

  /**
   * Add a description for when the door is locked
   */
  public lockedDescription(description: string): DoorBuilder {
    this.config.lockedDescription = description;
    return this;
  }

  /**
   * Register a handler for when the player tries to open this door
   */
  public onOpen(handler: (context: ForgeContext) => void): DoorBuilder {
    this.config.onOpen = handler;
    return this;
  }

  /**
   * Register a handler for when the player tries to lock/unlock this door
   */
  public onLock(handler: (context: ForgeContext) => void): DoorBuilder {
    this.config.onLock = handler;
    return this;
  }

  /**
   * Connect this door to two locations
   */
  public connect(locations: [string, string]): DoorBuilder {
    this.config.connects = locations;
    return this;
  }

  /**
   * Return to the story builder
   */
  public endDoor(): StoryBuilder {
    return this.storyBuilder;
  }
}

/**
 * Configuration for a door entity
 */
export interface DoorConfig extends IFEntity {
  type: IFEntityType.DOOR;
  name: string;
  description?: string;
  attributes: DoorAttributes & {
    hidden?: boolean;
    closedDescription?: string;
    lockedDescription?: string;
  };
  connects: [string, string];
  onOpen?: (context: ForgeContext) => void;
  onClose?: (context: ForgeContext) => void;
  onLock?: (context: ForgeContext) => void;
  onUnlock?: (context: ForgeContext) => void;
}
