# Reading Action Design

## Overview
The reading action handles reading text from entities with the readable trait, supporting books, signs, inscriptions, and multi-page documents. This action lacks required messages definition and metadata, showing incomplete migration to current standards.

## Required Messages
**Not defined in action**, but used in code:
- `what_to_read` - No object specified
- `not_readable` - Object cannot be read
- `cannot_read_now` - Currently unreadable
- `read_text` - Generic text reading
- `read_book` - Reading a book
- `read_book_page` - Reading book page
- `read_sign` - Reading a sign
- `read_inscription` - Reading inscription

## Validation Logic

### 1. Object Validation
- **Target check**: Must have direct object (`what_to_read`)
- **Readable check**: Must have `READABLE` trait (`not_readable`)

### 2. Readability State
- **Current state**: Checks `isReadable` flag (`cannot_read_now`)
- Custom error message available via `cannotReadMessage`

### 3. Ability Requirements
- Checks for `requiresAbility` flag
- **TODO comment**: Ability checking not implemented
- Currently assumes player has required ability

## Execution Flow

### 1. State Mutation
- Sets `hasBeenRead = true` on readable trait

### 2. Build Event Data
Creates `ReadingEventData`:
```typescript
{
  targetId: target.id,
  targetName: target.name,
  text: readable.text,
  readableType: readable.readableType || 'text',
  hasBeenRead: true
}
```

### 3. Handle Multi-Page Content
If has `pageContent` and `currentPage`:
- Sets current page number
- Sets total pages count
- Overrides text with current page content

### 4. Message Selection
Based on `readableType`:
- `book` → `read_book` or `read_book_page` (if multi-page)
- `sign` → `read_sign`
- `inscription` → `read_inscription`
- Default → `read_text`

### 5. Event Generation
- Custom reading event via `createReadingEvent()`
- Success event with selected message

## Data Structures

### ReadingEventData
```typescript
interface ReadingEventData {
  targetId: string;
  targetName: string;
  text: string;
  readableType?: string;
  hasBeenRead?: boolean;
  currentPage?: number;
  totalPages?: number;
}
```

### Readable Trait (inferred)
```typescript
interface ReadableTrait {
  text: string;
  readableType?: 'book' | 'sign' | 'inscription' | 'text';
  isReadable?: boolean;
  cannotReadMessage?: string;
  requiresAbility?: boolean;
  requiredAbility?: string;
  hasBeenRead?: boolean;
  pageContent?: string[];
  currentPage?: number;
  pages?: number;
}
```

## Traits and Behaviors

### Required Traits
- `READABLE` - Must have for reading

### Trait Properties Used
- `text` - Content to display
- `readableType` - Categorization for messages
- `isReadable` - Current readability state
- `hasBeenRead` - Tracking flag
- `pageContent` - Multi-page support
- `currentPage` - Page navigation

### Missing Behaviors
- No behavior classes used
- Direct trait manipulation instead

## Message Selection Logic
1. Determines type from `readableType` property
2. Special handling for multi-page books
3. Falls back to generic `read_text`

Parameters:
- `item` - Name of readable
- `text` - Content to display
- `currentPage` - For multi-page items
- `totalPages` - For multi-page items

## Integration Points
- **Trait system**: Direct trait manipulation
- **Event system**: Custom event creation
- **Page system**: Multi-page navigation (incomplete)

## Current Implementation Issues

### Critical Problems
1. **Missing metadata**: No `metadata` property defined
2. **Missing required messages**: Messages used but not declared
3. **No three-phase pattern**: Missing report phase
4. **Incomplete ability system**: TODO comment indicates missing feature

### Design Issues
1. **Direct trait mutation**: Should use behaviors
2. **Type safety**: Heavy use of `as any` casting
3. **Attribute access**: Uses `target.attributes.name` inconsistently
4. **Page navigation**: No way to change pages
5. **Custom event creation**: Uses non-standard event builder

### Missing Features
1. **Ability requirements**: Not implemented
2. **Language support**: No multi-language texts
3. **Page turning**: Can't navigate multi-page content
4. **Read tracking**: Only boolean, no read count or time

## Recommended Improvements

### Immediate Fixes
1. **Add metadata**: Define required objects and scope
2. **Add requiredMessages**: List all messages used
3. **Implement three-phase**: Add report phase
4. **Create ReadableBehavior**: Encapsulate reading logic
5. **Fix type safety**: Remove `any` casts

### Feature Additions
1. **Page navigation**: Add turn page commands
2. **Ability checks**: Implement literacy/language requirements
3. **Read history**: Track when and how many times read
4. **Dynamic text**: Support generated content
5. **Reading speed**: Variable reading time based on length

## Usage Examples

### Simple Text
```
> read note
You read the note:
"Meet me at midnight by the old oak tree."
```

### Multi-Page Book
```
> read book
You read page 1 of 10:
"Chapter 1: The Beginning..."
```

### Sign
```
> read sign
The sign reads:
"DANGER: Bridge Out Ahead"
```

### Error Cases
```
> read
What do you want to read?

> read rock
You can't read the rock.

> read sealed scroll
The scroll is sealed and cannot be read now.
```

## Implementation Status
- **Partial implementation**: Basic functionality works
- **Missing standards compliance**: Lacks current architecture patterns
- **Incomplete features**: Multi-page, abilities not fully implemented
- **Needs refactoring**: Update to three-phase pattern with behaviors