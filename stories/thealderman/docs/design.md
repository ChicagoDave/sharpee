# The Alderman — Game Design Document

## Overview

A murder mystery interactive fiction story set in a grand 1870s post-Great-Fire Chicago hotel. A reference implementation designed to exercise the full Sharpee NPC behavior chain: Conversation (ADR-142), Information Propagation (ADR-144), Goal Pursuit (ADR-145), and Influence (ADR-146).

Each playthrough randomizes the killer, weapon, and location. 95% of conversation and physical evidence is fixed — the rich, authored web of relationships, secrets, and alibis. The remaining 5% shifts based on the randomized solution, providing the clues that distinguish the real answer from the noise.

## Setting

**The Alderman** — a rebuilt "fireproof" hotel in 1870s reconstruction-era Chicago. Commercial palazzo style, eight floors. One of the city's premier establishments. New money, old grudges, political ambition, and the raw energy of a city rebuilding from ashes.

Inspired by the Tremont House (Chicago).

## Player Character

An up-and-coming architect — dashing, smart, loved by women. Riding the post-fire reconstruction boom.

## The Victim

**Stephanie Bordeau** — 40, gorgeous, wealthy, red hair, no known family left. Had lovers. Her money has legal ties to multiple suspects. Hidden truth: someone among the suspects IS family.

---

## Suspects

### 1. Ross Bielack
- **Who**: Temperamental baseball player on the Chicago White Stockings
- **Hotel status**: Guest (has a room — Room 304)
- **Known connection**: Lover of the victim
- **Hidden relationship**: Owes Stephanie gambling debts; she bankrolled his career
- **Fixed alibi**: Was at the bar all evening; Catherine served him drinks
- **Alibi hole (when killer)**: Catherine admits she stepped away for 20 minutes and can't account for that gap
- **Corroborators**: Catherine Shelby (partial)
- **Psychology**: Hot-tempered, impulsive, defensive about money. Genuinely cared for Stephanie but resented being financially dependent on her. Drinks to cope.
- **ADR features demonstrated**: Conversation constraints (deflects when not trusted, volatile mood shifts), influence (intimidation when cornered)

### 2. Viola Wainright
- **Who**: Actress starring in a play at McVicker's Theatre
- **Hotel status**: Guest (has a room — Room 306, frequently stays here)
- **Known connection**: None apparent
- **Hidden relationship**: Stephanie's half-sister (the hidden family member). Same father, different mothers. Viola was raised in poverty while Stephanie inherited everything. Secretly resents being cut out of the family fortune.
- **Fixed alibi**: Was at the theatre for a late rehearsal
- **Alibi hole (when killer)**: A theatre program found in the lobby shows the rehearsal ended an hour earlier than she claimed
- **Corroborators**: Outside witnesses (loose timing)
- **Psychology**: Brilliant performer, uses charm and wit as armor. Practiced liar — she acts for a living. The family secret eats at her. Oscillates between genuine affection for Stephanie and bitter resentment.
- **ADR features demonstrated**: Conversation (skilled lies, deflection), propagation (selective, dramatic coloring), conversation lifecycle (assertive intent)

### 3. John Barber
- **Who**: Neighborhood gang member; dresses in tailored suits, frequents the bar
- **Hotel status**: No room (local, visits the bar)
- **Known connection**: Seen dining with victim, relationship unknown
- **Hidden relationship**: Stephanie's enforcer and debt collector. She finances his operations; he keeps her investments safe. They have a business arrangement that benefits both.
- **Fixed alibi**: Left the hotel early, claims he was "at the docks"
- **Alibi hole (when killer)**: His "docks" alibi is always weak; when killer, a bellboy places him on the third floor near the murder time
- **Corroborators**: None inside the hotel
- **Psychology**: Cold, calculating, professional. Genuinely respected Stephanie as a business partner. Violence is a tool, not a passion. Speaks softly, carries himself with quiet menace.
- **ADR features demonstrated**: Influence (passive intimidation aura on room entry), goals (seeking to destroy evidence of their business arrangement), conversation (terse, refuses easily)

