/**
 * Helper functions for common rule patterns
 */
/**
 * Helper to get the target item from an event
 */
export function getTargetItem(event, world) {
    const targetId = event.entities.target || event.payload?.itemId;
    // Ensure targetId is a string before passing to getEntity
    if (typeof targetId === 'string') {
        return world.getEntity(targetId);
    }
    return undefined;
}
/**
 * Helper to get the actor from an event
 */
export function getActor(event, world) {
    const actorId = event.entities.actor;
    return actorId ? world.getEntity(actorId) : undefined;
}
/**
 * Helper to check if entity has a specific name/id
 */
export function entityIs(entity, nameOrId) {
    return entity?.id === nameOrId || entity?.attributes?.name === nameOrId;
}
/**
 * Helper to get entity attribute value
 */
export function getAttribute(entity, attribute) {
    return entity?.attributes?.[attribute];
}
/**
 * Helper to check if entity has an ability
 */
export function hasAbility(entity, ability) {
    return entity?.attributes?.[`ability_${ability}`] === true;
}
/**
 * Helper to create an entity change that gives an ability
 */
export function giveAbility(entityId, ability) {
    return {
        entityId,
        attribute: `ability_${ability}`,
        value: true
    };
}
/**
 * Helper to create an entity change that removes an ability
 */
export function removeAbility(entityId, ability) {
    return {
        entityId,
        attribute: `ability_${ability}`,
        value: undefined
    };
}
/**
 * Helper to create an entity change that sets an attribute
 */
export function setAttribute(entityId, attribute, value) {
    return {
        entityId,
        attribute,
        value
    };
}
/**
 * Common condition: item weight vs player strength
 */
export function itemTooHeavy(event, world) {
    const item = getTargetItem(event, world);
    const player = world.getPlayer();
    const itemWeight = getAttribute(item, 'weight') || 0;
    const playerStrength = getAttribute(player, 'strength') || 10;
    return itemWeight > playerStrength;
}
/**
 * Common condition: check if taking a specific item
 */
export function isTaking(itemNameOrId) {
    return (event, world) => {
        const item = getTargetItem(event, world);
        return entityIs(item, itemNameOrId);
    };
}
/**
 * Common condition: player has specific ability
 */
export function playerHasAbility(ability) {
    return (event, world) => {
        const player = world.getPlayer();
        return hasAbility(player, ability);
    };
}
//# sourceMappingURL=helpers.js.map