Version 1 of Textfyre Standard Rules by Textfyre begins here.

"A few stock phrases, verbs, synonyms and grammar tweaks which work differently to the standard Inform model but which should work the same across Textfyre games."

Use authorial modesty.

Include Pronouns by Textfyre.

Volume 1 - For universal use

Section 1 (For Glulx only)

Use DICT_WORD_SIZE of 16.

Book 1 - Definitions

Part 1 - Properties of actions

Definition: something is involved:
	if it is the noun:
		yes;
	if it is the second noun:
		yes;
	no;

Definition: something is physically involved:
	if it is the noun and the action requires a touchable noun:
		yes;
	if it is the second noun and the action requires a touchable second noun:
		yes;
	no;

To redirect the/-- action from (this - an object) to (that - an object), and try that:
	if this is the noun, change the noun to that;
	if this is the second noun, change the second noun to that;
	if and try that:
		try the current action;

To decide whether the current/-- action is physical:
	if the current action is listening to something, no;
	if the current action is smelling something, no;
	if the action requires a touchable noun or the action requires a touchable second noun, yes;
	no;

Part 2 - Properties of things

Definition: a person is other unless it is the player.
Definition: a person is another if it is other.

Part 3 - Properties of directions

Chapter 1 - Clockwise and Anticlockwise rotation of directions

To decide what direction is clockwise of (dir - a direction):
	 if dir is north, decide on northeast;
	 if dir is northeast, decide on east;
	 if dir is east, decide on southeast;
	 if dir is southeast, decide on south;
	 if dir is south, decide on southwest;
	 if dir is southwest, decide on west;
	 if dir is west, decide on northwest;
	 if dir is northwest, decide on north;
	 decide on dir;

To decide what direction is anticlockwise of (dir - a direction):
	 if dir is north, decide on northwest;
	 if dir is northeast, decide on north;
	 if dir is east, decide on northeast;
	 if dir is southeast, decide on east;
	 if dir is south, decide on southeast;
	 if dir is southwest, decide on south;
	 if dir is west, decide on southwest;
	 if dir is northwest, decide on west;
	 decide on dir;

Chapter 2 - Horizontal mirroring of directions

To decide what direction is (dir - a direction) in the mirror:
	 if dir is northeast, decide on northwest;
	 if dir is east, decide on west;
	 if dir is southeast, decide on southwest;
	 if dir is northwest, decide on northeast;
	 if dir is west, decide on east;
	 if dir is southwest, decide on southeast;
	 decide on dir;

Chapter 3 - Planar and Vertical directions

Definition: a direction is planar:
	if it is up, no;
	if it is down, no;
	if it is inside, no;
	if it is outside, no;
	yes.

Definition: a direction is vertical:
	if it is up, yes;
	if it is down, yes;
	no;

Chapter 4  - Orthogonal and Diagonal directions

Definition: a direction is orthogonal:
	if it is north, yes;
	if it is south, yes;
	if it is east, yes;
	if it is west, yes;
	no.

Definition: a direction is not orthogonal:
	if it is orthogonal, no;
	otherwise yes;

Definition: a direction is diagonal:
	if it is northeast, yes;
	if it is northwest, yes;
	if it is southeast, yes;
	if it is southwest, yes;
	no.

Definition: a direction is not diagonal:
	if it is diagonal, no;
	otherwise yes;

Chapter 5 - Vagueness of directions

To decide if (that way - a direction) is due (bearing - a direction):
	if that way is the bearing, yes;
	if that way is clockwise of the bearing, yes;
	if that way is anticlockwise of the bearing, yes;
	no;

Chapter 6 - Availability of Exits

Exiting relates a room (called R) to a direction (called D-wards) when the room-or-door D-wards from R is not nothing.
The verb to exit (it exits, they exit, it exited, it is exited, it is exiting) implies the exiting relation.

