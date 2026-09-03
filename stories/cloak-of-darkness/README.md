# Cloak of Darkness - A Sharpee Story

This is the Sharpee implementation of "Cloak of Darkness" by Roger Firth, a standard demonstration game for Interactive Fiction systems.

## About the Game

Cloak of Darkness is a very short game that demonstrates the basic features of an IF system:
- Room descriptions and navigation
- Object manipulation (taking, dropping, hanging)
- Light and darkness
- State changes affecting descriptions
- Win conditions

## The Story

You start in the foyer of an opera house wearing a velvet cloak. Your goal is to read a message written in sawdust on the floor of the bar. However, the bar is dark, and if you enter while wearing the cloak, you'll disturb the sawdust and make the message harder to read.

## Solution

1. Start in the foyer
2. Go west to the cloakroom
3. Hang the cloak on the hook
4. Go east back to the foyer
5. Go south to the bar
6. Read the message

## Implementation Details

The story is `cloak.story`, written in Chord, with one TypeScript hatch
module (`src/extras.ts`) that the story binds for the garbled-message text.
It demonstrates:
- **World Building**: rooms, objects, and relationships in Chord
- **Custom Behaviors**: tracking sawdust disturbance when entering the bar in darkness
- **Dynamic Descriptions**: message readability changing with game state
- **Hatches**: a `define text … from "./extras.ts"` binding into TypeScript

## Building and Running

```bash
# Build the hatch module (dist/extras.js)
pnpm --filter @sharpee/story-cloak-of-darkness build

# Play or test through the platform bundle
node dist/cli/sharpee.js --play --story stories/cloak-of-darkness
node dist/cli/sharpee.js --test stories/cloak-of-darkness/tests/transcripts/*.transcript
```

## Key Features Demonstrated

1. **Rooms**: Foyer, Cloakroom, and Bar
2. **Objects**: Velvet cloak, brass hook, message in sawdust
3. **Darkness**: The bar is dark unless you're not carrying the cloak
4. **State Tracking**: Number of times the sawdust has been disturbed
5. **Dynamic Text**: Message becomes garbled based on disturbances

## Technical Notes

- The story uses the standard Sharpee trait system
- Light/darkness is handled through the LIGHT_SOURCE trait
- The message uses a READABLE trait with dynamic text
- Event handlers track movement to manage sawdust disturbance
