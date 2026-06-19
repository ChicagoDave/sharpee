/**
 * Guard tests for the IDE introspection manifest wire types (ADR-184).
 *
 * Validates the decode-boundary predicates against the ADR's acceptance points:
 * the schemaVersion gate, the four category values, SourceRef resolution modes,
 * and the forward-compatible unknown-trait passthrough (entities are not dropped).
 */

import { describe, it, expect } from 'vitest';
import {
  isProjectManifest,
  isEntityNode,
  isEntityCategory,
  isSourceRef,
  SCHEMA_VERSION,
  type ProjectManifest,
  type EntityNode,
} from '../src/index.js';

const room: EntityNode = {
  id: 'r01',
  displayName: 'Great Room',
  category: 'room',
  traits: { identity: { description: 'This is the grand foyer…' }, room: { exits: ['south', 'east'] } },
  source: { file: 'stories/thealderman/src/rooms/index.ts', line: 54, resolution: 'exact' },
};

const nightstand: EntityNode = {
  id: 'i07',
  displayName: 'nightstand',
  category: 'object',
  traits: { identity: {}, container: { openable: true, lockable: false } },
  source: { file: 'stories/thealderman/src/objects/index.ts', line: 129, resolution: 'exact' },
};

const manifest: ProjectManifest = {
  schemaVersion: SCHEMA_VERSION,
  story: 'thealderman',
  generatedFrom: 'cli',
  entities: [room, nightstand],
};

describe('isEntityCategory', () => {
  it('accepts the four wire categories', () => {
    for (const c of ['room', 'object', 'npc', 'region']) {
      expect(isEntityCategory(c)).toBe(true);
    }
  });

  it('rejects non-categories', () => {
    expect(isEntityCategory('door')).toBe(false);
    expect(isEntityCategory('exit')).toBe(false);
    expect(isEntityCategory('')).toBe(false);
    expect(isEntityCategory(undefined)).toBe(false);
  });
});

describe('isSourceRef', () => {
  it('accepts exact and scope resolutions', () => {
    expect(isSourceRef({ file: 'a.ts', line: 1, resolution: 'exact' })).toBe(true);
    expect(isSourceRef({ file: 'a.ts', line: 9, resolution: 'scope' })).toBe(true);
  });

  it('rejects bad shapes', () => {
    expect(isSourceRef({ file: 'a.ts', line: '1', resolution: 'exact' })).toBe(false);
    expect(isSourceRef({ file: 'a.ts', line: 1, resolution: 'fuzzy' })).toBe(false);
    expect(isSourceRef({ line: 1, resolution: 'exact' })).toBe(false);
    expect(isSourceRef(null)).toBe(false);
  });
});

describe('isEntityNode', () => {
  it('accepts a well-formed node with and without source', () => {
    expect(isEntityNode(room)).toBe(true);
    const noSource: EntityNode = { id: 'x', displayName: 'X', category: 'npc', traits: {} };
    expect(isEntityNode(noSource)).toBe(true);
  });

  it('preserves an entity carrying an unknown trait (forward-compatible passthrough)', () => {
    const future: EntityNode = {
      id: 'z',
      displayName: 'Z',
      category: 'object',
      traits: { somethingNew: { foo: 1 } },
    };
    expect(isEntityNode(future)).toBe(true);
  });

  it('rejects a node with a bad category or a malformed source', () => {
    expect(isEntityNode({ id: 'x', displayName: 'X', category: 'wall', traits: {} })).toBe(false);
    expect(
      isEntityNode({ id: 'x', displayName: 'X', category: 'room', traits: {}, source: { file: 'a.ts' } })
    ).toBe(false);
    expect(isEntityNode({ id: 'x', displayName: 'X', category: 'room' })).toBe(false);
  });
});

describe('isProjectManifest', () => {
  it('accepts a current-version manifest', () => {
    expect(isProjectManifest(manifest)).toBe(true);
  });

  it('rejects a manifest with a mismatched schemaVersion (the version gate)', () => {
    expect(isProjectManifest({ ...manifest, schemaVersion: 2 })).toBe(false);
  });

  it('rejects unknown generatedFrom and non-array entities', () => {
    expect(isProjectManifest({ ...manifest, generatedFrom: 'guess' })).toBe(false);
    expect(isProjectManifest({ ...manifest, entities: {} })).toBe(false);
  });

  it('rejects when any entity is malformed', () => {
    expect(isProjectManifest({ ...manifest, entities: [room, { id: 'bad' }] })).toBe(false);
  });
});