Leading relates a door (called X) to a direction (called D-wards) when the room-or-door D-wards from the location is X and D-wards is not inside and D-wards is not outside. The verb to lead (he leads, they lead, he led) implies the leading relation.

Leading-into relates a direction (called D-wards) to a room (called R) when the room-or-door D-wards from the location is R.
The verb to be headed towards implies the leading-into relation.

Definition: a direction (called D) is an exit:
	if the location exits D, yes;
	no;

Understand "[something related by leading]" as a door.

Assembling available exits of something is an activity.
The viable-directions is a list of objects [directions] that varies.

Rule for assembling available exits of a room (called someplace):
	change the viable-directions to {north, northeast, east, southeast, south, southwest, west, northwest, up, down, inside, outside};
	repeat with i running from 1 to 12:
		let way be entry 1 of the viable-directions;
		if someplace exits the way:
			rotate the viable-directions backwards;
		otherwise:
			remove entry 1 from the viable-directions;

Part 3 - Activity bug fix

[This is a bug with David Fisher's Custom Library Messages; a conflict with the standard rules definition for 'going on' (adj. of an activity.)]

To decide whether currently running (A - activity) activity:
	(- (TestActivity({A})) -).

Part 4 - Better 'best route' finding

[Not always - but very frequently - when we ask for a best route, we are already adjacent to the target destination.]

To decide which direction is the quick best route from (here - a room) to (there - a room):
	if here is adjacent to there:
		let the possibilities be {north, east, south, west, northeast, southeast, northwest, southwest, up, down, inside, outside};
		repeat with d running through the possibilities:
			if the room d from here is there:
				decide on d;
	decide on the best route from here to there, using even locked doors;

Part 5 - Properties of things

Definition: a thing is apparent if the player can see it.

Book 2 - Disambiguations and (Mis)-understandings

Part 1 - Clothing

Does the player mean taking off something worn by the player (this is the very likely to mean taking off worn things rule):
	it is very likely;

Does the player mean taking off something not worn by the player (this is the very unlikely to mean taking off unworn things rule):
	it is very unlikely;

Does the player mean removing something worn by the player from (this is the likely to mean removing worn things rule):
	it is likely;

Does the player mean removing something not worn by the player from (this is the unlikely to mean removing unworn things rule):
	it is unlikely;

Does the player mean wearing something wearable (this is the very likely to mean wearing wearable things rule):
	it is very likely;

Does the player mean wearing something not wearable (this is the very unlikely to mean wearing unwearable things rule):
	it is very unlikely;

Does the player mean wearing something worn by the player (this is the very unlikely to mean wearing worn things rule):
	it is very unlikely;

Part 2 - Food and drink

Understand "drink" as drinking.
Understand "eat" as eating.

Does the player mean eating something edible (this is the very likely to mean eating edible things rule):
	it is very likely;

Does the player mean eating something inedible (this is the very unlikely to mean eating inedible things rule):
	it is very unlikely;

Part 3 - Doors

[This is not quite right in the way the rules interact.]

Does the player mean opening or closing something openable (this is the very likely to mean opening or closing openable things rule):
	it is very likely;

Does the player mean opening something closed (this is the likely to mean opening closed things rule):
	it is likely;

Does the player mean closing something open (this is the very likely to mean closing open things rule):
	it is very likely;

Does the player mean closing something closed (this is the unlikely to mean closing closed things rule):
	it is unlikely;

Does the player mean opening something open (this is the unlikely to mean opening open things rule):
	it is unlikely;

Does the player mean opening or closing something unopenable (this is the very unlikely to mean opening or closing unopenable things rule):
	it is very unlikely;

Part 4 - Taking

Does the player mean taking something enclosed by the player (this is the very unlikely to mean taking possessions rule):
	it is very unlikely;

Book 3 - Rulebooks

Part 1 - People vs scenery

The can't turn people rule is listed before the can't turn what's fixed in place rule in the check turning rulebook.
The can't push people rule is listed before the can't push what's fixed in place rule in the check pushing rulebook.
The can't pull people rule is listed before the can't pull what's fixed in place rule in the check pulling rulebook.

Part 2 - deprecated 6E36

To decide if (x - something) goes undescribed by source text: decide on whether or not the description of x is "".


Part 2 - Printing descriptions activity

Chapter 1 - Printing the description of something

[Based on Example 296, 'Crusoe,' with additional hackery.]

The fancy examining rule is listed instead of the standard examining rule in the carry out examining rules. 

Printing the description of something is an activity. The printing the description activity has a truth state called the final-paragraph-break;

This is the fancy examining rule:
	carry out the printing the description activity with the noun;

The examine undescribed things rule is not listed in any rulebook.
The examine [undescribed] devices rule is not listed in any rulebook.
The examine [undescribed] containers rule is not listed in any rulebook. [ 6E36 ]

First before printing the description:
	change the final-paragraph-break to false;

Rule for printing the description of a container (called item): 
	if the item goes undescribed by source text:
		abide by the examine [undescribed] containers rule instead;
	say description of item;
	change the final-paragraph-break to true;

Rule for printing the description of a device (called item): 
	if the item goes undescribed by source text:
		abide by the examine [undescribed] devices rule instead;
	say description of item;
	change the final-paragraph-break to true;

Rule for printing the description of a thing (called item): 
	if the item goes undescribed by source text:
		abide by the examine undescribed things rule instead;
	say description of item;
	change the final-paragraph-break to true;

Last after printing the description of a thing:
	if the final-paragraph-break is true:
		say paragraph break;

Chapter 2 - Printing the description of a room

Section 1 - Customisable headings

The fancy room description heading rule is listed instead of the room description heading rule in the carry out looking rules. 

Carry out looking (this is the fancy room description heading rule):
	say bold type;
	if the visibility level count is 0:
		begin the printing the name of a dark room activity;
		if handling the printing the name of a dark room activity,
			issue miscellaneous library message number 71;
		end the printing the name of a dark room activity;
	otherwise if the visibility ceiling is the location:
		say "[visibility ceiling]";
	otherwise:
		say "[The visibility ceiling]";
	say roman type;
	let intermediate level be the visibility-holder of the actor;
	repeat with intermediate level count running from 2 to the visibility level count:
		[ issue library message looking action number 8 for the intermediate level; ]
		carry out the printing the room description heading details activity with the intermediate level;
		let the intermediate level be the visibility-holder of the intermediate level;
	say line break;
	say run paragraph on with special look spacing.

Printing the room description heading details of something is an activity.

Before printing the room description heading details of something (this is the printing a space between the room name and the heading details rule):
	say " ";

Rule for printing the room description heading details of a supporter (called x1):
	say "(on [the x1])";

Rule for printing the room description heading details of a thing (called x1):
	say "(in [the x1])";

Section 2 - Customisable body text

The fancy room description body text rule is listed instead of the room description body text rule in the carry out looking rules. 

This is the fancy room description body text rule:
	[copied word-for-word from the standard rules, except the last line]
	if the visibility level count is 0:
		if set to abbreviated room descriptions, continue the action;
		if set to sometimes abbreviated room descriptions and
			abbreviated form allowed is true and
			darkness witnessed is true,
			continue the action;
		begin the printing the description of a dark room activity;
		if handling the printing the description of a dark room activity,
			issue miscellaneous library message number 17;
		end the printing the description of a dark room activity;
	otherwise if the visibility ceiling is the location:
		if set to abbreviated room descriptions, continue the action;
		if set to sometimes abbreviated room descriptions and
			abbreviated form allowed is true and
			the location is visited,
			continue the action;
		carry out the printing the description activity with the location;

Rule for printing the description of a room:
	print the location's description; [Standard Rules phrase]

Book 4 - Verbs

Part 1 - Enterables

Standing on is an action applying to one thing.
Sitting on is an action applying to one thing.
Lying on is an action applying to one thing.

Entering a supporter is boarding. Standing on something is boarding. Sitting on something is boarding. Lying on something is boarding.

Understand the command "get" as something new.
Understand "get out/off/up" as exiting.
Understand "get [things]" as taking.
Understand "get on/onto [supporter]" as standing on.
Understand "get on top of [supporter]" as standing on.
Understand "get in/into/on/onto [something]" as entering.
Understand "get off [something]" as getting off.
Understand "get [things inside] from [something]" as removing it from.

Understand the command "stand" as something new.
Understand "stand" or "stand up" as exiting when the player is on a supporter.
Understand "stand on [supporter]" as standing on.
Understand "stand on/in [something]" as entering.

Understand the command "go" as something new.
Understand "go" as going.
Understand "go [direction]" as going.
Understand "go [supporter]" as standing on. [Not quite sure about this line, nor the line below it -- lifted from the standard rules and kept by benefit of doubt, but I've a feeling it's a legacy thing that might be best forgotten.]
Understand "go [something]" as entering.
Understand "go into/in/inside/through [something]" as entering.

Understand "head [direction]" as going.
Understand "head for/into/in/inside/through [something]" as entering.

Understand the command "enter" as something new.
Understand "enter [supporter]" as standing on.
Understand "enter [something]" as entering.

Understand the command "sit" as something new.
Understand "sit on top of [supporter]" as sitting on.
Understand "sit on/in/inside [supporter]" as sitting on.
Understand "sit on/in/inside [something]" as entering.

Understand "lie on/in [something]" as lying on.
Understand "lie down on/in [something]" as lying on.
Understand "lay on/in [something]" as lying on.
Understand "lay down on/in [something]" as lying on.
Understand "lie down" as sleeping.
Understand "lay down" as sleeping.
Understand "lie down to/and sleep" as sleeping.
Understand "lay down to/and sleep" as sleeping.
Understand "lay me down to/and sleep" as sleeping.
Understand "go to sleep" as sleeping.

This is the enterable checks rule:
	anonymously abide by the can't enter what's already entered rule;
	anonymously abide by the can't enter what's not enterable rule;
	anonymously abide by the can't enter closed containers rule;
	anonymously abide by the can't enter something carried rule;
	anonymously abide by the implicitly pass through other barriers rule;

This is the enterable carry out rule:
	anonymously abide by the standard entering rule;

This is the enterable reports rule:
	anonymously abide by the standard report entering rule;
	anonymously abide by the describe contents entered into rule;

The enterable checks rule is listed in the check standing on rules.
The enterable checks rule is listed in the check sitting on rules.
The enterable checks rule is listed in the check lying on rules.

The enterable carry out rule is listed in the carry out standing on rules.
The enterable carry out rule is listed in the carry out sitting on rules.
The enterable carry out rule is listed in the carry out lying on rules.

The enterable reports rule is listed in the report standing on rules.
The enterable reports rule is listed in the report sitting on rules.
The enterable reports rule is listed in the report lying on rules.

Part 2 - Climbing

[All sorts of subtleties, depending on how one would interpret 'climb up' and 'climb down', and I don't think I've quite got it right yet. But I think it's better, and I think it's worth the effort.]

Understand the command "climb" as something new.

Ascending is an action applying to one visible thing.
Descending is an action applying to one visible thing.

Understand "climb" as climbing.
Understand "climb up" as ascending.
Understand "climb down" as descending.
Understand "climb [something]" as climbing.
Understand "climb over/through [something]" as climbing.
Understand "climb on/onto [supporter]" or "climb on to [supporter]" as standing on.
Understand "climb on/onto [something]" or "climb on to [something]" as climbing.
Understand "climb up [something]" as ascending.
Understand "climb down [something]" as descending.
Understand the command "clamber" as "climb".

Understand "descend" as descending.
Understand "descend [something]" as descending.
Understand "abseil down" as descending.
Understand "abseil down [something]" as descending.

Understand "ascend" as ascending.
Understand "ascend [something]" as ascending.

Understand "run up [something]" as going.
Understand "go up [something]" as going.

Understand "run down [something]" as going.
Understand "go down [something]" as going.

Check climbing when the noun is up: [e.g. > CLIMB UP ]
	try going up instead;

Check climbing when the noun is down: [ e.g. > CLIMB DOWN ]
	try going down instead;

Rule for supplying a missing noun when ascending:
	change the noun to up;

Rule for supplying a missing noun when descending:
	change the noun to down;

Check ascending when the noun is up: [e.g. > ASCEND ]
	try going up instead;

Check descending when the noun is down: [e.g. > DESCEND ]
	try going down instead;

Carry out descending something: try climbing the noun instead.
Carry out ascending something: try climbing the noun instead.

Instead of climbing an enterable supporter when the player is on the noun:
	try getting off the noun instead;

Instead of climbing an enterable supporter when the player is not on the noun:
	try entering the noun instead;

Before going down when the player is on an enterable supporter (called the particular platform):
	if the room-or-door down from the location is nothing:
		try getting off the particular platform instead;

Part 3 - Eating

Understand the command "bite" as "eat".
Understand the command "lick" as "taste".

Part 4 - Reading

Reading is an action applying to one thing, requiring light. 

Check reading (this is the redirect reading to examining rule):
	try examining the noun instead;

Understand the command "read" as something new.
Understand "read [something]" as reading.
Understand "read about [text] in [something]" as consulting it about (with nouns reversed).
Understand "read [text] in [something]" as consulting it about (with nouns reversed).

Part 5 - Examining

Understand "look [something]" as examining.
Understand "look for [something]" as examining.
Understand "search for [something]" as examining.

Part 6 - Clothes

Understand "take off [things]" as taking off.
Understand "doff [things]" as taking off.

Understand "wear [things preferably held]" as wearing.
Understand "put on [things preferably held]" as wearing.
Understand "put [something preferably held] on" as wearing.
Understand "put [things preferably held] on" as wearing.

Part 7 - Taking Inventory

[It's unfortunately hard to jig about with the I7 list writer, and probably easier just not to bother. Thus:]

This is the Textfyre Standard replacement inventory rule:
	[The difference between this and the standard inventory style is that we do not show inventory information.]
	issue library message taking inventory action number 2;
	say ":[line break]";
	list the contents of the player, with newlines, indented, including contents, with extra indentation;

The Textfyre Standard Replacement Inventory rule is listed instead of the print standard inventory rule in the carry out taking inventory rulebook.

After printing the name of something (called x) while taking inventory:
	carry out the printing inventory information activity with x;

Printing inventory information of something is an activity.

Rule for printing inventory information of something worn by the player:
	say " (being worn)";

Rule for printing inventory information of an open container (called x):
	if x is openable:
		say " (which [is or are for x] open, [unless x encloses something]but empty[otherwise]containing:[end if])";
	otherwise:
		say " ([unless x encloses something]which [is or are for x] empty[otherwise]containing:[end if])";

Rule for printing inventory information of a closed container (called x):
	if x is openable:
		say " (which [is or are for x] closed[if x does not enclose something and x is transparent], and empty[otherwise if x is transparent], containing:[end if])";
	otherwise:
		say "[if x does not enclose something and x is transparent](which [is or are for x] empty)[otherwise if x is transparent](containing:)[end if]";

Part 8 - Doors

Chapter 1 - Implicitly opening

Implicitly opening something is an activity.

Rule for implicitly opening something (called the unopened item):
	say "(first opening [the unopened item])[command clarification break]";
	try silently opening the unopened item; 

Rule for implicitly opening something locked (called the locked item):
[	consider the unlocking rules for the locked item;
	if the rule succeeded:]
	let the chosen key be the object produced by the unlocking rules for the locked item[result of the rule];
	if the chosen key is something:
		say "(first unlocking [the locked item] with [the chosen key])[command clarification break]";
		try silently unlocking the locked item with the chosen key;
		if the locked item is unlocked and the locked item is closed:	
			try silently opening the locked item;
	otherwise:
		say "(first opening [the locked item])[command clarification break]";
		try silently opening the locked item;

Before going through a closed door (called the obstacle) (this is the textfyre standard implicit opening rule):  [no longer needed per 6E36?]
	carry out the implicitly opening activity with the obstacle;
	if [the obstacle is locked and] the obstacle is closed:
		stop the action;

Chapter 2 - Implicitly unlocking

The unlocking rules are an object based rulebook producing an object. The unlocking rules have default failure.

An unlocking rule for something lockable (called the lockbox) (this is the matching key rule):
	if the player carries something (called the appropriate key) that fits the lockbox:
		rule succeeds with result the appropriate key;
	continue the activity;

Last unlocking rule (this is the no matching key found rule):
	rule fails. [6E36]

Rule for supplying a missing second noun while unlocking something (called the locked item) with:
[	consider the unlocking rules for the locked item;
	if the rule succeeded:]  [6E36]
	let the chosen key be the object produced by the unlocking rules for the locked item; [result of the rule;]
	if the chosen key is something:
		begin the clarifying the parser's choice activity with the chosen key;
		if handling the clarifying the parser's choice activity with the chosen key:
			say "(with [the chosen key])[command clarification break]";
		end the clarifying the parser's choice activity with the chosen key;
		change the second noun to the chosen key;

Chapter 3 - Locking and unlocking

Matching relates a thing (called the key in question) to a thing (called the lock) when the lock provides the property matching key and the matching key of the lock is the key in question.
The verb to fit (it fits, they fit, it fitted) implies the matching relation.

Definition: a thing is a key:
	if it fits something, yes;
	no;

Definition: a thing is a lock:
	if it is not lockable, no;
	if it provides the property matching key:
		yes;
	no;

Understand "unlock [something]" as unlocking it with.
Understand "put [key thing] in/into [lock thing]" as unlocking it with (with nouns reversed).
Understand "insert [key thing] in/into [lock thing]" as unlocking it with (with nouns reversed).

Part 9 - Inserting and Removing

[ We let the player try these things and fail them: the default message that occurs otherwise is 'you can't see any such thing', which seems somewhat worse. ]

Understand the command "remove" as something new.
Understand "remove [things] from [something]" as removing it from.
Understand "remove [things]" as removing it from.
Understand "remove [things] out of/from [something]" as removing it from.

Understand "take [things] from [something]" as removing it from.
Understand "get [things] from [something]" as removing it from.

Understand "take [things] out of/from [something]" as removing it from.
Understand "get [things] out of/from [something]" as removing it from.

Rule for supplying a missing second noun when removing something from:
	if the player wears the noun:
		change the second noun to the player;
	otherwise if something (called the enclosure) contains the noun:
		begin the clarifying the parser's choice activity with the enclosure;
		if handling the clarifying the parser's choice activity with the enclosure:
			say "(from [the enclosure])[command clarification break]";
		end the clarifying the parser's choice activity with the enclosure;
		change the second noun to the enclosure;
	otherwise:
		change the second noun to the holder of the noun;

Understand "put [things] in/inside/into [something]" as inserting it into.
Understand "insert [things] in/inside/into [something]" as inserting it into.
Understand "drop [things] in/inside/down/into/behind [something]" as inserting it into.
Understand "hide [things] in/inside/down/under/into/behind [something]" as inserting it into.

Check removing something worn by the player from the player (this is the convert remove to take off rule):
	try taking off the noun instead;

Check removing something carried by the player from the player (this is the can't remove from onesself rule):
	say "You already have that." instead;

Part 10 - Facing Directions (for use without Adjacent Rooms by Textfyre)

[Adapted from manual example #66, "A View of Green Hills".]

Printing the distant description of something is an activity.

Facing is an action applying to one visible thing.
The facing action has an object called the viewed item (matched as "towards").
The facing action has an object called the aperture viewed through (matched as "through").

Understand "look [direction]" as facing. 
Understand "examine [direction]" as facing. 
Understand "look through/towards/into/to [direction]" as facing. 
Understand "search [direction]" as facing. 

Setting action variables for facing:
	now the viewed item is the room-or-door noun from the location of the actor; 
	if the viewed item is an door:
		change the aperture viewed through to the viewed item;
		if the aperture viewed through provides the property other side:
			unless the other side of the aperture viewed through is nothing:
				change the viewed item to the other side of the aperture viewed through;

Check facing through something closed:
	say "[The aperture viewed through] [is-are] closed." instead;

Check facing towards nothing:
	say "You see nothing of interest in that direction." instead;

Report facing up towards a room:
	say "[The viewed item] lies above." instead;

Report facing down towards a room:
	say "[The viewed item] lies below." instead;

Report facing inside towards a room:
	say "[The viewed item] lies inwards." instead;

Report facing outside towards a room:
	say "[The viewed item] lies outwards." instead;

Report facing towards a room:
	say "[The viewed item] lies to [the noun]." instead;

Part 11 - Taking

Understand "reach [something]" as taking.
Understand "reach for/to/towards [something]" as taking.
Understand "reach out for/to/towards [something]" as taking.

Part 12 - EXITS command

Listing exits is an action out of world applying to nothing.

Understand "exits" as listing exits.

Carry out listing exits:
	carry out the assembling available exits activity with the location;

Report listing exits (this is the Textfyre standard listing exits rule):
	if the viable-directions is not empty:
		if the number of entries in the viable-directions is 1:
			say "There is an exit [viable-directions] from here.";
		otherwise:
			say "There are exits [viable-directions] from here.";
	otherwise:
		say "There are no obvious exits from this place.";

Part 13 - Pushing and Pulling

Chapter 1 - Push

Understand "rock [something]" as pushing.
Understand "tilt [something]" as pushing.

Understand "push [someone] over" as attacking.
Understand "knock [someone] over" as attacking.
Understand "push over [someone]" as attacking.
Understand "knock over [someone]" as attacking.

Understand "push [something] over" as pushing.
Understand "roll [something] over" as pushing.
Understand "knock [something] over" as pushing.
Understand "push over [something]" as pushing.
Understand "knock over [something]" as pushing.

Chapter 2 - Pull

Understand "stretch [something]" as pulling.

Part 14 - Listening 

Understand "listen at/for/with/by/near [something]" as listening to.     


Book 5 - Kinds

Part 1 - Doorways

A doorway is a kind of door. A doorway is usually open, not openable, unlocked, not lockable, privately-named, scenery. The specification of a doorway is "A kind of door which can be referred to by its direction."

The printed name of doorway is usually "[directional for the item described]doorway".

[Before printing the name of a doorway (called the portal):]
To say directional for (portal - a door):
	let d be the direction of the portal from the location;
	unless d is nothing, say "[d] ".

[Rule for printing the name of a doorway:
	say "doorway";]

Understand "[something related by leading]" as a doorway.

Understand "doorway" as a doorway.
Understand "doorways" as the plural of doorways.
Understand "exits" as the plural of doorways.

Part 2 - Staircases

A staircase is a kind of backdrop. The specification of a staircase is "A flight of stairs that runs continuously between several rooms, that tries to make sense of attempts to CLIMB it."

A staircase has a room called the head. A staircase has a room called the foot.

The block climbing rule is not listed in any rulebook;

Check climbing (this is the slightly more lenient block climbing rule):
	if the noun is not a staircase:
		abide by the block climbing rule;

Check climbing a staircase (this is the clarify ambiguity of staircases rule):
	unless the location is the head of the noun or the location is the foot of the noun:
		say "[The noun] run[s] up and down from here[one of]. Which way do you want to go?[or].[stopping]" instead;

Carry out climbing a staircase:
	if the location is the head of the noun:
		try going down instead;
	otherwise if the location is the foot of the noun:
		try going up instead;

Check ascending a staircase:
	if the location is the head of the noun:
		say "[The noun] only run[s] down from here." instead;

Carry out ascending a staircase:
	try going up instead;

Check descending a staircase:
	if the location is the foot of the noun:
		say "[The noun] only run[s] up from here." instead;

Carry out descending a staircase:
	try going down instead;

Book X - Miscellany

Chapter 1 - No swearing

Understand the commands "shit", "fuck", "damn", "sod", "curses", "drat", "bother", and "darn" as something new

Chapter 2 - HTMLesque Informese

To say i -- running on: (- style underline; -);
To say r -- running on: (- style roman; -);
To say b -- running on: (- style bold; -);

Chapter 3 - New ways of parsing commands as actions

After reading a command:
	let N be indexed text;
	let N be the player's command; 
	replace the regular expression "\btry to (.+)" in N with "\1", case insensitively; 
	replace the regular expression "\buse (.+?) to (.+)" in N with "\2 with \1", case insensitively; 
	change the text of the player's command to N. 

Volume 2A (for use without Custom Library Messages by David Fisher)

[This space reserved for changes to standard library messages]

Chapter 1 - Parser Errors

Rule for printing a parser error when the latest parser error is noun did not make sense in that context error:
	say "I can't see any such thing." instead;

Volume 2B (for use with Custom Library Messages by David Fisher)

[This space also reserved for changes to standard library messages; it would need to be done differently.]

Volume 3A (for use without FyreVM Support by Textfyre)

To output chapter heading (header - text):
	say "[line break][bold type][header] [roman type][paragraph break]";

To select theme (theme - text):
	do nothing;

Volume 3B (for use with FyreVM Support by Textfyre)

To output chapter heading (header - text):
	if FyreVM is present:
		select the chapter channel;
		say header;
		select the main channel;
	otherwise:
		say "[bold type][header] [roman type][paragraph break]";

[
To select theme (theme - text):
	if FyreVM is present:
		select the theme channel;
		say theme;
		select the main channel;
]
Textfyre Standard Rules ends here.

---- DOCUMENTATION ----

This extension is in no way meant as a replacement for the Standard Rules, but really just as a collection of tweaks, refinements and best practices that can eventually be shared across Textfyre games to allow a degree of uniformity and robustness. At the moment, though, it's incomplete, incorrect, and laughably trivial.

Chapter: Doors

In interactive fiction, we generally endeavour to make uninteresting hassles, such as the correct use of doors, as transparent to the player as possible. However, locked doors still remain an important obstacle to the player's progress.

Section: Unlocking

The unlocking rules are called during the "supplying a missing second noun" stage of action processing. They should either suggest an appropriate key to try (not necessarily the correct one, just a reasonable one,) or fail with some text. 

	The red key unlocks the red door.

	An unlocking rule for the red door:
		if the player has the red key:
			rule succeeds with result the red key;
		if the player has the blue key:
			rule succeeds with result the blue key;
		say "You don't have any keys to try on this door.";

Unlocking rules should not fail silently: that may lead to embarrassing and mysterious silences where a response is expected.

Section: Implicit opening

We aim to ensure that the player's attempts to pass through doors go unimpeded. Before going through a closed door, an opening action is generated implicitly. Before opening a locked door, an unlocking action is generated. This is all handled by the "implicitly opening" activity.

In the case of doors which are simply closed, the activity is correspondingly simple:

	Rule for implicitly opening something (called the unopened item):
		say "(first opening [the unopened item])[command clarification break]";
		try silently opening the unopened item; 

Section: Implicit opening and unlocking

Implicitly unlocking doors is more complicated. Firstly, the unlocking rulebook is called to determine an appropriate key. If none is found, the action goes no further. If one is suggested, we make an attempt to unlock the door, and if that succeeds, we go ahead with opening it. Finally, if the door is open, we may pass through it.


