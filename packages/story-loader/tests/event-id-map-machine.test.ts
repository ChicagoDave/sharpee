/**
 * event-id-map-machine.test.ts — ADR-256 machine `when event` seam, REAL PATH.
 * The emit and channel seams' non-identity (media) translation is already
 * covered (emit-payload / channel-capability / family-channels); this pins the
 * THIRD seam, `loader.ts` `registerStateMachines()`. A compiled machine trigger
 * `when event media-sound-play` must lower to `eventId: 'media.sound.play'` (the
 * translated platform id) so the machine fires off the real dotted runtime event
 * — not off the dotless Chord id. Full path: real @sharpee/chord compile → real
 * loader → real StateMachinePlugin evaluate.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import { StateMachinePlugin } from '@sharpee/plugin-state-machine';
import { IFEntity, WorldModel } from '@sharpee/world-model';
import { ChordStory, createStory } from '../src';

const SOURCE = `story "Chime" by "Test"
  id: chime
  version: 0.0.1
  use state-machines

create the Hall
  a room

  A hall.

create the player
  starts in the Hall

  You.

define machine chime-listener
  starts waiting

  state waiting
    when event media-sound-play: heard

  state heard, terminal
end machine
`;

const MACHINE_ID = 'chord.machine.chime-listener';

function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

describe('ADR-256 machine `when event` seam translates the Chord event id (REAL-PATH)', () => {
  let story: ChordStory;
  let world: WorldModel;
  let player: IFEntity;
  let smPlugin: StateMachinePlugin;
  let turn: number;

  const fire = (eventType: string): void => {
    turn += 1;
    smPlugin.onAfterAction({
      world,
      turn,
      playerId: player.id,
      playerLocation: world.getLocation(player.id)!,
      actionEvents: [{ type: eventType, data: {} }],
    } as never);
  };

  beforeEach(() => {
    story = createStory(compileSource(SOURCE), { seed: 11 });
    world = new WorldModel();
    story.initializeWorld(world);
    player = story.createPlayer(world);
    world.setPlayer(player.id);
    const plugins: unknown[] = [];
    story.onEngineReady({ getPluginRegistry: () => ({ register: (p: unknown) => plugins.push(p) }) });
    smPlugin = plugins.find((p): p is StateMachinePlugin => p instanceof StateMachinePlugin)!;
    expect(smPlugin, 'StateMachinePlugin registered').toBeDefined();
    turn = 0;
  });

  it('transitions on the DOTTED platform event `media.sound.play` (the translated id)', () => {
    expect(smPlugin.getRegistry().getMachineState(MACHINE_ID)).toBe('waiting');
    fire('media.sound.play');
    expect(smPlugin.getRegistry().getMachineState(MACHINE_ID)).toBe('heard');
  });

  it('does NOT transition on the dotless Chord id `media-sound-play` (proves the seam translated)', () => {
    fire('media-sound-play');
    expect(smPlugin.getRegistry().getMachineState(MACHINE_ID)).toBe('waiting');
  });
});
