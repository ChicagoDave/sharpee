// packages/lang-en-us/src/examples/author-customization.ts

import { VerbCategory, StandardTemplateKey, getLanguageRegistry } from '@sharpee/core';
import { createCustomizableEnglishProvider } from '../index';

/**
 * Example of how an author might customize the language for a specific story
 */
function createSpaceAdventureLanguage() {
  // Create a customizable provider
  const provider = createCustomizableEnglishProvider();
  
  // Override standard templates with space-themed language
  provider.setTemplate(StandardTemplateKey.LOOK_AROUND, "You gaze around the {0}.");
  provider.setTemplate(StandardTemplateKey.TAKE_SUCCESS, "You collect {0} and store it in your spacesuit.");
  provider.setTemplate(StandardTemplateKey.DROP_SUCCESS, "You release {0} into the zero-gravity environment.");
  provider.setTemplate(StandardTemplateKey.INVENTORY_HEADER, "Your spacesuit contains:");
  provider.setTemplate(StandardTemplateKey.WAIT_SUCCESS, "You float silently for a moment as time passes.");
  
  // Add custom templates for space-specific actions
  provider.setTemplate("OXYGEN_LOW", "Warning: Oxygen levels at {0}%. Find a refill station soon.");
  provider.setTemplate("RADIATION_ALERT", "Your radiation detector beeps urgently. This area is dangerous without proper shielding.");
  provider.setTemplate("ZERO_G_MOVEMENT", "You push off and drift gracefully toward {0}.");
  
  // Add space-themed verbs
  provider.addVerbs({
    'pilot': {
      canonical: 'pilot',
      synonyms: ['fly', 'steer', 'navigate'],
      description: 'Pilot a spacecraft',
      category: VerbCategory.MOVEMENT,
      requiresDirectObject: true
    },
    'dock': {
      canonical: 'dock',
      synonyms: ['connect', 'link', 'attach'],
      description: 'Dock with another spacecraft or station',
      category: VerbCategory.MOVEMENT,
      requiresDirectObject: true
    },
    'scan': {
      canonical: 'scan',
      synonyms: ['analyze', 'examine', 'probe'],
      description: 'Scan an object with your equipment',
      category: VerbCategory.OBSERVATION,
      requiresDirectObject: true
    },
    'pressurize': {
      canonical: 'pressurize',
      synonyms: ['seal', 'oxygenate'],
      description: 'Pressurize an airlock or compartment',
      category: VerbCategory.MANIPULATION,
      requiresDirectObject: true
    },
    'refill': {
      canonical: 'refill',
      synonyms: ['recharge', 'replenish'],
      description: 'Refill oxygen, fuel, or other supplies',
      category: VerbCategory.MANIPULATION,
      requiresDirectObject: true
    }
  });
  
  return provider;
}

/**
 * Example of how to use a customized language provider in a game
 */
function setupSpaceAdventureGame() {
  // Create the customized language
  const spaceLanguage = createSpaceAdventureLanguage();
  
  // Register with the language registry
  getLanguageRegistry().registerLanguage('space-adventure', {
    createProvider: () => spaceLanguage
  });
  
  // Set as the active language
  getLanguageRegistry().setLanguage('space-adventure');
  
  console.log("Space Adventure language activated!");
  
  // Examples of using the customized language
  console.log(spaceLanguage.formatMessage(StandardTemplateKey.LOOK_AROUND, "cramped shuttle"));
  console.log(spaceLanguage.formatMessage(StandardTemplateKey.TAKE_SUCCESS, "the oxygen canister"));
  console.log(spaceLanguage.formatMessage("OXYGEN_LOW", "15"));
  
  // Check if a space-specific verb is recognized
  console.log("Is 'scan' a verb?", spaceLanguage.isVerb('scan')); // true
  console.log("Is 'analyze' a synonym of 'scan'?", 
    spaceLanguage.getCanonicalVerb('analyze') === 'scan'); // true
}

// This would be called from the game initialization code
// setupSpaceAdventureGame();

// Export for use in examples
export {
  createSpaceAdventureLanguage,
  setupSpaceAdventureGame
};
