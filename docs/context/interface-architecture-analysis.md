# Interface Architecture Analysis

## Current State (after reset to a135c0c)

We've reset to a point where:
- `@sharpee/core` has I-prefixed interfaces (IEntity, ISemanticEvent, etc.)
- `@sharpee/world-model` has I-prefixed interfaces and uses core's interfaces
- `@sharpee/stdlib` is untouched and works with world-model types
- `@sharpee/if-domain` has been updated with new contracts

## The Core Problem

We have three different perspectives on what a "command" is:

1. **Parser perspective** (`world-model/IParsedCommand`):
   - Rich parsing data: grammar structure, noun phrases, determiners
   - Parser internals that actions shouldn't know about
   - Used by command validator to resolve entities

2. **Action perspective** (what we want in `if-domain/CommandInput`):
   - Simple: just actionId, resolved entities, preposition, input text
   - No parser internals
   - Clean contract for action authors

3. **Validation perspective** (`world-model/IValidatedCommand`):
   - Contains IParsedCommand (all parser details)
   - Contains resolved entities
   - Used throughout stdlib currently

## The Architecture Tension

### Option 1: Adapter Pattern (what we just started)
- Create adapters to convert ValidatedCommand → CommandInput
- Pros: Clean separation, actions get simple interface
- Cons: Lots of conversion code, potential performance overhead

### Option 2: Extend Existing Interfaces
- Make ValidatedCommand extend CommandInput
- Pros: No adapters needed, backward compatible
- Cons: Leaks parser details through inheritance

### Option 3: Parallel Interfaces
- Keep stdlib using ValidatedCommand internally
- New actions use if-domain contracts
- Pros: No breaking changes, gradual migration
- Cons: Two systems to maintain

### Option 4: Refactor ValidatedCommand
- Change ValidatedCommand to not expose parser internals
- Move parser details to a separate metadata object
- Pros: Fixes root cause
- Cons: Breaking change to world-model

## Key Questions to Answer

1. **Should actions ever need parser details?**
   - Current actions do use things like `command.parsed.structure`
   - But this couples them to parser implementation
   - Better to have actions work with resolved entities only?

2. **Where should the conversion happen?**
   - In the command executor (before calling action)?
   - In the action registry (wrap all actions)?
   - In each action (adapter pattern)?

3. **What about backward compatibility?**
   - We're greenfield, so we can break things
   - But we have working code we don't want to break unnecessarily
   - Can we support both patterns temporarily?

4. **What's the minimal change that solves the problem?**
   - Just hide parser internals from actions
   - Don't need to rename everything
   - Focus on the specific problem: actions shouldn't see parser details

## Recommendation

I think we should:

1. **Keep existing type names** (ValidatedCommand, ActionContext)
   - No need to create new names and adapters
   
2. **Modify ValidatedCommand to hide parser details**
   - Make `parsed` property optional or private
   - Add the simple properties actions need directly
   
3. **Update actions gradually**
   - Change them to not access `command.parsed`
   - Use the simpler properties instead

This is less disruptive than creating a whole adapter layer, but still achieves our goal of hiding parser internals from actions.

## Next Steps

Before proceeding, we should:
1. Audit how many actions actually use parser internals
2. Determine what simple properties they really need
3. Design the minimal change to ValidatedCommand
4. Test with a few actions before committing to the approach