/**
 * event-id-map.test.ts — conformance guard for the ADR-256 Chord↔platform
 * event-id map. Pins `CHORD_TO_PLATFORM_EVENT_ID` against the LIVE stdlib
 * `MEDIA_EVENT_TYPES` registry (a real import of the shipped constant, not a
 * copy): if a platform `media.*` id is renamed, added, or dropped, this test
 * fails the build — the drift guard ADR-256 requires. Also asserts the forward
 * translation contract (mapped → dotted, author event → pass-through).
 */
import { describe, expect, it } from 'vitest';
import { MEDIA_EVENT_TYPES } from '@sharpee/stdlib';
import { CHORD_TO_PLATFORM_EVENT_ID, translateEventId } from '../src/event-id-map';

describe('ADR-256 event-id map — conformance against live stdlib media registry', () => {
  const platformIds = Object.values(MEDIA_EVENT_TYPES);
  const mappedPlatformIds = Object.values(CHORD_TO_PLATFORM_EVENT_ID);

  it('every live media.* platform id has exactly one map entry', () => {
    for (const platformId of platformIds) {
      const entries = mappedPlatformIds.filter((v) => v === platformId);
      expect(entries, `platform id ${platformId} must be a map target exactly once`).toHaveLength(1);
    }
  });

  it('the map targets exactly the live media.* set — no stale or extra entries', () => {
    expect(new Set(mappedPlatformIds)).toEqual(new Set(platformIds));
  });

  it('each Chord key is its platform id with `.` → `-` (dotless, ADR-254)', () => {
    for (const [chordId, platformId] of Object.entries(CHORD_TO_PLATFORM_EVENT_ID)) {
      expect(chordId).toBe(platformId.replace(/\./g, '-'));
      expect(chordId).not.toContain('.');
    }
  });
});

describe('ADR-256 translateEventId — forward translation contract', () => {
  it('a mapped Chord id resolves to its dotted platform id', () => {
    expect(translateEventId('media-sound-play')).toBe('media.sound.play');
    expect(translateEventId('media-image-show')).toBe('media.image.show');
  });

  it('an author event with no map entry passes through verbatim (D3)', () => {
    expect(translateEventId('chord-compass-updated')).toBe('chord-compass-updated');
    expect(translateEventId('gatehouse-watch-report')).toBe('gatehouse-watch-report');
  });
});
