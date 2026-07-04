import type { Effect } from '@sharpee/event-processor';

let mediaCounter = 0;
function mediaEvent(
  type: string,
  data: Record<string, unknown>,
): ISemanticEvent {
  return {
    id: `zoo-media-${++mediaCounter}`,
    type,
    timestamp: Date.now(),
    entities: {},
    data,
  };
}
function emit(
  type: string,
  data: Record<string, unknown>,
): Effect {
  return { type: 'emit', event: mediaEvent(type, data) };
}
