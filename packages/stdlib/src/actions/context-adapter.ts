/**
 * Context adapter to bridge between stdlib's rich context and if-domain's contracts
 * 
 * This adapter converts between:
 * - ValidatedCommand (with parser internals) → CommandInput (simple contract)
 * - ActionContext (stdlib implementation) → IActionContext (if-domain contract)
 */

import { ISemanticEvent } from '@sharpee/core';
import { 
  CommandInput, 
  EntityReference, 
  IActionContext, 
  IAction,
  ValidationResult
} from '@sharpee/if-domain';
import { IFEntity, WorldModel } from '@sharpee/world-model';
import { ValidatedCommand } from '../validation/types';
import { ActionContext, Action } from './enhanced-types';
import { ScopeResolver } from '../scope/types';

/**
 * Convert a ValidatedCommand to the simpler CommandInput
 */
export function toCommandInput(validated: ValidatedCommand): CommandInput {
  const input: CommandInput = {
    actionId: validated.actionId,
    inputText: validated.parsed.rawInput
  };
  
  // Convert direct object if present
  if (validated.directObject) {
    input.directObject = {
      entity: validated.directObject.entity,
      matchedText: validated.directObject.parsed.text,
      referenceType: 'definite' // TODO: extract from parsed tokens
    };
  }
  
  // Convert indirect object if present
  if (validated.indirectObject) {
    input.indirectObject = {
      entity: validated.indirectObject.entity,
      matchedText: validated.indirectObject.parsed.text,
      referenceType: 'definite' // TODO: extract from parsed tokens
    };
  }
  
  // Extract preposition if present
  if (validated.parsed.structure?.preposition) {
    input.preposition = validated.parsed.structure.preposition.text;
  }
  
  return input;
}

/**
 * Adapter that makes stdlib's ActionContext implement if-domain's IActionContext
 */
export class ActionContextAdapter implements IActionContext {
  readonly command: CommandInput;
  readonly action: IAction;
  
  constructor(
    private context: ActionContext,
    action: Action
  ) {
    this.command = toCommandInput(context.command);
    this.action = new ActionAdapter(action);
  }
  
  get player(): IFEntity {
    return this.context.player;
  }
  
  get currentLocation(): IFEntity {
    return this.context.currentLocation;
  }
  
  canSee(entity: IFEntity): boolean {
    return this.context.canSee(entity);
  }
  
  canReach(entity: IFEntity): boolean {
    return this.context.canReach(entity);
  }
  
  canTake(entity: IFEntity): boolean {
    return this.context.canTake(entity);
  }
  
  isInScope(entity: IFEntity): boolean {
    return this.context.isInScope(entity);
  }
  
  getVisible(): IFEntity[] {
    return this.context.getVisible();
  }
  
  getInScope(): IFEntity[] {
    return this.context.getInScope();
  }
  
  getEntity(entityId: string): IFEntity | undefined {
    return this.context.world.getEntity(entityId);
  }
  
  getEntityLocation(entityId: string): string | undefined {
    return this.context.world.getLocation(entityId);
  }
  
  getEntityContents(entityId: string): IFEntity[] {
    return this.context.world.getContents(entityId);
  }
  
  getContainingRoom(entityId: string): IFEntity | undefined {
    return this.context.world.getContainingRoom(entityId);
  }
  
  getWorldCapability(name: string): any {
    return this.context.world.getCapability(name);
  }
  
  moveEntity(entityId: string, newLocationId: string): boolean {
    // This would need to emit an event, but for now return false
    // as actions shouldn't directly mutate state
    return false;
  }
  
  event(type: string, data: any): ISemanticEvent {
    return this.context.event(type, data);
  }
}

/**
 * Adapter that makes stdlib's Action implement if-domain's IAction
 */
class ActionAdapter implements IAction {
  constructor(private action: Action) {}
  
  get id(): string {
    return this.action.id;
  }
  
  validate(context: IActionContext): ValidationResult {
    // Convert IActionContext back to ActionContext for the stdlib action
    // This is a bit circular but necessary for the adapter pattern
    // In practice, we'd pass through the original context
    return this.action.validate(context as any);
  }
  
  execute(context: IActionContext): ISemanticEvent[] {
    // Similar conversion for execute
    const result = this.action.execute(context as any);
    // Handle both old pattern (returns events) and new pattern (returns void)
    if (result === undefined || result === null) {
      // New pattern: execute returned void, call report if available
      if ('report' in this.action && typeof this.action.report === 'function') {
        return this.action.report(context as any);
      }
      // If no report method, return empty array
      return [];
    }
    // Old pattern: execute returned events
    return result;
  }
  
  get requiredMessages(): string[] | undefined {
    return this.action.requiredMessages;
  }
  
  get descriptionMessageId(): string | undefined {
    return this.action.descriptionMessageId;
  }
  
  get examplesMessageId(): string | undefined {
    return this.action.examplesMessageId;
  }
}

/**
 * Create an if-domain compliant context from stdlib context
 */
export function createDomainContext(
  context: ActionContext, 
  action: Action
): IActionContext {
  return new ActionContextAdapter(context, action);
}