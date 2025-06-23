/**
 * Condition builder utilities
 * TODO: Implement proper condition builders
 */

export const player = (property: string) => ({ type: 'player', property });
export const item = (property: string) => ({ type: 'item', property });
export const location = (property: string) => ({ type: 'location', property });
export const direction = (property: string) => ({ type: 'direction', property });

export type EntityReference = ReturnType<typeof player | typeof item | typeof location>;
export type ValueReference = string | number | boolean;
