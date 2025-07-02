import { SemanticEvent } from './types';
import { EntityId } from '../types/entity';
import { SemanticEventSource } from './semantic-event-source';
/**
 * Create a new semantic event
 */
export declare function createEvent(type: string, payload?: Record<string, unknown>, options?: {
    actor?: EntityId;
    target?: EntityId;
    instrument?: EntityId;
    location?: EntityId;
    others?: EntityId[];
    tags?: string[];
    priority?: number;
    narrate?: boolean;
}): SemanticEvent;
export { SemanticEventSourceImpl as EventSourceImpl } from './semantic-event-source';
/**
 * Create a new event source
 * @deprecated Use createSemanticEventSource from './semantic-event-source'
 */
export declare function createEventSource(): SemanticEventSource;
//# sourceMappingURL=event-system.d.ts.map