/**
 * Event processor types
 */

import { SemanticEvent } from '@sharpee/core';
import { WorldModel, EventHandler } from '@sharpee/world-model';
import { WorldChange, ProcessedEvents, ProcessorOptions } from '@sharpee/if-domain';

// Re-export domain types
export { WorldChange, ProcessedEvents, ProcessorOptions } from '@sharpee/if-domain';

// Re-export handler type from world-model
export { EventHandler } from '@sharpee/world-model';