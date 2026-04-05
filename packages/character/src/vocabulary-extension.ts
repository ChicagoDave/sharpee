/**
 * Story-specific vocabulary extension (ADR-141)
 *
 * Allows stories to add custom mood words and personality traits
 * beyond the platform defaults. Extended vocabulary is validated
 * by the builder and compiled into trait data.
 *
 * Public interface: VocabularyExtension, defineCustomMood, defineCustomPersonality.
 * Owner context: @sharpee/character
 */

/** A custom mood definition with valence-arousal coordinates. */
export interface CustomMoodDef {
  name: string;
  valence: number;
  arousal: number;
}

/** A custom personality trait definition. */
export interface CustomPersonalityDef {
  name: string;
}

/**
 * Registry of story-specific vocabulary extensions.
 *
 * Stories call defineCustomMood() and defineCustomPersonality()
 * during initialization. The builder validates against both
 * platform vocabulary and these extensions.
 */
export class VocabularyExtension {
  private customMoods: Map<string, CustomMoodDef> = new Map();
  private customPersonalities: Set<string> = new Set();

  /**
   * Define a custom mood word with valence-arousal coordinates.
   *
   * @param name - The mood word (e.g., 'lovesick')
   * @param valence - Valence value (-1 to 1)
   * @param arousal - Arousal value (0 to 1)
   */
  defineMood(name: string, valence: number, arousal: number): void {
    this.customMoods.set(name, { name, valence, arousal });
  }

  /**
   * Define a custom personality trait name.
   *
   * @param name - The personality trait (e.g., 'righteous')
   */
  definePersonality(name: string): void {
    this.customPersonalities.add(name);
  }

  /**
   * Check if a mood word is a recognized custom mood.
   *
   * @param name - Mood word to check
   * @returns True if it was registered via defineMood()
   */
  hasCustomMood(name: string): boolean {
    return this.customMoods.has(name);
  }

  /**
   * Get a custom mood definition.
   *
   * @param name - Mood word to look up
   * @returns The mood definition, or undefined
   */
  getCustomMood(name: string): CustomMoodDef | undefined {
    return this.customMoods.get(name);
  }

  /**
   * Check if a personality trait is a recognized custom trait.
   *
   * @param name - Personality trait to check
   * @returns True if it was registered via definePersonality()
   */
  hasCustomPersonality(name: string): boolean {
    return this.customPersonalities.has(name);
  }

  /**
   * Get all registered custom mood names.
   *
   * @returns Array of custom mood names
   */
  getCustomMoodNames(): string[] {
    return Array.from(this.customMoods.keys());
  }

  /**
   * Get all registered custom personality names.
   *
   * @returns Array of custom personality trait names
   */
  getCustomPersonalityNames(): string[] {
    return Array.from(this.customPersonalities);
  }
}
