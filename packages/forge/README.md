# @sharpee/forge - NOT IMPLEMENTED

This package is planned for future development but is not currently implemented.

## Planned Features

The Forge package will provide a fluent API for creating interactive fiction stories, making it easier for authors to create content without dealing with the low-level engine APIs.

### Example (planned API):
```typescript
const story = new StoryBuilder()
  .startAt('foyer')
  .addLocation('foyer', {
    name: 'Foyer',
    description: 'A grand entrance hall.'
  })
  .withItem('lamp', {
    name: 'brass lamp',
    description: 'An old brass lamp.',
    takeable: true
  })
  .build();
```

## Current Status

- Package structure created
- Basic types defined
- Implementation incomplete
- **Excluded from build**

To work on Forge in the future:
1. Re-add to package.json workspaces
2. Remove the exclusion from lerna.json
3. Complete the implementation
