// packages/stdlib/src/text/text-service.ts

import { SemanticEvent, EventSource } from '@sharpee/core';
import { IFWorld } from '../world-model/if-world';
import { LanguageInstance } from '../languages/types';

/**
 * Context provided to templates for rendering
 */
export interface TextContext {
  world: IFWorld;
  language?: LanguageInstance;
  lastEventId?: string;
}

/**
 * Output sections for organizing text
 */
export interface TextOutput {
  main: string[];
  system: string[];
  ambient: string[];
}

/**
 * A template that converts events to text
 */
export interface TextTemplate {
  id: string;
  matches: (event: SemanticEvent) => boolean;
  render: (event: SemanticEvent, context: TextContext) => string | null;
  section?: 'main' | 'system' | 'ambient';
  priority?: number;
}

/**
 * Service for converting events to text
 */
export class TextService {
  private templates: Map<string, TextTemplate> = new Map();
  private eventSource: EventSource;
  
  constructor(eventSource: EventSource) {
    this.eventSource = eventSource;
  }
  
  /**
   * Register a text template
   */
  registerTemplate(template: TextTemplate): void {
    this.templates.set(template.id, template);
  }
  
  /**
   * Register multiple templates
   */
  registerTemplates(templates: TextTemplate[]): void {
    templates.forEach(t => this.registerTemplate(t));
  }
  
  /**
   * Process events into text output
   */
  processEvents(context: TextContext): TextOutput {
    const output: TextOutput = {
      main: [],
      system: [],
      ambient: []
    };
    
    // Get unprocessed events
    const events = this.eventSource.getUnprocessedEvents();
    
    // Sort templates by priority
    const sortedTemplates = Array.from(this.templates.values())
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    // Process each event
    for (const event of events) {
      // Skip non-narrative events
      if (event.narrate === false) continue;
      
      // Try each template
      for (const template of sortedTemplates) {
        if (template.matches(event)) {
          const text = template.render(event, context);
          if (text) {
            const section = template.section || 'main';
            output[section].push(text);
            break; // Only use first matching template
          }
        }
      }
    }
    
    return output;
  }
  
  /**
   * Clear all templates
   */
  clearTemplates(): void {
    this.templates.clear();
  }
}
