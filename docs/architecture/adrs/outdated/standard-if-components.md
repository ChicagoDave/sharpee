# Standard IF Components

## Description
Not a "standard library" but the common components every IF game needs. These are the building blocks authors combine for their games.

## What's Included
- **Common Traits**: Container, Supporter, Fixed, Openable, Lockable
- **Standard Behaviors**: Taking, dropping, opening, movement
- **Basic Actions**: Look, take, drop, go, examine, inventory
- **Default Templates**: English text templates for all standard actions

## Scenarios
- Every IF game needs take/drop → Include TakeAction and DropAction
- Some games need lockable doors → Include but make optional
- Custom game adds "magic" trait → Not in standard components
- Author overrides take behavior → Their code extends/replaces standard
