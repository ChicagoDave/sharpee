/**
 * compose.test.ts — pins the card display-line composition (ADR-307: the
 * tab is the human view of the tree; there is no transcript text).
 *
 * Covers: authored claims as deletable lines with DeleteRefs, live turn
 * defaults through the real synthesis module (imported from source), the
 * opening card's defaults (prologue, title, description — open question D),
 * narrowing suppression (`noDefaults`, authored contains/channels), the
 * exact block, and the `[SKIP]` demotion rendering.
 */
import { describe, expect, it } from 'vitest';
import {
  cardAssertionLines,
  openingDefaultClaims,
  turnContainsDefaults,
  type CardLineOptions,
  type TurnSource,
} from '../src/compose';
import { TreeSessionModel } from '../src/model';

/** Boot captures as the feed's boot record carries them. */
const BOOT_CAPTURES: Record<string, unknown[]> = {
  prologue: [{ content: ['A cold night settles over the estate.'] }],
  info: [{ title: 'Mini', description: 'A test story.' }],
};

/** A booted model with one played turn, plus its compose options. */
function harness(source?: Record<number, TurnSource>): {
  model: TreeSessionModel;
  options: CardLineOptions;
} {
  const model = new TreeSessionModel('mini', 42);
  model.addTurn({ ordinal: 1, command: '', boot: true, room: 'Den' });
  model.addTurn({ ordinal: 2, command: 'north', boot: false, room: 'Garden' });
  const options: CardLineOptions = {
    model,
    policy: 'room-name-and-description',
    source: (ordinal) => source?.[ordinal],
    bootCaptures: BOOT_CAPTURES,
  };
  return { model, options };
}

/** A turn source whose room channels synthesize two contains defaults. */
const GARDEN_SOURCE: TurnSource = {
  output: 'Garden\nRoses everywhere.',
  channelValues: {
    'room-name': [{ content: ['Garden'] }],
    'room-description': [{ content: ['Roses everywhere.'] }],
  },
};

describe('authored claims render as deletable lines', () => {
  it('every family renders with its DeleteRef', () => {
    const { model, options } = harness();
    model.addContains(2, 'Roses');
    model.addNotContains(2, 'thorns');
    model.addState(2, 'lamp.location = player');
    model.addEvent(2, 'if.event.moved');
    model.addChannel(2, { id: 'room-name', contains: ['Garden'] });

    const lines = cardAssertionLines(options, 2);
    expect(lines.map(l => [l.text, l.del?.kind])).toEqual([
      ['contains "Roses"', 'contains'],
      ['not contains "thorns"', 'notContains'],
      ['state lamp.location = player', 'state'],
      ['event if.event.moved', 'event'],
      ['channel room-name contains "Garden"', 'channel'],
    ]);
  });

  it('the exact block renders whole: one deletable tag, dimmed block lines', () => {
    const { model, options } = harness();
    model.setExact(2, ['Garden', 'Roses everywhere.']);
    const lines = cardAssertionLines(options, 2);
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
    const { options } = harness();
    expect(cardAssertionLines(options, 99)).toEqual([]);
  });
});

describe('turn defaults synthesize live under the policy', () => {
  it('a bare turn shows its policy defaults, each narrowable', () => {
    const { options } = harness({ 2: GARDEN_SOURCE });
    const lines = cardAssertionLines(options, 2);
    expect(lines.map(l => l.text)).toEqual([
      'contains "Garden"',
      'contains "Roses everywhere."',
    ]);
    expect(lines[0].del).toEqual({
      kind: 'default',
      ordinal: 2,
      index: 0,
      defaults: ['Garden', 'Roses everywhere.'],
    });
  });

  it('authored contains suppress the defaults; noDefaults withholds them', () => {
    const { model, options } = harness({ 2: GARDEN_SOURCE });
    model.addContains(2, 'Roses');
    expect(cardAssertionLines(options, 2).map(l => l.text)).toEqual(['contains "Roses"']);

    model.removeContains(2, 0);   // narrows to nothing — a [SKIP] demotion
    expect(cardAssertionLines(options, 2)).toEqual([{ text: '[SKIP]', kind: 'skip' }]);
  });

  it('a turn that emitted nothing claimable shows the [SKIP] placeholder', () => {
    const { options } = harness({ 2: { output: 'Taken.', channelValues: {} } });
    expect(cardAssertionLines(options, 2)).toEqual([{ text: '[SKIP]', kind: 'skip' }]);
  });

  it('turnContainsDefaults is the defaultWhole narrowing base', () => {
    expect(turnContainsDefaults('room-name-and-description', GARDEN_SOURCE)).toEqual([
      'Garden',
      'Roses everywhere.',
    ]);
    expect(turnContainsDefaults(undefined, GARDEN_SOURCE)).toEqual([]);
  });
});

describe('the opening defaults (open question D: prologue, title, description)', () => {
  it('derive from the boot captures as channel claims', () => {
    expect(openingDefaultClaims('room-name-and-description', BOOT_CAPTURES)).toEqual([
      { id: 'prologue', contains: ['A cold night settles over the estate.'] },
      { id: 'info.title', is: 'Mini' },
      { id: 'info.description', is: 'A test story.' },
    ]);
    expect(openingDefaultClaims(undefined, BOOT_CAPTURES)).toEqual([]);
  });

  it('render on the opening card, each narrowable through openingDefault', () => {
    const { options } = harness();
    const lines = cardAssertionLines(options, 0);
    expect(lines.map(l => l.text)).toEqual([
      'channel prologue contains "A cold night settles over the estate."',
      'channel info.title is "Mini"',
      'channel info.description is "A test story."',
    ]);
    expect(lines[1].del).toEqual({
      kind: 'openingDefault',
      index: 1,
      defaults: openingDefaultClaims('room-name-and-description', BOOT_CAPTURES),
    });
  });

  it('narrowing keeps the survivors as authored channel claims and stops synthesis', () => {
    const { model, options } = harness();
    const defaults = openingDefaultClaims('room-name-and-description', BOOT_CAPTURES);
    model.removeOpeningDefault(0, defaults);   // delete the prologue claim

    const lines = cardAssertionLines(options, 0);
    expect(lines.map(l => [l.text, l.del?.kind])).toEqual([
      ['channel info.title is "Mini"', 'channel'],
      ['channel info.description is "A test story."', 'channel'],
    ]);
  });

  it('a story with no prologue and no policy claims nothing on the opening', () => {
    const { options } = harness();
    expect(
      cardAssertionLines({ ...options, policy: undefined }, 0),
    ).toEqual([]);
    expect(
      cardAssertionLines({ ...options, bootCaptures: { info: [{}] } }, 0),
    ).toEqual([]);
  });
});
