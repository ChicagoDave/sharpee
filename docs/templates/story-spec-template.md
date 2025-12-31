# Story Specification Template

> Based on Textfyre's commercial IF development process.
> Fill in sections as needed; delete what doesn't apply.

---

# [Title]

**Series**: [Series name, if part of a series]
**Episode**: [Episode number/name]
**Version**: [Draft version]
**Last Updated**: [Date]

## Team

| Role | Name |
|------|------|
| Designer | |
| Writer | |
| Implementer | |
| Testers | |

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| | | Initial draft |

---

# Part 1: World Bible

## Overview

**Genre**: [Fantasy / Sci-Fi / Mystery / Historical / etc.]
**Tone**: [Comedic / Serious / Horror / Whimsical / etc.]
**Target Playtime**: [1-2 hours / 4-6 hours / etc.]
**Difficulty**: [Beginner / Intermediate / Expert]

### Premise

[2-3 paragraphs describing the core concept and hook]

### Setting

[Where and when does this take place? What's the atmosphere?]

## World Building

### Society

[How is society organized? Classes, titles, power structures]

### Religion/Philosophy

[What do people believe? How does it affect daily life?]

### Technology/Magic

[What's the tech level? Is there magic? How does it work?]

### Economy

[Currency, trade, what things cost]

### Language & Expressions

[World-specific slang, oaths, idioms]

| Expression | Meaning |
|------------|---------|
| | |

## Pre-Story Context

### Recent History

[What happened before the game begins that's relevant to the plot?]

### The Inciting Incident

[What sets the story in motion?]

---

# Part 2: Characters

## Player Character

**Name**: [or "unnamed" / "player-defined"]
**Age**: [if relevant]
**Role**: [Their position in the world]
**Goal**: [What they want]
**Motivation**: [Why they want it]

### Background

[Who is the PC? Where did they come from?]

### Personality

[How do they react to things? What's their voice?]

### Starting Inventory

| Item | Description | Purpose |
|------|-------------|---------|
| | | |

## Major NPCs

### [NPC Name]

**Role**: [Ally / Antagonist / Mentor / etc.]
**Location**: [Where found initially]
**Description**: [Physical appearance, manner]

**Key Interactions**:
- [What they provide or block]
- [How player can influence them]

**Topic Table** (ASK ABOUT responses):

| Topic | Response |
|-------|----------|
| | |

### [NPC Name 2]

[Repeat structure]

## Minor NPCs

| Name | Location | Role | Notes |
|------|----------|------|-------|
| | | | |

---

# Part 3: Synopsis

## Story Structure

**Act 1**: [Setup - establish world, introduce conflict]
**Act 2**: [Confrontation - obstacles, rising tension]
**Act 3**: [Resolution - climax and denouement]

## Chapter Breakdown

### Chapter 1: [Title]

**Location**: [Area/region]
**Object**: [What player is trying to achieve]
**Obstacle**: [What's in their way]

[Narrative summary - what happens in this chapter]

### Chapter 2: [Title]

[Repeat structure]

---

# Part 4: Geography

## World Map

[ASCII art, image reference, or description]

```
        [North Area]
             |
[West] -- [Central] -- [East]
             |
        [South Area]
```

## Regions

### [Region Name]

**Atmosphere**: [Dark / Bright / Eerie / etc.]
**Access**: [How player reaches this region]
**Contains**: [List of rooms]

---

# Part 5: Chapter Design

## Chapter [N]: [Title]

### Map

```
[ASCII map of this chapter's area]
```

### Rundown

**Entry Condition**: [How player gets here]
**Exit Condition**: [How chapter ends]
**Time Pressure**: [Yes/No - if yes, describe]

**NPC Movement**:
- [NPC]: [Patrol route or behavior]

**Puzzle Summary**:
1. [First puzzle - brief description]
2. [Second puzzle - brief description]

**Key Events**:
- Turn [N]: [What happens]
- When [condition]: [What happens]

### Rooms

#### [Room Name]

**Exits**: N: [room], S: [room], E: [room], W: [room]
**Light**: [Lit / Dark / Varies]
**First Visit**: [Special text or event on first entry]

**Description**:
> [The actual room description prose that players will see]

**Objects**:

##### [Object Name]

**Traits**: [Takeable / Container / Openable / etc.]
**Initial State**: [Open / Closed / On / Off / etc.]

**Description**:
> [Examine text]

**Commands**:

| Action | Condition | Response |
|--------|-----------|----------|
| TAKE | | [Response text] |
| OPEN | | [Response text] |
| USE WITH [x] | | [Response text] |
| [custom] | [when condition] | [Alternative response] |

**Notes**: [Implementation notes for AI/programmer]

##### [Object Name 2]

[Repeat structure]

**Events**:

| Trigger | Text/Effect |
|---------|-------------|
| [Turn 3 after entering] | [What happens] |
| [When player has [item]] | [What happens] |

#### [Room Name 2]

[Repeat structure]

---

# Part 6: Puzzles

## [Puzzle Name]

**Location**: [Room(s) involved]
**Difficulty**: [Easy / Medium / Hard]
**Required Items**: [List]
**Optional Items**: [Items that help but aren't required]

### Description

[What the player encounters]

### Solution

1. [Step 1]
2. [Step 2]
3. [Step 3]

### Failure States

| Wrong Action | Result |
|--------------|--------|
| [Action] | [What happens - death? setback? hint?] |

### Hints

| Hint Level | Text |
|------------|------|
| Subtle | [Environmental hint already in descriptions] |
| Moderate | [Hint given after N failed attempts] |
| Explicit | [Direct hint if player is stuck] |

---

# Part 7: Technical Notes

## Custom Actions

| Command Pattern | Effect | Notes |
|-----------------|--------|-------|
| PUSH [dir] WALL | [What it does] | [Where it works] |

## Special Mechanics

### [Mechanic Name]

[Description of how it works - time limits, hunger, light, etc.]

## Parser Vocabulary

| Word | Synonym For | Notes |
|------|-------------|-------|
| | | |

## Win Condition

[How does the game end successfully?]

## Losing Conditions

| Condition | Can Undo? | Death Text |
|-----------|-----------|------------|
| | | |

---

# Appendix A: Treasures

| Item | Location | Take Points | Trophy Points | Total |
|------|----------|-------------|---------------|-------|
| | | | | |

**Total Possible Score**: [N] points

# Appendix B: Testing Transcripts

## Walkthrough

```
> [command]
[expected response summary]

> [command]
[expected response summary]
```

## Edge Cases to Test

- [ ] [Specific scenario]
- [ ] [Specific scenario]
