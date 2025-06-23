/**
 * Standard event types and tags
 * TODO: Move to proper location
 */

export enum StandardEventTypes {
  ACTION = 'action',
  SYSTEM = 'system',
  NARRATIVE = 'narrative'
}

export enum StandardEventTags {
  SUCCESS = 'success',
  FAILURE = 'failure',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error'
}

export const EventCategories = {
  ACTION: 'action',
  SYSTEM: 'system',
  NARRATIVE: 'narrative'
} as const;
