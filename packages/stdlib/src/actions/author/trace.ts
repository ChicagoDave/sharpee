/**
 * Trace Command
 * 
 * Enables/disables tracing of internal engine events for debugging
 * 
 * Usage:
 *   trace - Show current trace status
 *   trace on - Enable all tracing
 *   trace off - Disable all tracing
 *   trace parser on/off - Control parser event tracing
 *   trace validation on/off - Control validation event tracing
 *   trace system on/off - Control system event tracing
 *   trace all on/off - Control all tracing
 */

import { ActionContext } from '../enhanced-types';
import { MetaAction } from '../meta-action';
import { SemanticEvent } from '@sharpee/core';

export class TraceAction extends MetaAction {
  id = 'author.trace';
  verbs = ['trace'];
  
  constructor() {
    super();
    this.ensureRegistered();
  }
  
  validate(context: ActionContext): boolean {
    const { command } = context;
    const tokens = command.parsed?.tokens || [];
    
    // Must have at least "trace"
    if (tokens.length === 0) return false;
    
    // Check first token is "trace"
    const verb = tokens[0]?.normalized?.toLowerCase();
    if (verb !== 'trace') return false;
    
    // Valid patterns:
    // "trace" - length 1
    // "trace on/off" - length 2
    // "trace [target] on/off" - length 3
    
    if (tokens.length === 1) {
      return true; // Just "trace"
    }
    
    if (tokens.length === 2) {
      const second = tokens[1]?.normalized?.toLowerCase();
      return second === 'on' || second === 'off';
    }
    
    if (tokens.length === 3) {
      const target = tokens[1]?.normalized?.toLowerCase();
      const state = tokens[2]?.normalized?.toLowerCase();
      
      const validTargets = ['parser', 'validation', 'system', 'all'];
      const validStates = ['on', 'off'];
      
      return validTargets.includes(target) && validStates.includes(state);
    }
    
    return false;
  }
  
  execute(context: ActionContext): SemanticEvent[] {
    const { command, world } = context;
    const tokens = command.parsed?.tokens || [];
    const events: SemanticEvent[] = [];
    
    // Get or create debug capability data
    let debugData = world.getCapability('debug') || {
      debugParserEvents: false,
      debugValidationEvents: false,
      debugSystemEvents: false
    };
    
    if (tokens.length === 1) {
      // Just "trace" - show status
      events.push(context.event('trace.status', {
        parser: debugData.debugParserEvents || false,
        validation: debugData.debugValidationEvents || false,
        system: debugData.debugSystemEvents || false
      }));
      return events;
    }
    
    if (tokens.length === 2) {
      // "trace on/off" - affect all
      const state = tokens[1]?.normalized?.toLowerCase() === 'on';
      debugData.debugParserEvents = state;
      debugData.debugValidationEvents = state;
      debugData.debugSystemEvents = state;
      
      world.updateCapability('debug', debugData);
      
      events.push(context.event('trace.changed', {
        target: 'all',
        enabled: state
      }));
      return events;
    }
    
    if (tokens.length === 3) {
      // "trace [target] on/off"
      const target = tokens[1]?.normalized?.toLowerCase();
      const state = tokens[2]?.normalized?.toLowerCase() === 'on';
      
      switch (target) {
        case 'parser':
          debugData.debugParserEvents = state;
          break;
        case 'validation':
          debugData.debugValidationEvents = state;
          break;
        case 'system':
          debugData.debugSystemEvents = state;
          break;
        case 'all':
          debugData.debugParserEvents = state;
          debugData.debugValidationEvents = state;
          debugData.debugSystemEvents = state;
          break;
        default:
          // Shouldn't happen due to validation, but be safe
          events.push(context.event('action.error', {
            reason: `Unknown trace target: ${target}`
          }));
          return events;
      }
      
      world.updateCapability('debug', debugData);
      
      events.push(context.event('trace.changed', {
        target,
        enabled: state
      }));
    }
    
    return events;
  }
}