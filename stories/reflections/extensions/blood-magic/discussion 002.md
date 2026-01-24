  Blood Magic Extension - Refined Design

  Core Principles

  - Always Available - Blood actions are like breathing, always available to
  attempt
  - Separate Traits - Each blood type is its own trait that can be combined
  - Story-Driven - Character knowledge and revelations are narratively
  controlled
  - Persistent Connections - Mirror connections remain until broken/erased

  Key Mechanics

  Mirror System (Blood of Silver)

  - Connections are permanent until broken
  - Can chain mirrors (with possible limits after 3+ chains)
  - Signatures fade over time (measured in hours, story-progression based)
  - LOOK/LISTEN work only through connected mirrors, undetectable
  - Can travel through mirrors while invisible

  Invisibility System (Blood of Moon)

  - Triggered by touching moon-related objects (necklace, symbol, etc.) or just using TOUCH MOON/FORGET MOON since the moon is always in scope (even if its a new moon)
  - Still interacts with objects normally
  - Leaves physical traces (footprints, disturbed dust)
  - Can pass through mirrors while invisible

  The Watcher (Blood of Stars)

  - Old woman sees current events across blood users
  - Provides italicized narrative asides at critical moments
  - Not a source of multiple endings, but commentary on the present

  Implementation Approach

  Since blood actions are "always there like breathing," we should:

  1. Register all blood verbs globally - They're always parsed, but fail gracefully if the actor lacks the blood - we'd handle the false cases narratively
  2. Use separate traits - BloodSilverTrait, BloodMoonTrait, etc.
  3. Track signatures with timestamps - Use story-time (hours) rather than real time
  4. Create moon-touched items - Items with moonTouched property can trigger invisibility - yes, but the daughter doesn't need an object - it's just a crutch or habit

  Should we also consider:
  - A "SENSE BLOOD" action to detect other blood carriers? NO
  - How the Old Man's tracking ability works (enhanced signature reading)? This is a narrative thing - he builds a web of chained mirrors and senses crossings
  - Whether breaking mirrors has consequences (sharp glass, noise, magical backlash)? NO - connections are just broken (I view these abilities as kind of mundane muscle memory things)

  Ready to start implementing the extension structure with these decisions in mind? NOT YES - still thinking it through