### 4. Catherine Shelby
- **Who**: Restaurant hostess, middle-aged, knows everyone
- **Hotel status**: Staff (lives off-site)
- **Known connection**: None apparent
- **Hidden relationship**: Stephanie's oldest and closest friend. Also the executor of Stephanie's will. Knows all of Stephanie's secrets — including Viola's identity as her half-sister.
- **Fixed alibi**: Was in the restaurant closing up; Chelsea saw her
- **Alibi hole (when killer)**: Chelsea was actually on her break and only assumes Catherine was there the whole time
- **Corroborators**: Chelsea Sumner (unreliable — assumed, not witnessed)
- **Psychology**: Warm, maternal, observant. Fiercely protective of Stephanie's memory. Knows more than anyone and parcels out information strategically. Uses her position to keep an eye on everyone.
- **ADR features demonstrated**: Propagation (chatty tendency, knows everything, key information hub), conversation (rich topic tree, many conversation paths), between-turn commentary

### 5. Jack Margolin
- **Who**: Real estate mogul, owns most of the neighborhood
- **Hotel status**: Guest (has a room — Room 308); visits the bar, talks loud, gets kicked out
- **Known connection**: None apparent
- **Hidden relationship**: Owes Stephanie a massive real estate debt. She holds the deed to his biggest property — the hotel itself. If the debt comes due, he loses everything.
- **Fixed alibi**: Was in his room; called for room service at 9pm
- **Alibi hole (when killer)**: Room service was at 9pm, but the murder was between 9:30–10pm — no alibi for that window
- **Corroborators**: Hotel staff (room service delivery timestamp only)
- **Psychology**: Loud, brash, dominates every room. Used to buying his way out of problems. Underneath the bluster, genuinely terrified of financial ruin. Gets aggressive when cornered.
- **ADR features demonstrated**: Influence (active intimidation — threatens and blusters), conversation (refuses easily, brash, loud), NPC-to-NPC influence (pressures others to stay quiet)

### 6. Chelsea Sumner
- **Who**: Cigarette girl, young and pretty
- **Hotel status**: Staff (lives off-site)
- **Known connection**: None apparent
- **Hidden relationship**: Recently discovered she may be Stephanie's daughter, given up at birth. Has a locket with a photo that matches Stephanie. Came to the hotel specifically to get close to her — and now Stephanie is dead before Chelsea could confront her.
- **Fixed alibi**: Was doing cigarette rounds on the ground floor; multiple sightings
- **Alibi hole (when killer)**: Her rounds have a 30-minute unaccounted gap between floors
- **Corroborators**: Multiple guests (but with a time gap)
- **Psychology**: Young, nervous, earnest. Torn between grief for a mother she never knew and anger at being abandoned. Omits information out of fear, not malice. Wants the truth more than anyone.
- **ADR features demonstrated**: Conversation (nervous, omits information, asks back), goals (wants to learn about her mother — seeks out Catherine and Viola for information), goal interruption (flees when threatened)

---

## Randomized Solution (Clue-style)

Each playthrough draws one from each category:

### Killers (6)
Any suspect.

### Weapons (6)
| Weapon | Normal Location | Missing Clue (when used) |
|--------|----------------|--------------------------|
| Revolver | Jack's room — nightstand drawer | Drawer is open and empty |
| Knife | Kitchen — knife block | Gap in the knife block, one blade missing |
| Champagne bottle | Bar — behind the counter | Broken glass and wet spot behind the bar |
| Fireplace poker | Foyer — by the fireplace | Empty hook beside the fireplace |
| Sad iron | Laundry — pressing station | Iron missing from the pressing board |
| Curtain cord | Ballroom — stage curtain | Curtain hangs crooked, cord torn away |

### Locations (6)
| Location | Normal State | Tell (when murder happened here) |
|----------|-------------|----------------------------------|
| Stephanie's room | Tidy, personal effects in order | Overturned furniture, broken lamp on the floor |
| Laundry (basement) | Clean linens stacked neatly | Bloodstain on sheets, knocked-over baskets |
| Kitchen | Clean, ready for morning prep | Broken dishes on the floor, blood near the prep table |
| Elevator | Operating normally | Scratches on the brass wall, stuck between floors |
| Ballroom | Stage set for tomorrow's event | Toppled music stand, dark stain on the dance floor |
| Suspect's room* | Normal guest room | Moved furniture, signs of a violent struggle |

*When "suspect's room" is drawn, a second random pick selects Ross's, Viola's, or Jack's room — independent of who the killer is.

---

## Investigation Mechanics

The player solves the mystery through:
- **Conversation** — Talk to NPCs, catch contradictions, extract information
- **Exploration** — Search rooms for physical evidence (weapon, bloodstains, torn letters)
- **Observation** — Notice NPC behavior (who avoids whom, who's nervous, who's lying)
- **Accusation** — Make a final accusation when ready (killer, weapon, location)

