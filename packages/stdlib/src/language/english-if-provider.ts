// packages/stdlib/src/language/english-if-provider.ts

import { ListFormatOptions } from '../core-imports';
import { BaseIFLanguageProvider, IFLanguageConfig } from './if-language-provider';
import { registerStandardVerbs } from './action-verb-registry';
import { IFEvents } from '../constants/if-events';
import { IFActions } from '../constants/if-actions';

/**
 * English language provider for Interactive Fiction
 */
export class EnglishIFProvider extends BaseIFLanguageProvider {
  private languageCode = 'en-US';
  private languageName = 'English (US)';
  
  protected initialize(): void {
    // Register standard English verbs
    registerStandardVerbs(this.verbRegistry);
    
    // Initialize event messages
    this.initializeEventMessages();
    
    // Initialize action messages
    this.initializeActionMessages();
    
    // Initialize direction synonyms
    this.initializeDirectionSynonyms();
  }
  
  private initializeEventMessages(): void {
    // Item events
    this.eventMessages.set(IFEvents.ITEM_TAKEN, 'Taken.');
    this.eventMessages.set(IFEvents.ITEM_DROPPED, 'Dropped.');
    this.eventMessages.set(IFEvents.ITEM_EXAMINED, '{description}');
    
    // Container events
    this.eventMessages.set(IFEvents.CONTAINER_OPENED, 'You open {container}.');
    this.eventMessages.set(IFEvents.CONTAINER_CLOSED, 'You close {container}.');
    this.eventMessages.set(IFEvents.CONTAINER_LOCKED, 'You lock {container}.');
    this.eventMessages.set(IFEvents.CONTAINER_UNLOCKED, 'You unlock {container}.');
    
    // Movement events
    this.eventMessages.set(IFEvents.PLAYER_MOVED, 'You go {direction}.');
    this.eventMessages.set(IFEvents.ROOM_DESCRIBED, '{description}');
    this.eventMessages.set(IFEvents.ROOM_FIRST_ENTERED, '{description}');
    
    // Inventory
    this.eventMessages.set(IFEvents.INVENTORY_CHECKED, 'You are carrying {items}.');
    
    // Failure events
    this.eventMessages.set(IFEvents.ACTION_PREVENTED, '{message}');
    this.eventMessages.set(IFEvents.ACTION_FAILED, '{message}');
    this.eventMessages.set(IFEvents.COMMAND_AMBIGUOUS, 'Which do you mean, {choices}?');
    this.eventMessages.set(IFEvents.OBJECT_NOT_FOUND, "You can't see any such thing.");
  }
  
  private initializeActionMessages(): void {
    // Taking action messages
    this.actionMessages.set('action.taking.no_target', 'What do you want to take?');
    this.actionMessages.set('action.taking.cannot_take_self', "You can't take yourself.");
    this.actionMessages.set('action.taking.already_held', "You're already carrying {item}.");
    this.actionMessages.set('action.taking.not_takeable', "{item} is fixed in place.");
    this.actionMessages.set('action.taking.cannot_take_location', "That's hardly portable.");
    this.actionMessages.set('action.taking.not_accessible', "You can't reach {item}.");
    
    // Dropping action messages
    this.actionMessages.set('action.dropping.no_target', 'What do you want to drop?');
    this.actionMessages.set('action.dropping.not_held', "You aren't holding {item}.");
    
    // Examining action messages
    this.actionMessages.set('action.examining.no_target', 'What do you want to examine?');
    this.actionMessages.set('action.examining.nothing_special', 'You see nothing special about {item}.');
    
    // Opening action messages
    this.actionMessages.set('action.opening.no_target', 'What do you want to open?');
    this.actionMessages.set('action.opening.not_openable', "{item} isn't something you can open.");
    this.actionMessages.set('action.opening.already_open', "{item} is already open.");
    this.actionMessages.set('action.opening.locked', "{item} seems to be locked.");
    
    // Going action messages
    this.actionMessages.set('action.going.no_direction', 'You must specify a direction.');
    this.actionMessages.set('action.going.no_exit', "You can't go that way.");
    this.actionMessages.set('action.going.door_closed', 'The {door} is closed.');
    this.actionMessages.set('action.going.dark', "It's too dark to see where you're going.");
  }
  
