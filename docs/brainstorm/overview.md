# The Alderman — Murder Mystery Reference Implementation

A murder mystery interactive fiction story set in a grand 1870s post-fire Chicago hotel, designed to exercise the full NPC behavior chain (ADR-142 Conversation, ADR-144 Information Propagation, ADR-145 Goal Pursuit, ADR-146 Influence).

## Setting

**The Alderman** — a rebuilt "fireproof" hotel in 1870s post-Great-Fire Chicago. Commercial palazzo style, eight floors. One of the city's premier establishments in the reconstruction era. New money, old grudges, political ambition, and the raw energy of a city rebuilding itself from ashes.

Inspired by the Tremont House (Chicago), which hosted Lincoln and Douglas, survived three fires across successive buildings, and anchored the corner of Lake and Dearborn in early Chicago.

## Player Character

An up-and-coming architect — dashing, smart, loved by women. Riding the reconstruction boom in post-fire Chicago.

## The Victim

**Stephanie Bordeau** — 40, gorgeous, wealthy, red hair, no known family left. Had lovers. Her money has legal ties to multiple suspects. The hidden truth: someone among the suspects IS family.

## The Suspects

1. **Ross Bielack** — Temperamental baseball player on the new Chicago White Stockings. Lover of the victim. Has a room at the hotel.
2. **Viola Wainright** — Actress starring in a play at McVicker's Theatre. Frequently stayed at the hotel. Has a room. Relationship to victim unknown to player.
3. **John Barber** — Neighborhood gang member. Dresses in tailored suits, frequents the bar. Seen dining with the victim. Relationship unknown to player. No room at the hotel.
4. **Catherine Shelby** — Restaurant hostess, middle-aged, knows everyone. Relationship to victim unknown to player. No room (staff, lives off-site).
5. **Jack Margolin** — Real estate mogul, owns most of the neighborhood. Visits the bar but talks loud and gets kicked out. Has a room at the hotel. Relationship to victim unknown to player.
6. **Chelsea Sumner** — Cigarette girl, young and pretty. Relationship to victim unknown to player. No room (staff, lives off-site).

All relationships are hidden and deeply tied to each character's psychology. The player uncovers them through conversation, observation, and deduction.

## Randomized Elements (Clue-style)

Each playthrough randomizes three independent variables:

- **Killer**: Any of the 6 suspects
- **Weapon**: Revolver, Knife, Champagne bottle, Fireplace poker, Sad iron, Curtain cord
- **Location**: Stephanie's room, Laundry (basement), Kitchen, Elevator, Ballroom, A suspect's room (Ross's, Viola's, or Jack's — also randomized independently; killer does not need to be the room's occupant)

## Hotel Map

### Ground Floor
- **Great Room / Foyer** — Open, central
- **Restaurant** — Open-floor, left side
- **Kitchen** — Back left, behind dual swinging doors
- **Bar** — Long bar, right side
- **Guest Check-In** — Straight back
- **Grand Staircase** — Leads to ballroom (2nd floor)
- **Hydraulic Otis Elevator** — One of the first; visits every floor

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

## Brainstorm Progress

- [ ] **Problem & Vision** — What problem does this solve? Who has this problem? What does success look like?
- [ ] **Core Concepts** — Key entities, terms, and relationships in the domain
- [ ] **User Activities** — What do users actually do? Workflows, interactions, jobs-to-be-done
- [ ] **Structural Patterns** — How are things organized? Hierarchies, categories, lifecycles, states
- [ ] **Competitive Landscape** — What exists today? Where do they fall short? What's the differentiation?
- [ ] **Tech Stack** — Languages, frameworks, infrastructure, data stores, protocols
- [ ] **Architecture** — Layers, boundaries, hosting model, data ownership, integration points
- [ ] **Role Assessments** — Evaluate the design from stakeholder perspectives
- [ ] **Thought Exercises** — Stress-test with concrete scenarios
- [ ] **Revenue & Business Model** — How does this make money? Pricing, tiers, monetization strategy
- [ ] **MVP Scope** — What ships first? What's explicitly out of scope? What's the minimal working loop?
- [ ] **Open Questions** — Unresolved decisions, unknowns, things to research