### Fixed Content (95%)
- All character relationships, secrets, backstories
- All conversation trees and NPC psychology
- All physical evidence that establishes the web of motives
- NPC daily routines and behaviors

### Randomized Content (5%)
- The killer's alibi has a hole (one corroborator lies or is absent)
- The weapon is missing from its normal location
- The murder location has a tell (physical clue)

### Accusation System
- **Command**: ACCUSE [suspect] WITH [weapon] IN [location]
- **No time limit** — the player can investigate as long as they want
- **Three attempts maximum**:
  - Wrong (1st/2nd): "That doesn't seem right." + hint about the weakest part
  - Wrong (3rd): Game over — the true solution is revealed
  - Correct: Victory — full denouement scene

---

## Hotel Map

### Ground Floor
- **Great Room / Foyer** — Open central space with a grand fireplace
- **Restaurant** — Open-floor dining, left side
- **Kitchen** — Back left, behind dual swinging doors
- **Bar** — Long mahogany bar, right side
- **Guest Check-In** — Straight back from foyer
- **Grand Staircase** — Leads to ballroom (2nd floor) and guest floors (3rd+)

### Second Floor
- **Ballroom** — Large event space with a stage

### Third Floor (Representative Guest Floor)
- **Third Floor Hallway** — Central corridor
- **Room 302** — Stephanie Bordeau's room
- **Room 304** — Ross Bielack's room
- **Room 306** — Viola Wainright's room
- **Room 308** — Jack Margolin's room
- **Room 310** — Player's room
- **Service Closet** — Staff access, laundry chute to basement

### Basement
- **Laundry** — Pressing stations, linen storage
- **Boiler Room** — Hotel heating system
- **Storage** — Supplies, old furniture

### Vertical Connections
- **Hydraulic Otis Elevator** — Connects all floors (foyer, ballroom, hallway, basement)
- **Grand Staircase** — Connects foyer to ballroom and third floor hallway
- **Service Closet Ladder** — Connects third floor to basement (staff shortcut)

---

## NPC Daily Routines (Goal Pursuit — ADR-145)

| NPC | Route | Behavior |
|-----|-------|----------|
| Ross Bielack | Bar → his room → foyer → bar | Restless pacing, drinks heavily, avoids Jack |
| Viola Wainright | Foyer → ballroom (rehearsing) → restaurant → her room | Performing, charming, keeps busy |
| John Barber | Bar → foyer → bar | Cycles, watches everyone, quiet menace |
| Catherine Shelby | Restaurant → kitchen → restaurant | Working, observant, talks to everyone |
| Jack Margolin | His room → bar → foyer → his room | Doing deals, loud, gets kicked out of bar |
| Chelsea Sumner | Foyer → bar → restaurant → hallway | Cigarette rounds, nervous, lingers near Catherine |

---

## Game Opening

The player arrives at The Alderman in the evening, checks in, and retires to Room 310. The next morning, the hotel is in commotion — Stephanie Bordeau has been found dead in the elevator (or wherever the randomized location dictates). The hotel manager, recognizing the player as a man of education and standing, asks for help investigating before the police arrive. The player is free to explore and question anyone.

---

## NPC System Coverage

This story exercises the following NPC behavior chain features:

| ADR | System | How The Alderman Uses It |
|-----|--------|--------------------------|
| ADR-142 | Conversation | Suspects answer questions, lie, deflect, confess under pressure; topic constraints based on trust/knowledge |
| ADR-144 | Information Propagation | NPCs gossip — telling one NPC something may reach others; information spreads with coloring based on personality |
| ADR-145 | Goal Pursuit | NPCs have agendas (hide guilt, protect someone, secure inheritance); goals drive movement and behavior |
| ADR-146 | Influence | Player can persuade, intimidate, charm; NPC-to-NPC influence affects willingness to talk |

---

## Design Decisions (Resolved)

- [x] Hidden relationships: Each suspect has a distinct financial/personal tie to Stephanie
- [x] Hidden family member: Viola Wainright (half-sister); Chelsea Sumner (possible daughter — ambiguous)
- [x] Fixed alibis: Each suspect has one, each with a corroborator
- [x] Alibi holes: When a suspect is the killer, their corroborator's account has a gap
- [x] Weapon locations: Each in a logical hotel location
- [x] Location tells: Physical evidence at the murder scene
- [x] NPC routines: Each has a distinct patrol pattern
- [x] Accusation: ACCUSE command, 3 attempts, hints on failure
- [x] Wrong accusation: Hints (1st/2nd), game over with reveal (3rd)
- [x] Game opening: Player arrives evening before, finds commotion in morning
