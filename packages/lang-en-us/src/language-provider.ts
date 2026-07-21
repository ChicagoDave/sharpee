/**
 * English Language Provider
 * 
 * Self-contained language implementation with no external dependencies
 * Enhanced to support getMessage interface for text service
 */

import { LanguageProvider, ParserLanguageProvider, ActionHelp, VerbVocabulary, DirectionVocabulary, SpecialVocabulary, LanguageGrammarPattern, LocaleSettings, RenderContext } from '@sharpee/if-domain';
import type { ITextBlock } from '@sharpee/text-blocks';
import { EnglishAssembler, registerPronounSet as registerAssemblerPronounSet } from './assembler/index.js';
import type { PronounSetForms } from './assembler/index.js';
import { parsePhraseTemplate } from './parser/index.js';
import { englishVerbs } from './data/verbs.js';
import { englishWords, irregularPlurals, abbreviations } from './data/words.js';
import { pluralize as pluralizeNoun } from './pluralize.js';
import { standardActionLanguage } from './actions/index.js';
import { npcLanguage, conversationLanguage, propagationLanguage, influenceLanguage } from './npc/index.js';
import { platformLanguage } from './platform-messages.js';
import { soundMessages } from './sound-messages.js';
import {
  NarrativeContext,
  DEFAULT_NARRATIVE_CONTEXT,
  resolvePerspectivePlaceholders,
} from './perspective/index.js';
// Types are now imported from @sharpee/if-domain

/**
 * English language data and rules
 */
export class EnglishLanguageProvider implements ParserLanguageProvider {
  readonly languageCode = 'en-US';
  readonly languageName = 'English (US)';
  readonly textDirection = 'ltr' as const;

  // Message storage
  private messages = new Map<string, string>();
  private customActionPatterns = new Map<string, string[]>();

  // Narrative context for perspective-aware message resolution (ADR-089)
  private narrativeContext: NarrativeContext = DEFAULT_NARRATIVE_CONTEXT;

  // Serial (Oxford) comma in lists (ADR-190); story-configurable, default on.
  private serialComma = true;

  // Phrase-path Assembler (ADR-192). Realizes a parsed phrase tree to blocks;
  // stateless and pure, so a single shared instance is reused across turns.
  private readonly assembler = new EnglishAssembler();

  constructor() {
    // Load core system messages
    this.loadCoreMessages();
    // Load all action messages
    this.loadActionMessages();
    // Load NPC messages (ADR-070)
    this.loadNpcMessages();
    // Load character system messages (ADR-142, 144, 146)
    this.loadCharacterMessages();
    // Load spatial sound prose defaults (ADR-172 Phase 5)
    this.loadSoundMessages();
    // Load platform-event prose defaults (save/restore/undo outcomes)
    this.loadPlatformMessages();
  }

  /**
   * Load core system messages (command failures, etc.)
   * These are used by text-service for command.failed events
   */
  private loadCoreMessages(): void {
    const coreMessages: Record<string, string> = {
      'core.entity_not_found': "You can't see any such thing.",
      'core.ambiguous_reference': "Which do you mean?",
      'core.disambiguation_prompt': "Which do you mean: {options}?",
      'core.command_not_understood': "I don't understand that command.",
      'core.command_failed': "I don't understand that.",
      // Shared scope-refusal messages (ADR-231 D1): produced by stdlib's
      // requireScope/requireSlotScope as fully-qualified ids — every action
      // shares these; an action wanting different wording returns its own
      // action-local key instead of calling requireScope.
      'scope.not_known': "You can't see any such thing.",
      'scope.not_visible': "{You} {can't} see {the item}.",
      'scope.not_reachable': "{You} {can't} reach {the item}.",
      'scope.not_carried': "{You} aren't holding {the item}.",
      'scope.out_of_scope': "{You} {can't} do that.",
      // Room description body (ADR-192/195): the room's prose realized through the
      // phrase pipeline, carrying the `{slot:here}` room-occupant channel so present
      // occupants append a presence clause at realize time (the room name is a
      // separate structural block emitted by the room handler).
      'if.room.description_body': '{verbatim:description}{slot:here}',
      // Game lifecycle messages
      'game.started.banner': "{title}\nBy {author}\n\nType HELP for instructions.",
      // Platform prompt (ADR-137)
      'if.platform.prompt': '> ',
    };

    for (const [key, value] of Object.entries(coreMessages)) {
      this.messages.set(key, value);
    }
  }

