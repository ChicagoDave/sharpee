/**
 * Command router — turns a submitted command into a `TurnPacket`.
 *
 * Public interface: {@link CommandRouter}, {@link createEchoCommandRouter}.
 * Owner: zifmia server, turns domain.
 *
 * **Phase-3 SCAFFOLDING.** This implementation echoes the command
 * text into the `main` channel and returns a deterministic
 * `TurnPacket`. It is NOT the real engine integration.
 *
 * Engine integration — `world.toJSON()` → `engine.executeTurn(text)` →
 * captured channel packets → new save blob — is Phase 5. That phase
 * replaces `createEchoCommandRouter` with `createEngineCommandRouter`
 * and adds the REAL-PATH engine test that the integration-name phase
 * rule (CLAUDE.md rule 13a) requires.
 *
 * Per the Integration Reality Statement in the Phase 3 plan: the
 * echo router IS the broadcast pipe's input; it does not
 * substitute for the engine. AC-6 (transport split) is verifiable
 * with the echo packet because the test asserts on the shape of
 * what crosses HTTP vs WS, not on what the engine produced.
 */

import { randomUUID } from 'node:crypto';
import type { TurnPacket } from '../ws/types.js';

export interface CommandSubmission {
  roomId: string;
  participantId: string;
  identityId: string;
  handle: string;
  text: string;
}

export interface CommandResult {
  turnId: string;
  packet: TurnPacket;
}

export interface CommandRouter {
  /** Execute a submitted command and produce a TurnPacket. */
  execute(input: CommandSubmission): Promise<CommandResult> | CommandResult;
}

export interface EchoCommandRouterOptions {
  idFactory?: () => string;
}

/**
 * Phase-3 scaffolding router. Returns a `TurnPacket` whose `main`
 * channel holds a single text block echoing the submitted command.
 * Tests rely on this determinism to assert on packet routing without
 * invoking the engine.
 */
export function createEchoCommandRouter(
  options: EchoCommandRouterOptions = {}
): CommandRouter {
  const idFactory = options.idFactory ?? randomUUID;
  return {
    execute(input) {
      const turnId = idFactory();
      const packet: TurnPacket = {
        turnId,
        channels: {
          main: [
            {
              kind: 'echo',
              submitter: input.handle,
              text: input.text
            }
          ]
        }
      };
      return { turnId, packet };
    }
  };
}
