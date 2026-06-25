# Em-dash review — Chapter 13: Event Handlers

### 1. Silent handler code comment (line 49) — code comment
OLD:
```typescript
world.registerEventHandler('if.event.dropped', (event, world) => {
  // Set a flag, move an item, change state — but no visible text
  world.setStateValue('item-was-dropped', true);
});
```

NEW:
```typescript
world.registerEventHandler('if.event.dropped', (event, world) => {
  // Set a flag, move an item, change state; but no visible text
  world.setStateValue('item-was-dropped', true);
});
```