  /**
   * Set narrative settings for perspective-aware message resolution (ADR-089)
   *
   * This should be called by the engine after loading a story to configure
   * how {You}, {your}, {take} placeholders are resolved.
   *
   * @param settings Narrative settings from story config
   */
  setNarrativeSettings(settings: NarrativeContext): void {
    this.narrativeContext = settings;
  }

  /**
   * Get current narrative context
   */
  getNarrativeContext(): NarrativeContext {
    return this.narrativeContext;
  }
  
  /**
   * Load messages from all action language definitions
   */
  private loadActionMessages(): void {
    for (const actionLang of standardActionLanguage) {
      if (actionLang.messages) {
        Object.entries(actionLang.messages).forEach(([key, value]) => {
          // Store with full action ID prefix
          const fullKey = `${actionLang.actionId}.${key}`;
          this.messages.set(fullKey, value);
        });
      }
    }
  }

  /**
   * Load NPC messages (ADR-070)
   */
  private loadNpcMessages(): void {
    if (npcLanguage.messages) {
      for (const [key, value] of Object.entries(npcLanguage.messages)) {
        this.messages.set(key, value);
      }
    }
  }

  /**
   * Load character system messages (ADR-142 conversation, ADR-144 propagation, ADR-146 influence)
   */
  private loadCharacterMessages(): void {
    for (const lang of [conversationLanguage, propagationLanguage, influenceLanguage]) {
      if (lang.messages) {
        for (const [key, value] of Object.entries(lang.messages)) {
          this.messages.set(key, value);
        }
      }
    }
  }

  /**
   * Load spatial-sound prose defaults (ADR-172 Phase 5).
   *
   * Per-`(kind, audibility_tier)` defaults the sound dispatcher (Phase
   * 6) resolves when rendering an `AudibilityEvent` for a listener.
   * Story authors override per kind via the standard message-override
   * mechanism.
   */
  private loadSoundMessages(): void {
    for (const [key, value] of Object.entries(soundMessages)) {
      this.messages.set(key, value);
    }
  }

  /**
   * Load platform-event prose defaults (save/restore/undo outcomes).
   * The prose pipeline renders a `platform.*` event via the message
   * registered under the event type; stories override the same ids.
   */
  private loadPlatformMessages(): void {
    for (const [key, value] of Object.entries(platformLanguage.messages)) {
      this.messages.set(key, value);
    }
  }

  /**
   * Get a message by its ID with optional parameter substitution
   *
   * Supports three types of placeholders:
   * 1. Perspective placeholders (ADR-089): {You}, {your}, {take}, etc.
   *    - Resolved based on narrative context (1st/2nd/3rd person)
   * 2. Simple `{key}` placeholders → `String(params[key])`.
   *
   * The ADR-095 formatter chain is gone (ADR-192): entity-aware article / list /
   * verb realization lives in the phrase pipeline ({@link renderMessage}). This
   * string path remains for non-phrase callers (e.g. core prompts) and does plain
   * substitution only — no articles, lists, or `:`-chains.
   *
   * @param messageId Full message ID (e.g., 'if.action.taking.taken')
   * @param params Parameters to substitute in the message
   * @returns The resolved message text, or the ID when not registered
   */
  getMessage(messageId: string, params?: Record<string, any>): string {
    let message = this.messages.get(messageId);

    if (!message) {
      return messageId; // Return the ID as fallback
    }

    // Step 1: Resolve perspective placeholders (ADR-089) — {You}, {your}, {take}.
    message = resolvePerspectivePlaceholders(message, this.narrativeContext, params);

    // Step 2: Plain `{key}` substitution for any bound params.
    if (params) {
      message = message.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (match, key) =>
        key in params ? String(params[key]) : match,
      );
    }

