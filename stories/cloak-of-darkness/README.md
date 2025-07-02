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

This Sharpee implementation demonstrates:
- **Story Configuration**: Uses the `Story` interface with language set to "en-us"
- **World Building**: Creates rooms, objects, and relationships
- **Custom Behaviors**: Tracks sawdust disturbance when entering the bar in darkness
- **Dynamic Descriptions**: Message readability changes based on game state
- **Event Handling**: Responds to player movement and actions

## Building and Running

```bash
# Install dependencies
npm install

# Build the TypeScript
npm run build

# Run the test runner
npm start
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
