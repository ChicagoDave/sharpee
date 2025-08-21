/**
 * Builder for room description events with atomic data
 */

import { EventBuilder } from './EventBuilder';
import { EntityId } from '../../types/entity';

/**
 * Data structure for room description events
 */
export interface RoomDescriptionData {
  roomId: EntityId;
  roomName: string;
  description: string;
  isDark?: boolean;
  contents?: Array<{
    id: EntityId;
    name: string;
    description?: string;
  }>;
  exits?: Array<{
    direction: string;
    targetId?: EntityId;
    description?: string;
  }>;
}

/**
 * Builder for creating room description events
 */
export class RoomDescriptionEventBuilder extends EventBuilder<RoomDescriptionData> {
  constructor() {
    super('room.described');
  }

  /**
   * Set room information
   */
  withRoom(roomId: EntityId, name: string, description: string): this {
    if (!this.data) {
      this.data = {} as RoomDescriptionData;
    }
    this.data.roomId = roomId;
    this.data.roomName = name;
    this.data.description = description;
    return this;
  }

  /**
   * Set darkness state
   */
  withDarkness(isDark: boolean): this {
    if (!this.data) {
      this.data = {} as RoomDescriptionData;
    }
    this.data.isDark = isDark;
    return this;
  }

  /**
   * Add room contents
   */
  withContents(contents: RoomDescriptionData['contents']): this {
    if (!this.data) {
      this.data = {} as RoomDescriptionData;
    }
    this.data.contents = contents;
    return this;
  }

  /**
   * Add available exits
   */
  withExits(exits: RoomDescriptionData['exits']): this {
    if (!this.data) {
      this.data = {} as RoomDescriptionData;
    }
    this.data.exits = exits;
    return this;
  }
}