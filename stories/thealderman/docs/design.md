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
- **Hotel status**: Guest (has a room)
- **Known connection**: Lover of the victim
- **Fixed alibi**: TBD
- **Alibi hole (when killer)**: TBD
- **Corroborators**: TBD
- **Psychology**: TBD

### 2. Viola Wainright
- **Who**: Actress starring in a play at McVicker's Theatre
- **Hotel status**: Guest (has a room, frequently stays here)
- **Known connection**: None apparent
- **Fixed alibi**: TBD
- **Alibi hole (when killer)**: TBD
- **Corroborators**: TBD
- **Psychology**: TBD

### 3. John Barber
- **Who**: Neighborhood gang member; dresses in tailored suits, frequents the bar
- **Hotel status**: No room (local, visits the bar)
- **Known connection**: Seen dining with victim, relationship unknown
- **Fixed alibi**: TBD
- **Alibi hole (when killer)**: TBD
- **Corroborators**: TBD
- **Psychology**: TBD

### 4. Catherine Shelby
- **Who**: Restaurant hostess, middle-aged, knows everyone
- **Hotel status**: Staff (lives off-site)
- **Known connection**: None apparent
- **Fixed alibi**: TBD
- **Alibi hole (when killer)**: TBD
- **Corroborators**: TBD
- **Psychology**: TBD

### 5. Jack Margolin
- **Who**: Real estate mogul, owns most of the neighborhood
- **Hotel status**: Guest (has a room); visits the bar, talks loud, gets kicked out
- **Known connection**: None apparent
- **Fixed alibi**: TBD
- **Alibi hole (when killer)**: TBD
- **Corroborators**: TBD
- **Psychology**: TBD

### 6. Chelsea Sumner
- **Who**: Cigarette girl, young and pretty
- **Hotel status**: Staff (lives off-site)
- **Known connection**: None apparent
- **Fixed alibi**: TBD
- **Alibi hole (when killer)**: TBD
- **Corroborators**: TBD
- **Psychology**: TBD

---

## Randomized Solution (Clue-style)

Each playthrough draws one from each category:

### Killers (6)
Any suspect.

### Weapons (6)
| Weapon | Normal Location | Missing Clue (when used) |
|--------|----------------|--------------------------|
| Revolver | TBD | TBD |
| Knife | TBD | TBD |
| Champagne bottle | TBD | TBD |
| Fireplace poker | TBD | TBD |
| Sad iron | TBD | TBD |
| Curtain cord | TBD | TBD |

### Locations (6)
| Location | Normal State | Tell (when murder happened here) |
|----------|-------------|----------------------------------|
| Stephanie's room | TBD | TBD |
| Laundry (basement) | TBD | TBD |
| Kitchen | TBD | TBD |
| Elevator | TBD | TBD |
| Ballroom | TBD | TBD |
| Suspect's room* | TBD | TBD |

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

---

## Hotel Map

### Ground Floor
- **Great Room / Foyer** — Open central space
- **Restaurant** — Open-floor, left side
- **Kitchen** — Back left, behind dual swinging doors
- **Bar** — Long bar, right side
- **Guest Check-In** — Straight back
- **Grand Staircase** — Leads to ballroom (2nd floor)
- **Hydraulic Otis Elevator** — Visits every floor

### Second Floor
- **Ballroom**

### Floors 3-8 (Guest Rooms)
- 10 rooms per floor, 60 rooms total
- Service closets on each floor
- Laundry chutes to basement

### Basement
- **Laundry**
- **Boiler Room**
- **Storage**

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

## Open Design Questions

- [ ] What are each suspect's hidden relationships to Stephanie?
- [ ] Who is the hidden family member?
- [ ] What are the fixed alibis for each suspect?
- [ ] What breaks each alibi when that suspect is the killer?
- [ ] Where does each weapon normally live?
- [ ] What's the tell at each murder location?
- [ ] What are the NPC daily routines / movement patterns?
- [ ] How does the player make an accusation? Is there a time limit?
- [ ] What happens on a wrong accusation?
- [ ] How does the game begin? (Player arrives, finds the body, is asked to investigate?)
