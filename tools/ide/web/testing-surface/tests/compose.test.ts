/**
 * compose.test.ts — pins the card display-line composition and RECORD-TIME
 * synthesis (ADR-307; David 2026-08-10: the JSON is the source of truth).
 *
 * Covers: the document's claims as deletable lines with DeleteRefs, the
 * record-time builders (`recordedTurnAssertions`, `openingDefaultClaims`)
 * through the real synthesis module (imported from source), persistence
 * through TurnDelivery, the exact block, the `[SKIP]` demotion, and the
 * bare-card `no assertions` state.
 */
import { describe, expect, it } from 'vitest';
import {
  cardAssertionLines,
  openingDefaultClaims,
  recordedTurnAssertions,
  type TurnSource,
} from '../src/compose';
import { TreeSessionModel } from '../src/model';

/** Boot captures as the feed's boot record carries them. */
const BOOT_CAPTURES: Record<string, unknown[]> = {
  prologue: [{ content: ['A cold night settles over the estate.'] }],
  info: [{ title: 'Mini', description: 'A test story.' }],
};

/** A turn source whose room channels synthesize two contains claims. */
const GARDEN_SOURCE: TurnSource = {
  output: 'Garden\nRoses everywhere.',
  channelValues: {
    'room-name': [{ content: ['Garden'] }],
    'room-description': [{ content: ['Roses everywhere.'] }],
  },
};

/** A booted model with one played turn (no recorded claims). */
function harness(): TreeSessionModel {
  const model = new TreeSessionModel('mini', 42);
  model.addTurn({ ordinal: 1, command: '', boot: true, room: 'Den' });
  model.addTurn({ ordinal: 2, command: 'north', boot: false, room: 'Garden' });
  return model;
}

describe('the document’s claims render as deletable lines', () => {
  it('every family renders with its DeleteRef', () => {
    const model = harness();
    model.addContains(2, 'Roses');
    model.addNotContains(2, 'thorns');
    model.addState(2, 'lamp.location = player');
    model.addEvent(2, 'if.event.moved');
    model.addChannel(2, { id: 'room-name', contains: ['Garden'] });

    const lines = cardAssertionLines({ model }, 2);
    expect(lines.map(l => [l.text, l.del?.kind])).toEqual([
      ['contains "Roses"', 'contains'],
      ['not contains "thorns"', 'notContains'],
      ['state lamp.location = player', 'state'],
      ['event if.event.moved', 'event'],
      ['channel room-name contains "Garden"', 'channel'],
    ]);
  });

  it('the exact block renders whole: one deletable tag, dimmed block lines', () => {
    const model = harness();
    model.setExact(2, ['Garden', 'Roses everywhere.']);
    const lines = cardAssertionLines({ model }, 2);
    expect(lines[0]).toEqual({
      text: 'exact output (2 lines)',
      kind: 'assertion',
      del: { kind: 'exact', ordinal: 2 },
    });
    expect(lines.slice(1).map(l => [l.text, l.kind])).toEqual([
      ['Garden', 'block'],
      ['Roses everywhere.', 'block'],
    ]);
  });

  it('an unbound ordinal renders nothing', () => {
    expect(cardAssertionLines({ model: harness() }, 99)).toEqual([]);
  });

  it('a bare card says `no assertions` — the state a run fails by name', () => {
    const model = harness();
    expect(cardAssertionLines({ model }, 2)).toEqual([
      { text: 'no assertions', kind: 'skip' },
    ]);
  });
});

describe('record-time synthesis (the JSON is the source of truth)', () => {
  it('recordedTurnAssertions builds the contains family from the real captures', () => {
    expect(recordedTurnAssertions('room-name-and-description', GARDEN_SOURCE)).toEqual({
      assertions: { contains: ['Garden', 'Roses everywhere.'] },
    });
  });

  it('a turn that emitted nothing claimable records an explicit skip', () => {
    expect(
      recordedTurnAssertions('room-name-and-description', { output: 'Taken.', channelValues: {} }),
    ).toEqual({ skip: true });
  });

  it('all-emitted-text records the whole output as the exact family', () => {
    expect(recordedTurnAssertions('all-emitted-text', GARDEN_SOURCE)).toEqual({
      assertions: { exact: ['Garden', 'Roses everywhere.'] },
    });
  });

  it('no policy or no source records nothing', () => {
    expect(recordedTurnAssertions(undefined, GARDEN_SOURCE)).toEqual({});
    expect(recordedTurnAssertions('room-name-and-description', undefined)).toEqual({});
  });

  it('recorded assertions persist through TurnDelivery and render as ordinary claims', () => {
    const model = new TreeSessionModel('mini', 42);
    model.addTurn({ ordinal: 1, command: '', boot: true, room: 'Den' });
    const recorded = recordedTurnAssertions('room-name-and-description', GARDEN_SOURCE);
    model.addTurn({
      ordinal: 2,
      command: 'north',
      boot: false,
      room: 'Garden',
      assertions: recorded.assertions,
    });

    const lines = cardAssertionLines({ model }, 2);
    expect(lines.map(l => [l.text, l.del?.kind])).toEqual([
      ['contains "Garden"', 'contains'],
      ['contains "Roses everywhere."', 'contains'],
    ]);
    // Deleting one is plain removal — visible in the JSON, no narrowing
    // machinery, no defaults to suppress.
    model.removeContains(2, 0);
    expect(cardAssertionLines({ model }, 2).map(l => l.text)).toEqual([
      'contains "Roses everywhere."',
    ]);
  });

  it('a recorded skip renders the [SKIP] demotion', () => {
    const model = new TreeSessionModel('mini', 42);
    model.addTurn({ ordinal: 1, command: '', boot: true });
    model.addTurn({ ordinal: 2, command: 'wait', boot: false, skip: true });
    expect(cardAssertionLines({ model }, 2)).toEqual([{ text: '[SKIP]', kind: 'skip' }]);
  });
});

describe('the opening claims (open question D: prologue, title, description)', () => {
  it('derive from the boot captures as channel claims', () => {
    expect(openingDefaultClaims('room-name-and-description', BOOT_CAPTURES)).toEqual([
      { id: 'prologue', contains: ['A cold night settles over the estate.'] },
      { id: 'info.title', is: 'Mini' },
      { id: 'info.description', is: 'A test story.' },
    ]);
    expect(openingDefaultClaims(undefined, BOOT_CAPTURES)).toEqual([]);
  });

  it('persist onto a fresh opening card and render as ordinary channel claims', () => {
    const model = new TreeSessionModel('mini', 42);
    const claims = openingDefaultClaims('room-name-and-description', BOOT_CAPTURES);
    model.addTurn({
      ordinal: 1,
      command: '',
      boot: true,
      room: 'Den',
      openingAssertions: { channels: claims },
    });

    const lines = cardAssertionLines({ model }, 0);
    expect(lines.map(l => [l.text, l.del?.kind])).toEqual([
      ['channel prologue contains "A cold night settles over the estate."', 'channel'],
      ['channel info.title is "Mini"', 'channel'],
      ['channel info.description is "A test story."', 'channel'],
    ]);
    // Deleting the prologue claim is plain channel removal on the document.
    model.removeChannel(0, 0);
    expect(cardAssertionLines({ model }, 0).map(l => l.text)).toEqual([
      'channel info.title is "Mini"',
      'channel info.description is "A test story."',
    ]);
  });

  it('a claim-less opening is honestly bare', () => {
    const model = harness();
    expect(cardAssertionLines({ model }, 0)).toEqual([
      { text: 'no assertions', kind: 'skip' },
    ]);
  });
});
