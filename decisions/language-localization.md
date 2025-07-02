# Language Localization

## Description
All player-visible text lives in language files, not in code. This includes verbs, adjectives, standard responses, and message templates. Everything can be overridden at extension or story level.

## Structure
- **Language Files** - JSON/YAML with all text strings
- **Override Hierarchy** - Story → Extensions → Standard Components → Core
- **Multiple Patterns** - Each message can have ordered variations
- **Token Replacement** - Templates use tokens like [actor], [object], [object.adjective]

## Scenarios
- Standard: "take" → ["take", "get", "grab", "pick up"]
- Override: Story adds "yoink" as a take synonym
- Response variations for 'take_success':
  1. "[actor] [verb:take] [object]."
  2. "[actor] [verb:pick] up [object]."
  3. "Taken."
- Adjective lookup: "red" → language file, not entity property
- Never: Hard-coded strings in behaviors
- Never: "You can't take that." in code (use message key: 'cannot_take')
