// tests/setup.ts
// Jest setup and custom matchers for world-model tests

import { IFEntity } from '../src/entities/if-entity';
import { TraitType } from '../src/traits/trait-types';

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInLocation(location: IFEntity | null): R;
      toBeVisible(): R;
      toHaveTrait(traitName: string): R;
      toContainEntity(entity: IFEntity): R;
      toHaveAttribute(attribute: string, value?: any): R;
    }
  }
}

// Custom matcher implementations
expect.extend({
  toBeInLocation(received: IFEntity, location: IFEntity | null) {
    const actualLocation = received.attributes.location as IFEntity;
    const pass = actualLocation === location;

    return {
      pass,
      message: () =>
        pass
          ? `expected ${received.name} not to be in ${location?.name || 'null'}`
          : `expected ${received.name} to be in ${location?.name || 'null'}, but was in ${actualLocation?.name || 'null'}`
    };
  },

  toBeVisible(received: IFEntity) {
    const visible = received.attributes.visible !== false;
    
    return {
      pass: visible,
      message: () =>
        visible
          ? `expected ${received.name} not to be visible`
          : `expected ${received.name} to be visible`
    };
  },

  toHaveTrait(received: IFEntity, traitName: string) {
    const hasTrait = received.has(traitName);
    
    return {
      pass: hasTrait,
      message: () =>
        hasTrait
          ? `expected ${received.name} not to have trait '${traitName}'`
          : `expected ${received.name} to have trait '${traitName}'`
    };
  },

  toContainEntity(received: IFEntity, entity: IFEntity) {
    const containsRelation = received.relationships.contains || [];
    const contains = containsRelation.includes(entity.id);
    
    return {
      pass: contains,
      message: () =>
        contains
          ? `expected ${received.name} not to contain ${entity.name}`
          : `expected ${received.name} to contain ${entity.name}`
    };
  },

  toHaveAttribute(received: IFEntity, attribute: string, value?: any) {
    const actualValue = received.attributes[attribute];
    const hasAttribute = attribute in received.attributes;
    
    if (value === undefined) {
      return {
        pass: hasAttribute,
        message: () =>
          hasAttribute
            ? `expected ${received.name} not to have attribute '${attribute}'`
            : `expected ${received.name} to have attribute '${attribute}'`
      };
    }
    
    const valueMatches = actualValue === value;
    return {
      pass: hasAttribute && valueMatches,
      message: () =>
        hasAttribute && valueMatches
          ? `expected ${received.name} not to have attribute '${attribute}' with value ${JSON.stringify(value)}`
          : `expected ${received.name} to have attribute '${attribute}' with value ${JSON.stringify(value)}, but was ${JSON.stringify(actualValue)}`
    };
  }
});

// Suppress console warnings during tests (optional)
const originalWarn = console.warn;
const originalError = console.error;

// Comment these out if you want to see warnings/errors during tests
// beforeAll(() => {
//   console.warn = jest.fn();
//   console.error = jest.fn();
// });

// afterAll(() => {
//   console.warn = originalWarn;
//   console.error = originalError;
// });

// Global test utilities
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Event capture utility (if events are implemented)
export const captureEvents = (entity: IFEntity, eventName: string) => {
  const events: any[] = [];
  // Note: IFEntity doesn't seem to have event emitter functionality in the current implementation
  // This would need to be added if event testing is required
  return events;
};

// Helper to check if an entity is in a container's contents
export function isInContents(container: IFEntity, entity: IFEntity): boolean {
  const containsRelation = container.relationships.contains || [];
  return containsRelation.includes(entity.id);
}

// Helper to get entity's container
export function getContainer(entity: IFEntity): IFEntity | undefined {
  return entity.attributes.location as IFEntity | undefined;
}
