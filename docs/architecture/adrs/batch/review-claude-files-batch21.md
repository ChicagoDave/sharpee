# Review Batch 21: Claude Files (2025-04-21-00-41-11.json)

## File: 2025-04-21-00-41-11.json
**Title:** Modular Language-Grammar Design for Command Handlers

### Context:
The user identified that stdlib command handlers were using hard-coded lists of verbs when they should come from the language-grammar implementation. This led to a design question about where the en-US implementation should live.

### Decisions Found:

1. **Separate Language Implementation Package**: [Major Decision]
   - Why: Separation of concerns - language implementation distinct from core parsing
   - Create `@sharpee/lang-en-us` as separate package instead of in core/parser
   - Benefits:
     - Easier internationalization support
     - Authors can swap/customize language modules without touching core
     - Better testing isolation
     - Core doesn't grow with additional language support

2. **Two-Level Language Provider Pattern**: [Important Decision]
   - Why: Authors need both standard behavior and customization ability
   - Base level: EnglishLanguageProvider with all standard verbs/templates
   - Author level: CustomizableEnglishProvider that extends base
   - Customizations override base implementation
   - Quote: "it's important that there is a 'base' en-US but the author can 'add/change' it for their story"

3. **Language Provider Interface Design**: [Still Active]
   - Why: Need consistent interface for all language implementations
   - Core defines LanguageProvider interface
   - Methods include: getVerbs(), getTemplate(), formatMessage(), etc.
   - Verb definitions include canonical form and synonyms
   - Templates use token replacement pattern

4. **Dependency Injection for Language**: [Still Active]
   - Why: Avoid hard-coding language dependencies
   - Command handlers accept language provider in constructor
   - Handlers pull verbs from language provider instead of hard-coding
   - Enables runtime language switching

### Key Technical Details:
- Language providers manage verbs, templates, and formatting
- Verb definitions include metadata (synonyms, requirements, categories)
- Inheritance pattern allows customization without modifying base
- Registry system for managing multiple language providers

### Notable Patterns:
- Composition pattern for language customization
- Interface-driven design for language providers
- Separation of language data from parsing logic

### Implementation Details:
The session includes a comprehensive refactoring plan with:
- Core language interfaces
- English language implementation
- Customizable provider extension
- Integration with existing systems
- Migration strategy

### Status:
This was a design discussion that resulted in a major architectural decision to separate language implementation into its own package with a clear customization pattern. The user confirmed "yes - this would be the correct refactor."