    return message;
  }

  /**
   * Get the raw, unresolved template for a message ID (ADR-192 phrase path).
   *
   * Returns the author template verbatim — no perspective resolution, no
   * parameter substitution. The phrase pipeline resolves perspective and parses
   * the result; see {@link renderMessage}.
   *
   * @param messageId Full message ID (e.g. 'if.action.taking.taken')
   * @returns The raw template, or undefined when the ID is not registered
   */
  getTemplate(messageId: string): string | undefined {
    return this.messages.get(messageId);
  }

  /**
   * Locale realization settings (ADR-192). The engine reads these when building
   * the per-turn render context so the Assembler agrees over the story's
   * configured knobs.
   *
   * @returns The current locale settings (serial comma, …)
   */
  getLocaleSettings(): LocaleSettings {
    return { serialComma: this.serialComma };
  }

  /**
   * The narrative grammatical person of the player subject (ADR-199 §4 B),
   * mapped from the ADR-089 perspective ('1st'/'2nd'/'3rd' → first/second/third).
   *
   * @returns the player subject's grammatical person under the current narration
   */
  getNarrativePerson(): 'first' | 'second' | 'third' {
    switch (this.narrativeContext.perspective) {
      case '1st':
        return 'first';
      case '2nd':
        return 'second';
      default:
        return 'third';
    }
  }

  /**
   * Render a message to text blocks through the phrase pipeline (ADR-192 §6).
   *
   * Phrase-path replacement for {@link getMessage}: resolve perspective
   * placeholders (kept as a string pre-pass, ADR-089), parse the template into a
   * `Phrase` tree, then realize it with the Assembler against `ctx`. A missing
   * template realizes to a literal of the ID, mirroring `getMessage`'s
   * echo-the-ID fallback.
   *
   * @param messageId Full message ID
   * @param params Parameter/producer bindings keyed by placeholder name
   * @param ctx The per-message render context (world, settings, seams)
   * @returns The realized text blocks
   */
  renderMessage(
    messageId: string,
    params: Record<string, unknown>,
    ctx: RenderContext,
  ): ITextBlock[] {
    const template = this.messages.get(messageId);
    if (template === undefined) {
      // Unregistered ID echoes as a literal, matching getMessage's fallback.
      return this.assembler.realize({ kind: 'literal', text: messageId }, ctx);
    }
    return this.renderTemplate(template, params, ctx);
  }

  /**
   * Realize a template string directly — {@link renderMessage} minus the
   * registry lookup (ADR-250 D4). The engine's phrasebook read point calls
   * this with a book-resolved template; the `messages` map is not consulted.
   *
   * @param template The template text
   * @param params Parameter/producer bindings keyed by placeholder name
   * @param ctx The per-message render context (world, settings, seams)
   * @returns The realized text blocks
   */
  renderTemplate(template: string, params: Record<string, unknown>, ctx: RenderContext): ITextBlock[] {
    // Step 1: Resolve perspective placeholders (ADR-089) — a string pre-pass
    // that runs BEFORE parsing. Passing params lets the resolver leave bound
    // params for the phrase parser and conjugate every other bare {word} as a
    // perspective verb (no central verb allowlist needed).
    const resolved = resolvePerspectivePlaceholders(template, this.narrativeContext, params);

    // Step 2: Parse to a phrase tree (binds params; throws PhraseParseError at
    // parse time on legacy ':' chains, unknown kinds, or unbound params).
    const tree = parsePhraseTemplate(resolved, params);

    // Step 3: Realize with the Assembler — the sole authority for article,
    // agreement, punctuation, whitespace, reference, and case.
    return this.assembler.realize(tree, ctx);
  }

  /**
   * Set whether lists use the serial (Oxford) comma (ADR-190). Default true.
   * @param on true → "a, b, and c"; false → "a, b and c"
   */
  setSerialComma(on: boolean): void {
    this.serialComma = on;
  }

  /**
   * Check if a message exists
   * @param messageId The message identifier
   * @returns True if the message exists
   */
  hasMessage(messageId: string): boolean {
    return this.messages.has(messageId);
  }
  
  /**
   * Get patterns/aliases for an action
   * @param actionId The action identifier (e.g., 'if.action.taking')
   * @returns Array of patterns or undefined if action not found
   */
  getActionPatterns(actionId: string): string[] | undefined {
    // First check custom patterns
    const customPatterns = this.customActionPatterns.get(actionId);
    
    // Then check standard action language
    const actionLang = standardActionLanguage.find(lang => lang.actionId === actionId);
    const standardPatterns = actionLang?.patterns;
    
    // Merge both sources if they exist
    if (customPatterns && standardPatterns) {
      return [...standardPatterns, ...customPatterns];
    }
    
    return customPatterns || standardPatterns;
  }
  
  /**
   * Get structured help information for an action
   * @param actionId The action identifier (e.g., 'if.action.taking')
   * @returns Structured help information or undefined if not found
   */
  getActionHelp(actionId: string): ActionHelp | undefined {
    const actionLang = standardActionLanguage.find(lang => lang.actionId === actionId);
    if (!actionLang) {
      return undefined;
    }
    
    // Extract verbs from patterns
    const verbs: string[] = [];
    if (actionLang.patterns) {
      actionLang.patterns.forEach(pattern => {
        // Extract the verb from patterns like "take [something]"
        const match = pattern.match(/^(\w+)/);
        if (match) {
          const verb = match[1].toUpperCase();
          if (!verbs.includes(verb)) {
            verbs.push(verb);
          }
        }
      });
    }
    
    
    // Parse examples from help object
    let examples: string[] = [];
    if (actionLang.help?.examples) {
      // Split by comma and trim
      examples = actionLang.help.examples.split(',').map(ex => ex.trim());
    }
    
    return {
      description: actionLang.help?.description || 'No description available.',
      verbs,
      examples,
      summary: actionLang.help?.summary
    };
  }
  
  /**
   * Get all supported actions
   * @returns Array of action IDs
   */
  getSupportedActions(): string[] {
    return standardActionLanguage.map(lang => lang.actionId);
  }

  /**
   * Returns all registered message IDs and their text.
   * Used by tooling for language introspection.
   *
   * @returns Copy of the internal message map
   */
  getAllMessages(): Map<string, string> {
    return new Map(this.messages);
  }

  /**
   * Get entity name/description
   * @param entity Entity object or ID
   * @returns Entity name or fallback
   */
  getEntityName(entity: any): string {
    if (!entity) return 'something';
    
    // If it's a string, return it
    if (typeof entity === 'string') {
      return entity;
    }
    
    // Try various properties
    if (entity.name) {
      return entity.name;
    }
    
    // Try identity trait
    if (entity.traits && entity.traits.get) {
      const identity = entity.traits.get('IDENTITY');
      if (identity && identity.name) {
        return identity.name;
      }
    }
    
    // Try direct trait access
    if (entity.get && typeof entity.get === 'function') {
      const identity = entity.get('IDENTITY');
      if (identity && identity.name) {
        return identity.name;
      }
    }
    
    // Fall back to ID
    if (entity.id) {
      return entity.id;
    }
    
    return 'something';
  }
  
  /**
   * Get all messages for a given action
   * @param actionId Action identifier
   * @returns Map of message keys to messages
   */
  getActionMessages(actionId: string): Map<string, string> | null {
    const actionMessages = new Map<string, string>();
    const prefix = `${actionId}.`;
    
    // Find all messages for this action
    for (const [key, value] of this.messages) {
      if (key.startsWith(prefix)) {
        const messageKey = key.substring(prefix.length);
        actionMessages.set(messageKey, value);
      }
    }
    
    return actionMessages.size > 0 ? actionMessages : null;
  }

  getVerbs(): VerbVocabulary[] {
    return englishVerbs.map(verb => ({
      actionId: verb.action,
      verbs: verb.verbs,
      pattern: verb.requiresObject ? 
        (verb.allowsIndirectObject ? 'VERB_OBJ_PREP_OBJ' : 'VERB_OBJ') : 
        'VERB_ONLY',
      prepositions: verb.allowsIndirectObject ? ['in', 'on', 'to', 'with'] : undefined
    }));
  }

  getDirections(): DirectionVocabulary[] {
    return [
      { direction: 'north', words: ['north'], abbreviations: ['n'] },
      { direction: 'south', words: ['south'], abbreviations: ['s'] },
      { direction: 'east', words: ['east'], abbreviations: ['e'] },
      { direction: 'west', words: ['west'], abbreviations: ['w'] },
      { direction: 'northeast', words: ['northeast'], abbreviations: ['ne'] },
      { direction: 'northwest', words: ['northwest'], abbreviations: ['nw'] },
      { direction: 'southeast', words: ['southeast'], abbreviations: ['se'] },
      { direction: 'southwest', words: ['southwest'], abbreviations: ['sw'] },
      { direction: 'up', words: ['up', 'upward', 'upwards'], abbreviations: ['u'] },
      { direction: 'down', words: ['down', 'downward', 'downwards'], abbreviations: ['d'] },
      { direction: 'in', words: ['in', 'inside'] },
      { direction: 'out', words: ['out', 'outside'] }
    ];
  }

  getSpecialVocabulary(): SpecialVocabulary {
    return {
      articles: englishWords.articles,
      pronouns: englishWords.pronouns,
      allWords: ['all', 'everything', 'every'],
      exceptWords: ['except', 'but']
    };
  }

  getCommonAdjectives(): string[] {
    return englishWords.commonAdjectives;
  }

  getCommonNouns(): string[] {
    return englishWords.commonNouns || [];
  }

  getPrepositions(): string[] {
    return englishWords.prepositions;
  }

  getDeterminers(): string[] {
    return englishWords.determiners || [];
  }

  getConjunctions(): string[] {
    return englishWords.conjunctions || [];
  }

  getNumbers(): string[] {
    return englishWords.numberWords || [];
  }

  getGrammarPatterns(): LanguageGrammarPattern[] {
    return [
      {
        name: 'verb_noun_prep_noun',
        pattern: 'VERB NOUN+ PREP NOUN+',
        example: 'put ball in box',
        priority: 100
      },
      {
        name: 'verb_prep_noun',
        pattern: 'VERB PREP NOUN+',
        example: 'look at painting',
        priority: 90
      },
      {
        name: 'verb_noun',
        pattern: 'VERB NOUN+',
        example: 'take ball',
        priority: 80
      },
      {
        name: 'verb_only',
        pattern: 'VERB',
        example: 'look',
        priority: 70
      },
      {
        name: 'direction_only',
        pattern: 'DIRECTION',
        example: 'north',
        priority: 60
      }
    ];
  }

  lemmatize(word: string): string {
    if (!word) return '';
    
    const lower = word.toLowerCase();
    
    // Check irregular plurals
    const singular = irregularPlurals.get(lower);
    if (singular) return singular;
    
    // Handle special cases first
    if (lower === 'yes' || lower === 'ties') return lower;
    
    // Simple rules for common endings
    if (lower.endsWith('ies') && lower.length > 4) {
      return lower.slice(0, -3) + 'y';
    }
    if (lower.endsWith('es') && lower.length > 3) {
      // Don't lemmatize words like 'yes'
      if (lower === 'yes') return lower;
      return lower.slice(0, -2);
    }
    if (lower.endsWith('s') && !lower.endsWith('ss') && lower.length > 2) {
      return lower.slice(0, -1);
    }
    if (lower.endsWith('ed') && lower.length > 3) {
      // Handle double consonants (dropped -> drop)
      if (lower.length > 4 && lower[lower.length - 3] === lower[lower.length - 4]) {
        return lower.slice(0, -3);
      }
      return lower.slice(0, -2);
    }
    if (lower.endsWith('ing') && lower.length > 4 && !lower.includes('-')) {
      return lower.slice(0, -3);
    }
    
    return lower;
  }

  expandAbbreviation(abbreviation: string): string | null {
    return abbreviations.get(abbreviation.toLowerCase()) || null;
  }

  formatList(items: string[], conjunction: 'and' | 'or' = 'and'): string {
    if (items.length === 0) return '';
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;
    
    const allButLast = items.slice(0, -1);
    const last = items[items.length - 1];
    return `${allButLast.join(', ')}, ${conjunction} ${last}`;
  }

  getIndefiniteArticle(noun: string): string {
    if (!noun || noun.length === 0) return 'a';
    
    const firstChar = noun[0].toLowerCase();
    const vowels = ['a', 'e', 'i', 'o', 'u'];
    
    // Special cases
    if (noun.toLowerCase().startsWith('hour')) return 'an';
    if (noun.toLowerCase().startsWith('honest')) return 'an';
    if (noun.toLowerCase().startsWith('uni')) return 'a';
    if (noun.toLowerCase().startsWith('one')) return 'a';
    
    return vowels.includes(firstChar) ? 'an' : 'a';
  }

  pluralize(noun: string): string {
    // Delegates to the free `pluralize` (src/pluralize.ts), the single source of
    // truth shared with the list/count formatters.
    return pluralizeNoun(noun);
  }

  isIgnoreWord(word: string): boolean {
    return englishWords.ignoreWords.includes(word.toLowerCase());
  }

  /**
   * Add a custom message to the language provider
   * @param messageId The message identifier (e.g., 'custom.action.message')
   * @param template The message template with optional {param} placeholders
   */
  addMessage(messageId: string, template: string): void {
    this.messages.set(messageId, template);
  }

  /**
   * Register a named pronoun set (ADR-242 D7) — the loader's
   * `extendLanguage` registration surface beside `addMessage` (probed
   * structurally; the loader stays locale-neutral). Forms flow to the
   * Assembler's pronoun authority, consulted before the standard rows.
   * @param name The set name as declared (`define pronouns ze`)
   * @param forms The five case forms (subject/object/possessive/possessivePronoun/reflexive)
   */
  registerPronounSet(name: string, forms: PronounSetForms): void {
    registerAssemblerPronounSet(name, forms);
  }

  /**
   * Add help information for a custom action
   * @param actionId The action identifier (e.g., 'custom.action.foo')
   * @param help The help information including usage, description, examples
   */
  addActionHelp(actionId: string, help: ActionHelp): void {
    // Store the help information associated with the action
    // This would require maintaining a separate help registry
    // For now, we'll store it as messages with a special prefix
    if (help.summary) {
      this.messages.set(`${actionId}.help.summary`, help.summary);
    }
    if (help.description) {
      this.messages.set(`${actionId}.help.description`, help.description);
    }
    if (help.examples) {
      help.examples.forEach((example, index) => {
        this.messages.set(`${actionId}.help.example.${index}`, example);
      });
    }
  }

  /**
   * Add custom patterns/aliases for an action
   * @param actionId The action identifier
   * @param patterns Array of verb patterns/aliases
   */
  addActionPatterns(actionId: string, patterns: string[]): void {
    // Get existing custom patterns
    const existing = this.customActionPatterns.get(actionId) || [];
    
    // Merge with new patterns (avoiding duplicates)
    const merged = [...existing];
    for (const pattern of patterns) {
      if (!merged.includes(pattern)) {
        merged.push(pattern);
      }
    }
    
    // Store the merged patterns
    this.customActionPatterns.set(actionId, merged);
  }
}

// Default export - create an instance
export default new EnglishLanguageProvider();
