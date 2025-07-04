/**
 * Standard event types and tags
 * TODO: Move to proper location
 */

// Using const objects instead of enums for better JavaScript compatibility
export const StandardEventTypes = {
  ACTION: 'action',
  SYSTEM: 'system',
  NARRATIVE: 'narrative',
  ERROR: 'error'
} as const;

export const StandardEventTags = {
  SUCCESS: 'success',
  FAILURE: 'failure',
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error'
} as const;

export const EventCategories = {
  ACTION: 'action',
  SYSTEM: 'system',
  NARRATIVE: 'narrative'
} as const;

// Type helpers for TypeScript users
export type StandardEventType = typeof StandardEventTypes[keyof typeof StandardEventTypes];
export type StandardEventTag = typeof StandardEventTags[keyof typeof StandardEventTags];
export type EventCategory = typeof EventCategories[keyof typeof EventCategories];
