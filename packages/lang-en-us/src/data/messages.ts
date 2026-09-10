/**
 * English parser error messages: the text the player reads when a command
 * fails to parse, keyed by the parse error's message id.
 *
 * Public interface: `parserErrors` (the template table) and
 * `getParserErrorMessage(messageId, context)` (template resolution).
 *
 * Owner context: `@sharpee/lang-en-us`, the English language layer.
 */

/**
 * Parser error messages
 * Keys match the messageId from ParseErrorCode analysis
 *
 * Template variables:
 * - {verb} - The recognized verb
 * - {noun} - The word that failed to resolve
 * - {slot} - The slot name (target, container, etc.)
 * - {options} - Comma-separated list of disambiguation options
 */
export const parserErrors: Record<string, string | ((ctx: Record<string, any>) => string)> = {
  // No input
  'parser.error.noInput': "I beg your pardon?",

  // Unknown verb
  'parser.error.unknownVerb': (ctx) =>
    ctx.verb
      ? `I don't know the word "${ctx.verb}".`
      : "I don't understand that sentence.",

  // Missing direct object
  'parser.error.missingObject': (ctx) =>
    ctx.verb
      ? `What do you want to ${ctx.verb}?`
      : "What do you want to do that to?",

  // Missing indirect object
  'parser.error.missingIndirect': (ctx) => {
    if (ctx.verb && ctx.slot) {
      // Create natural phrasing based on slot
      const where = ['container', 'location', 'destination'].includes(ctx.slot);
      return where
        ? `Where do you want to ${ctx.verb} it?`
        : `What do you want to ${ctx.verb} it ${ctx.slot}?`;
    }
    return "I need more information to understand that.";
  },

  // Entity not found
  'parser.error.entityNotFound': (ctx) =>
    ctx.noun
      ? `You can't see any "${ctx.noun}" here.`
      : "You can't see any such thing.",

  // Scope violation
  'parser.error.scopeViolation': (ctx) =>
    ctx.noun
      ? `You can't reach the ${ctx.noun}.`
      : "You can't reach that.",

  // Ambiguous input
  'parser.error.ambiguous': (ctx) => {
    if (ctx.candidates && ctx.candidates.length > 0) {
      const options = ctx.candidates.join(', ');
      return `Which do you mean: ${options}?`;
    }
    return ctx.noun
      ? `Which ${ctx.noun} do you mean?`
      : "Which do you mean?";
  },

  // Generic syntax error
  'parser.error.invalidSyntax': (ctx) =>
    ctx.extraWords
      ? `I understood you as far as "${ctx.verb}" but got confused by "${ctx.extraWords}".`
      : "I don't understand that sentence."
};

/**
 * Get a parser error message by ID
 * @param messageId The message ID (e.g., 'parser.error.unknownVerb')
 * @param context Template variables to substitute
 * @returns The formatted error message
 */
export function getParserErrorMessage(
  messageId: string,
  context: Record<string, any> = {}
): string {
  const template = parserErrors[messageId];
  if (!template) {
    // Fallback to generic message
    return "I don't understand that.";
  }

  if (typeof template === 'function') {
    return template(context);
  }

  // Simple string template - replace {key} placeholders
  return template.replace(/\{(\w+)\}/g, (_, key) => context[key] || '');
}
