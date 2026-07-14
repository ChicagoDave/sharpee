story "Hatches" by "Sharpee Docs"
  id: chord-ref-hatches
  version: 0.0.1

define text weather from "./extras.ts"
define action dowsing from "./extras.ts"
define behavior tide-clock from "./extras.ts"

create the Weather Station
  a room

  A clifftop hut of instruments. The sky is doing something{weather}.

create the player
  starts in the Weather Station
