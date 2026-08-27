story
  title: Continuation Prompts
  authors:
    Sharpee Platform
  id: p10-threads
  story-version: 0.0.1
  states: quiet-day, next-day
  use state-machines
  description: Frozen mechanical fixture for conversation threads driven
    by the player's continuation prompts. One Prompter carries a
    four-beat thread about the shortfall to its conclusion; each of the
    four prompt forms advances exactly one beat, and the conclusion
    gates the ledger topic's second line. The Archive turns the day so
    a parked thread can be resumed across a day boundary.

## ---------------------------------------------------------------------------
## FROZEN MECHANICAL FIXTURE — never revise as a story.
## Two rooms, one Prompter. Asking about the shortfall opens the thread and
## serves the first beat; the player's continuation prompts ("tell me more",
## "continue", "go on", "and?") each advance one beat; past the last beat
## the conclusion serves, and the ledger topic's gated line unlocks. A
## prompt with no active thread must fall to the default "Talk to whom?"
## response, never advance anything. An off-thread ask parks the thread
## (passive default); entering the Archive on the quiet day turns the day,
## and the parked thread must still resume afterward with its resuming
## line — the thread survives the scene close AND the day boundary.
## ---------------------------------------------------------------------------

create the Counting Room
  a room
  north to the Archive

  A narrow room of desks and daybooks.

create the Archive
  a room
  south to the Counting Room

  Shelves of ledgers past.

  after the player entering while quiet-day
    phrase night-passes
    change the story to next-day
  end after

create Alex
  a person
  playable
  starts in the Counting Room

  You.

create the Prompter
  a person, proper
  aka prompter, clerk
  in the Counting Room
  mood calm
  spreads nothing

  A clerk with a story he means to finish.

define topics for the Prompter
  about "the ledger":
    phrase ledger-after when the-shortfall is concluded
    phrase ledger-line
end topics

define conversation the-shortfall for the Prompter
  about "the shortfall"
  beat:
    phrase beat-one
  beat:
    phrase beat-two
  beat:
    phrase beat-three
  beat:
    phrase beat-four
  on parting:
    phrase parting-line
  on resuming:
    phrase resuming-line
  conclusion:
    phrase conclusion-line
end conversation

define phrase ledger-line
  "The ledger keeps its own counsel."
end phrase

define phrase ledger-after
  "Now that you know the whole of it, read the ledger yourself."
end phrase

define phrase beat-one
  "It began with a missing shilling."
end phrase

define phrase beat-two
  "Then a missing pound, and nobody blinked."
end phrase

define phrase beat-three
  "By Michaelmas the drawer was bare."
end phrase

define phrase beat-four
  "And the master's seal was on every receipt."
end phrase

define phrase parting-line
  "Hold that thought."
end phrase

define phrase resuming-line
  "As I was saying about the shortfall."
end phrase

define phrase conclusion-line
  "So now you know where the money went."
end phrase

define phrase night-passes
  "The lamps burn down; morning finds you among the shelves."
end phrase

before the game starts
  change the player to Alex
end before
