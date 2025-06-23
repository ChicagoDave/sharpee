/**
 * Service layer exports
 * 
 * The service layer provides orchestration and complex operations
 * that coordinate multiple behaviors and entities.
 */

export { InventoryService } from './inventory-service';
export { VisibilityService } from './visibility-service';
export { MovementService } from './movement-service';
export { RoomService, type ExitInfo } from './room-service';
export { ParserService, type ParsedInput, type ParserContext, type EntityMatch } from './parser-service';
