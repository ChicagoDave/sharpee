// packages/stdlib/src/constants/if-entity-types.ts

/**
 * Interactive Fiction entity types
 * These extend the core entity system with IF-specific concepts
 */
export enum IFEntityType {
  // Location entities
  ROOM = 'if.room',
  REGION = 'if.region',
  
  // Object entities
  THING = 'if.thing',
  CONTAINER = 'if.container',
  SUPPORTER = 'if.supporter',
  DOOR = 'if.door',
  BACKDROP = 'if.backdrop',
  
  // Character entities
  PERSON = 'if.person',
  PLAYER = 'if.player',
  NPC = 'if.npc',
  
  // Device entities
  DEVICE = 'if.device',
  SWITCH = 'if.switch',
  
  // Special entities
  DIRECTION = 'if.direction',
  SCENE = 'if.scene',
  KEY = 'if.key'
}

/**
 * Type guards for IF entity types
 */
export function isLocation(type: string): boolean {
  return type === IFEntityType.ROOM || type === IFEntityType.REGION;
}

export function isObject(type: string): boolean {
  return [
    IFEntityType.THING,
    IFEntityType.CONTAINER,
    IFEntityType.SUPPORTER,
    IFEntityType.DOOR,
    IFEntityType.BACKDROP,
    IFEntityType.DEVICE,
    IFEntityType.SWITCH
  ].includes(type as IFEntityType);
}

export function isCharacter(type: string): boolean {
  return [
    IFEntityType.PERSON,
    IFEntityType.PLAYER,
    IFEntityType.NPC
  ].includes(type as IFEntityType);
}

export function canContainThings(type: string): boolean {
  return [
    IFEntityType.ROOM,
    IFEntityType.CONTAINER,
    IFEntityType.SUPPORTER,
    IFEntityType.PERSON,
    IFEntityType.PLAYER,
    IFEntityType.NPC
  ].includes(type as IFEntityType);
}