  private initializeDirectionSynonyms(): void {
    // Standard compass directions
    this.directionSynonyms.set('n', 'north');
    this.directionSynonyms.set('s', 'south');
    this.directionSynonyms.set('e', 'east');
    this.directionSynonyms.set('w', 'west');
    this.directionSynonyms.set('ne', 'northeast');
    this.directionSynonyms.set('nw', 'northwest');
    this.directionSynonyms.set('se', 'southeast');
    this.directionSynonyms.set('sw', 'southwest');
    this.directionSynonyms.set('u', 'up');
    this.directionSynonyms.set('d', 'down');
  }
  
  // Core language provider methods
  
  formatMessage(template: string, params?: any): string {
    if (!params) return template;
    
    // Handle both array and object parameters
    if (Array.isArray(params)) {
      return template.replace(/\{(\d+)\}/g, (match, index) => {
        const idx = parseInt(index, 10);
        return params[idx] !== undefined ? String(params[idx]) : match;
      });
    } else {
      return template.replace(/\{(\w+)\}/g, (match, key) => {
        return params[key] !== undefined ? String(params[key]) : match;
      });
    }
  }
  
  formatList(items: string[], options?: ListFormatOptions): string {
    if (items.length === 0) return 'nothing';
    if (items.length === 1) return items[0];
    
    const style = options?.style || 'long';
    const type = options?.type || 'conjunction';
    
    if (style === 'narrow') {
      return items.join(', ');
    }
    
    // Oxford comma style
    const allButLast = items.slice(0, -1);
    const last = items[items.length - 1];
    
    const conjunction = type === 'disjunction' ? 'or' : 'and';
    
    if (items.length === 2) {
      return `${allButLast[0]} ${conjunction} ${last}`;
    }
    
    return `${allButLast.join(', ')}, ${conjunction} ${last}`;
  }
  
  getLanguageCode(): string {
    return this.languageCode;
  }
  
  getLanguageName(): string {
    return this.languageName;
  }
  
  getTextDirection(): 'ltr' | 'rtl' {
    return 'ltr';
  }
  
  // IF-specific formatting
  
  formatItemName(name: string, options?: {
    definite?: boolean;
    capitalize?: boolean;
    plural?: boolean;
    proper?: boolean;
  }): string {
    if (options?.proper) {
      // Proper names don't get articles
      return options.capitalize 
        ? name.charAt(0).toUpperCase() + name.slice(1)
        : name;
    }
    
    let result = name;
    
    if (options?.definite) {
      result = `the ${result}`;
    } else if (!options?.plural) {
      // Determine article based on first letter
      const firstChar = name[0].toLowerCase();
      const vowels = 'aeiou';
      const article = vowels.includes(firstChar) ? 'an' : 'a';
      result = `${article} ${result}`;
    }
    
    if (options?.capitalize) {
      result = result.charAt(0).toUpperCase() + result.slice(1);
    }
    
    return result;
  }
  
  formatDirection(direction: string): string {
    // Capitalize direction names
    return direction.charAt(0).toUpperCase() + direction.slice(1);
  }
}

/**
 * Factory for creating English IF providers
 */
export class EnglishIFProviderFactory {
  createProvider(options?: IFLanguageConfig): EnglishIFProvider {
    return new EnglishIFProvider(options);
  }
}

/**
 * Create a new English IF language provider
 */
export function createEnglishIFProvider(options?: IFLanguageConfig): EnglishIFProvider {
  return new EnglishIFProvider(options);
}
