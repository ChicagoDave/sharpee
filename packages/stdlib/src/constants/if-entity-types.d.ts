/**
 * Interactive Fiction entity types
 * These extend the core entity system with IF-specific concepts
 */
export declare enum IFEntityType {
    ROOM = "if.room",
    REGION = "if.region",
    THING = "if.thing",
    CONTAINER = "if.container",
    SUPPORTER = "if.supporter",
    DOOR = "if.door",
    BACKDROP = "if.backdrop",
    PERSON = "if.person",
    PLAYER = "if.player",
    NPC = "if.npc",
    DEVICE = "if.device",
    SWITCH = "if.switch",
    DIRECTION = "if.direction",
    SCENE = "if.scene"
}
/**
 * Type guards for IF entity types
 */
export declare function isLocation(type: string): boolean;
export declare function isObject(type: string): boolean;
export declare function isCharacter(type: string): boolean;
export declare function canContainThings(type: string): boolean;
