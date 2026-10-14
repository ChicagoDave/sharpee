/**
 * ADR-372 D4–D5 compile-time gates: a readable thing may carry `define
 * topics` (plain rows only), and `costs <amount> <currency>` lowers to the
 * `costs` adjective with `price` and `currency` settings, spent from a
 * counter some playable character carries.
 */

import { describe, expect, it } from 'vitest';
import { compile } from '../src';
import type { StoryIR } from '../src/ir';

const HEADER = `story
  title: Station
  authors:
    T
  id: station
  story-version: 0.0.1
`;

const story = (body: string, courierLines = '  counter credits starts 10\n') => `${HEADER}
before the game starts
  change the player to Courier
end before

create the Directory Hall
  a room

  A hall.

create Courier
  a person
  playable
  starts in the Directory Hall
${courierLines}
  You.

create the station directory
  a thing, readable with text "KEPLER"
  in the Directory Hall

  A directory.

create the crate
  a thing
  in the Directory Hall

  A crate.

${body}
define phrase vance
  Vance.
end phrase
`;

function codes(source: string): string[] {
  const result = compile(source);
  return result.ok ? [] : result.diagnostics.map((d) => d.code);
}

function ir(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) throw new Error(result.diagnostics.map((d) => `${d.code}: ${d.message}`).join('; '));
  return result.ir;
}

describe('topics on a readable thing (ADR-372 D4)', () => {
  it('compiles a readable owner\'s table into its IR topics', () => {
    const compiled = ir(story(`define topics for the station directory
  about "vance":
    phrase vance
end topics
`));
    const directory = compiled.entities.find((e) => e.id === 'station-directory')!;
    expect(directory.topics).toHaveLength(1);
  });

  it('still refuses a table on a thing that is neither a person nor readable', () => {
    expect(codes(story(`define topics for the crate
  about "vance":
    phrase vance
end topics
`))).toContain('analysis.topics-host');
  });

  it('refuses conversation statements in a readable thing\'s rows', () => {
    expect(codes(story(`define topics for the station directory
  about "vance":
    leave
end topics
`))).toContain('analysis.topics-readable-conversation');
  });
});

describe('costs <amount> <currency> (ADR-372 D5)', () => {
  const priced = (line: string, courierLines?: string) => story(`create the map
  a thing, ${line}
  in the Directory Hall

  A map.
`, courierLines);

  it('lowers to the costs adjective with price and currency settings', () => {
    const map = ir(priced('costs 4 credits')).entities.find((e) => e.id === 'map')!;
    const costs = map.traits.find((t) => t.name === 'costs')!;
    expect(costs.config).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'price', value: '4' }),
      expect.objectContaining({ key: 'currency', value: 'credits' }),
    ]));
  });

  it('refuses a currency no playable character carries as a counter', () => {
    expect(codes(priced('costs 4 credits', ''))).toContain('analysis.costs-counter-unknown');
  });

  it('refuses a price that is not a whole number', () => {
    expect(codes(priced('costs 2.5 credits'))).toContain('analysis.costs-price');
  });

  it('refuses a malformed price', () => {
    expect(codes(priced('costs credits'))).toContain('parse.costs');
  });
});
