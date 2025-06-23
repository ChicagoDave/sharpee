// packages/stdlib/src/constants/if-entity-types.ts
/**
 * Interactive Fiction entity types
 * These extend the core entity system with IF-specific concepts
 */
export var IFEntityType;
(function (IFEntityType) {
    // Location entities
    IFEntityType["ROOM"] = "if.room";
    IFEntityType["REGION"] = "if.region";
    // Object entities
    IFEntityType["THING"] = "if.thing";
    IFEntityType["CONTAINER"] = "if.container";
    IFEntityType["SUPPORTER"] = "if.supporter";
    IFEntityType["DOOR"] = "if.door";
    IFEntityType["BACKDROP"] = "if.backdrop";
    // Character entities
    IFEntityType["PERSON"] = "if.person";
    IFEntityType["PLAYER"] = "if.player";
    IFEntityType["NPC"] = "if.npc";
    // Device entities
    IFEntityType["DEVICE"] = "if.device";
    IFEntityType["SWITCH"] = "if.switch";
    // Special entities
    IFEntityType["DIRECTION"] = "if.direction";
    IFEntityType["SCENE"] = "if.scene";
})(IFEntityType || (IFEntityType = {}));
/**
 * Type guards for IF entity types
 */
export function isLocation(type) {
    return type === IFEntityType.ROOM || type === IFEntityType.REGION;
}
export function isObject(type) {
    return [
        IFEntityType.THING,
        IFEntityType.CONTAINER,
        IFEntityType.SUPPORTER,
        IFEntityType.DOOR,
        IFEntityType.BACKDROP,
        IFEntityType.DEVICE,
        IFEntityType.SWITCH
    ].includes(type);
}
export function isCharacter(type) {
    return [
        IFEntityType.PERSON,
        IFEntityType.PLAYER,
        IFEntityType.NPC
    ].includes(type);
}
export function canContainThings(type) {
    return [
        IFEntityType.ROOM,
        IFEntityType.CONTAINER,
        IFEntityType.SUPPORTER,
        IFEntityType.PERSON,
        IFEntityType.PLAYER,
        IFEntityType.NPC
    ].includes(type);
}
//# sourceMappingURL=if-entity-types.js.map