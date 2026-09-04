Version 3 of Extended Grammar by Aaron Reed begins here.

"Some of the most commonly attempted synonyms for verb words. Based on the Inform 6 extension ExpertGrammar.h by Emily Short."

[Changelog:
  -- Version 3: Added some new vocabulary as a result of newbie Sand-dancer transcripts.
  -- Version 2: Clarified climbing something enterable versus something not enterable; added a few new preposition forms to some commands.
]

Understand the command "hand" or "deliver" as "give".
Understand the command "depart" as "leave". 
Understand the command "carve" as "cut".
Understand the command "steal" or "grab" or "acquire" or "snatch" or "bring" as "take".
Understand the command "place" or "stick" or "shove" or "stuff" as "put".
Understand the command "board" as "enter".
Understand the command "toss" or "fling" or "hurl" as "drop".
Understand the command "melt" or "ignite" or "incinerate" or "kindle" or "parch" or "bake" or "toast" as "burn".
Understand the command "view" or "observe" or "inspect" as "examine".
Understand the command "proceed" or "wander" or "explore" as "walk".
Understand the command "whistle" or "hum" as "sing".
Understand the command "injure" or "kick" or "strike" as "attack".
Understand the command "activate" or "start" as "switch".
Understand the command "deactivate" or "stop" as "switch".
Understand the command "see" as "look".
Understand the command "raise" or "lift" as "pull".
Understand the command "lower" as "push".
Understand the command "spin" as "turn".
Understand the command "escape" as "exit".
Understand "throw [something preferably held] away" as dropping.
Understand "throw away [something preferably held]" as dropping.
Understand "throw [something preferably held] into/through/to [something]" as throwing it at.
Understand "climb [a direction]" as going.
Understand "climb on/in/into/onto [something enterable]" as entering.
Understand "exit [a door]" or "exit through/using/by/out [a door]" as entering.
Understand "climb on/in/into/onto [something]" as climbing.
Understand "sit down on/in [something]" as entering.
Understand "jump on/in/into/onto [something]" as entering.
Understand "sit down" as entering.
Understand "look around/about" as looking.
Understand "upstairs/ascend" as up.
Understand "downstairs/descend" as down. 
Understand "break in/into/down/through [something]" as attacking.
Understand "break [something] in/down" as attacking.

Extended Grammar ends here.

---- DOCUMENTATION ----

Including this extension adds about sixty new verbs to a story's vocabulary, including words like GRAB, ACTIVATE, DESCEND, and KICK. Note that no new actions are created: these are all simply synonyms for existing commands.

A few new command forms are also understood as well: for instance, CLIMB UP is understood as going, CLIMB INTO THE CHAIR as entering, and CLIMB ON WALL as climbing, all three of which are normally unrecognized.

The functionality is similar to that provided by the old Inform 6 extension ExpertGrammar.h by Emily Short, minus some of the features since incorporated by default into Inform's grammar, and plus a few words and command forms I observed new IF players try to use during the testing of various projects. Emily's comments in the original extension note that many of these words are either standard in other IF languages, or were observed in the command logs of an online version of Zork.

Example: * Look Around You

	*: "Give My Creation Life"

	Include Extended Grammar by Aaron Reed.

	The Laboratory is above the Operating Room. A slab is an enterable supporter in the Operating Room. The Creature is a man on the slab. The player carries a raw steak. The oscillitron is a device in Operating Room. Instead of attacking the creature, say "It's alive!"

	Test me with "descend / look around / observe the creature / activate oscillitron / sit down on the slab / hand steak to Creature / place steak on slab / kick Creature / upstairs"  



