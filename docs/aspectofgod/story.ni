"Aspect of God" by David Cornelson

The story genre is "An Interactive Spiritual Conflict".

Include Aspect Routines by David Cornelson.
Include Emotions Rules by David Cornelson.
Include Basic Screen Effects by Emily Short.

Book Aspect of God

Volume 1 - The Farmer's Daughter

Rule for deciding whether all includes scenery: it does not.

People can be active or inactive.
People have a number called the inactive time limit. The inactive time limit of people is usually 5.
People have a number called the current move. The current move of people is usually 1.
Rooms have an availability.

When play begins:
	view the prologue;                                                     [from Aspect Routines]
	change the time of day to 7:15 AM;
	change the right hand status line to "Time: [time of day]".

Part I - Prologue

SomewhereRoom is a room with printed name "Somewhere". "You dream of the span of a soul's life. You dream of the intersections in a soul's life. You listen to the rhythm of life throughout the universe. Cast among the stars, you await the call."

The description of the player is "You are an Aspect of God."

Section 1a - Somewhere Room Scenery

In the somewhereroom is a thing called void. It is scenery. The description of the void is "Among the stars within the universe there is everything and nothing. This is the void."

A somewheretoomitem is a kind of thing. It is scenery. Some somewheretoomitems in the SomewhereRoom are defined by the Table of SomewhereRoom Scenery.

Understand "heavens" as heaven.
Understand "bright stars" or "stars" as star.

Table of SomewhereRoom Scenery
somewhereroomitem		description
life				"There is life everywhere, but the focus of your
				 attention is on The Call."
heaven				"You are an Aspect of God."
universe				"You are an Aspect of God."
star				"The height of serenity lies within each mass of light and darkness.
				 The call is not with them, for they are at peace with the universe,
				 in birth and in death."

Section 1b - Music

Instead of listening to SomewhereRoom, Listen to Music.

A sound is a kind of thing. A sound is usually scenery.

Understand "eat [sound]" as eating.

The music is a sound in the somewhereroom.

Instead of doing something other than listening to the music, say "The music is everywhere. Your heart sings at every note."

Instead of listening to music, Listen to Music.

To Listen to Music: say "The music of all things flow dreaming. Waves and rivulets cast rainbow stanza. Symbiotic rhythms pervade the universe. Storms of chaos whip about in frenzied clashes damaging the song, only to be enveloped by an Aspect of God."

A wave is scenery in the somewhereroom. The description is "The musical waves weave through the void causing riplets of concern wherever they travel."

A rivulet is scenery in the somewhereroom. The description is "The rivulets of sound pour cascading echoes of life throughout the void."

A rainbow stanza is scenery in the somewhereroom. The description is "Prismic lightning flashes throughout the void, breifly outlining The Call."

Section 1c - Dreaming (complete)

A dream is a kind of thing.

The prologue dream is a scenery dream. The prologue dream is in the somewhereroom.

Dream is an action applying to nothing.
Dreaming is an action applying to nothing.

Understand "dream" as dreaming.
Understand "what am I dreaming" as dreaming.
Understand "dream about soul" as dreaming.
Understand "dream about span" as dreaming.
Understand "dream about life" as dreaming.

Instead of dreaming, Dream.
Instead of examining dream, Dream.

To Dream: say "Movement ignites your dreams, bringing snapshots of evolution and decay. Alternately vivid and masked visions impede your psyche combined with memories of the future and plans for the past."

Section 1d - The Original Call (complete)

A call is a kind of thing. A call is usually scenery.

The original call is a call. The original call is in the somewhereroom.

Instead of examining the original call, say "Chaotic storms beckon from all directions, roiling in strengthened and weakened states as you dream their horrors. A confluence of energies gathers distantly. The balance is in danger and The Call beckons you."

Instead of waiting while in somewhereroom, say "You dream of solace and await the perfect storm."

Answering is an action applying to one thing.

Understand "answer [something]" as answering.

Instead of answering the original call:
	say "Light and sound merge into a single note, a pathway beckons, and your spirit answers the call...";
	print a blank line;
	say "...like a rainbow appearing on the horizon, your spirit cascades down from the void to the source of the call. Despite the strength of the distress and urgency of its need, one entity shines brightly, unaffected by the upheaval. He stands before you, blocking passage to his domain.";
	move player to South of the Farmhouse.

Part II - Arrival

Section 1a - Outside the Farmhouse

South of the Farmhouse is a room.

The description of the South of the Farmhouse is "Through the damp gray morning mist a large white farmhouse looms before you to the north. With a fence traveling far behind to the east. The porch reveals little from this vantage, save for the vines twisting through spoke and rail."

A dog is a kind of animal.

Mack is an unknown male dog. The emanating vibe of Mack is very strong.

Understand "small entity" as Mack.
Understand "entity" as Mack.

The description of Mack is "[if Mack is known]Mack is sitting nearby wagging his tail[otherwise]The small entity is guarding its territory and watching you very carefully[end if]."

The printed name of Mack is "[if Mack is known]a dog named Mack[otherwise]a small sentient entity[end if]"

Comforting is an action corresponding to comfort
	applying to one thing
	- check -
	none
	- carry-out -
	none
	- report -
	none.

Understand "comfort [something]" as comforting.
[Understand the comands "pet" and "console" as "comfort".]

Mack is in the South of the Farmhouse.

Instead of comforting Mack while Mack is unknown:
	Now Mack is known;
	say "By comforting the small entity, you gradually come to know it.  Cautiously revealing your name gains you entry to the property and the name of this 'dog' named 'Mack'. Mack greets you by barking loudly and jumping up and down.

An unseen spirit calls from near the house, 'Mack, is there somebody there?'"

Instead of comforting Mack while the availability of Mack is known:
	say "You share a spiritual bond with the dog, causing him to chase his tail."

Instead of going north while the availability of Mack is unknown:
	say "The small entity growls and the strength of his spirit prevents you from proceding."

An unseen spirit is in the South of the Farmhouse. It is scenery.

Instead of examining the unseen spirit while in the South of the Farmhouse and while the availability of Jessica is unknown:
	say "The voice you heard is clearly the source of The Call, but you cannot see anything from this vantage point.";
	stop the action.

The Front of the Farmhouse is a room. It is north of the South of the Farmhouse. "You are in front of the Farmhouse."

Rule for listing nondescript items of Front of the Farmhouse when Jessica is known:
	say "[if Jessica is on the rocking chair]Jessica rocks quietly in the chair on the porch[otherwise]An empty rocking chair rests quietly on the porch[end if].";
	do nothing;

Rule for listing nondescript items of Front of the Farmhouse when Jessica is unknown:
	say "[if Jessica is on the rocking chair]A very intense sapient spirit is sitting in a rocking chair on the porch[otherwise]An empty rocking chair rests quietly on the porch[end if].";
	do nothing.

The front porch is an enterable supporter. It is in the Front of the Farmhouse.

Understand "porch" as the front porch.

A rocking chair is an enterable supporter on the front porch. The emanating vibe of the rocking chair is very strong.

The porch ending is text that varies. The porch ending is " where a greaving entity occupies a lone rocking chair"

The description of the front porch is "The south-facing structure exudes memories of the near and distant past. The porch spans the entire face of the house[porch ending]."

The description of the rocking chair is "The rocking chair is an heirloom, probably handmade by a patriarch of the family. It is emanating a [emanating vibe] vibe."

Jessica is an unknown woman on the rocking chair. "Jessica is a tall, fair, and troubled soul. ([current move of Jessica])".

Rule for printing the name of the rocking chair while listing contents of a room:
	say "[if Jessica is on the rocking chair]Jessica is rocking in a chair on the porch[otherwise]An empty rocking chair rests quietly on the porch[end if]."

Before examining Jessica while in the Front of the Farmhouse and while the availability of Jessica is unknown:
	say "The spirit before you is the source of The Call. Her welfare is in danger along with others nearby. This is why you are here.[line break]You invite the spirit to name itself and are shocked by the acid backlash from its inner turmoil. Gaining access to this spirit will not be easy.[paragraph break]";
	Now Jessica is obscured;
	stop the action.

Before examining Jessica while in the Front of the Farmhouse and while the availability of Jessica is obscured:	say "The spirit balks at your interference. You must find some way to appease it before resolving The Call.";
	stop the action.

Before examining Jessica while in the Front of the Farmhouse and while the availability of Jessica is known:
	say "You can hear Jessica calling out to Mack from the porch, but you cannot see her spirit from here.";
	stop the action.

The Foyer is a room. "The foyer is [if the time of day is after 5:40 AM and the time of day is before 8:30 PM]warmed by the sun sneaking through[end if][if the time of day is after 8:30 AM and the time of day is before 10:00 PM]dimly lit by the fading sunlight drifting through[end if][if the time of day is after 10:00 PM and the time of day is before 5:40 AM]lit by the moonlight shining through[end if] the small window in the door. At this time of day, the soft glow pools on a painting - a girl on horseback - then spills down the wall to coat the old carved bench in [if the time of day is after 5:40 AM and the time of day is before 10:00 PM]gold[end if][if the time of day is after 10:00 PM and the time of day is before 5:40 AM]silver[end if]. Jon's shoes are tucked neatlqy underneath, his jacket on the coat rack. The braided rug on the floor and the faded red umbrella in the stand are remnants of Mary's efforts at decorating, while the mirror over the small table is purely utilitarian. But its simple, clean lines give the little entryway a sense of quiet grace. The stairs up to the bedrooms face the front door, flanked by a hall leading north to the kitchen. The livingroom and the rest of the house lie to the east."

sizable artwork is scenery in the foyer. The printed name of sizable artwork is "sizable painting". The description of sizable artwork is "The painting is of a small corral where a small girl rides hunched over a small black pony. The sun sets in the background, but the childs smile outshines it."

Section 1b - Inside the Farmhouse

The front door is a closed door. It is north of the Front of the Farmhouse. Through it is the foyer.

The foyer is inside from the Front of the Farmhouse.

[
jessica painting dream is in the foyer. The printed name is "[if jessica is known]Jessica's painting dream, with a [emanating vibe of painting] vibe,". The description is "It's a sunny day on the farm and in the backyard you see a young mother and her daughter running around and laughing. The scene changes to riding lessons with the young girls father, then changes again to numerous breakfasts in the dining room. The dream fades, but leaves sweetness and contentment."
]

The house is a backdrop. It is everywhere.

Understand "enter the house" as entering.
Understand "exit the house" as exiting.

Instead of entering the house while in the Front of the Farmhouse:
	say "You pass through the front door and enter the house...";
	move player to Foyer;
	stop the action.

Instead of going north while in the Front of the Farmhouse:
	say "You pass through the front door and enter the house...";
	move player to Foyer;
	stop the action.

Instead of going inside while in the Front of the Farmhouse:
	say "You pass through the front door and enter the house...";
	move player to Foyer;
	stop the action.

Instead of going outside while in the Foyer:
	say "You pass through the front door and leave the house...";
	move player to Front of Farmhouse;
	stop the action.

Instead of going south while in the Foyer:
	say "You pass through the front door and leave the house...";
	move player to Front of Farmhouse;
	stop the action.

The Living Room is east of the foyer. "The living room is decorated with a variety of tasteful handmade furniture including a well worn sofa, a rocking chair that matches the one on the porch, and brass lamps standing in three corners of the room."

The Dining Room is north of the living room. "The dining room shows signs of neglect with thick layers of dust covering the unused dining room table, china cabinet, and hutch. Even the matching paintings on either side of the north-facing window dimly reflect their hidden beauty."

A dining room table is scenery in the Dining Room. It is a supporter.

Before going north while in the Dining Room:
	say "You pass through wall and window...";
	move player to Backyard;
	stop the action.

Before going up while in the Dining Room:
	say "You pass through the ceiling...";
	move player to Jessica's Bedroom;
	stop the action.

Some paintings are scenery in the Dining Room. The description is "To the left of the window is a young artists rendering of a bowl of fruit and to the right hangs a more subtly developed table of vegetables." Understand "paintings" as the paintings.

The fruit still-life is scenery in the Dining Room.
The printed name of the fruit still-life is "fruit painting".
Understand "painting" as the fruit still-life.
Understand "left painting" as the fruit still-life.
The description of the fruit still-life is "The fruit painting is a rough work clearly rendered by a young artist's hand. Despite the immature skill, it gives off a soft and subtle warmth."

The vegetable still-life is scenery in the Dining Room.
The printed name of the vegetable still-life is "vegetable painting".
Understand "painting" as the vegetable still-life.
Understand "right painting" as the vegetable still-life.
The description of the vegetable still-life is "[The vegetable still-life] is the work of a seasoned artist, providing a mixture of tones and expert lighting."

To Take Paintings:
	say "Normally paintings are hung lightly with the intent that they will be moved occasionally. The fruit and vegetable paintings defy that expectation and were deemed important enough to be fixed permanently to the wall on either side of the window."

Before taking paintings: Take Paintings; stop the action.
Before taking fruit still-life: Take Paintings; stop the action.
Before taking vegetable still-life: Take Paintings; stop the action.

The Lower Hallway is north of the foyer. "The hallway is a remebrance of family and friends. Various photgraphs and paintings line both sides of the hall which sits between the kitchen and the foyer."

The Lower Bathroom is east of the lower hallway. "This is the water closet on the main floor of the house. There is a toilet and a water basin here along with a small rack of magazines."

The Staircase is up from the foyer. "The staircase though carpeted, remains a practical and uncluttered path from the first floor to the second."

PCDirection is a kind of value. the PCDirections are UpTo, DownTo, or DirTo.

Rooms have a PCDirection. It is usually DirTo.

Before going up from the foyer while the foyer is DirTo:
	say "With some confusion you pause. Your intuition tells you that 'up' should take you to the staircase, but you feel the actual effect will be somewhere above where you currently stand. This being the case, you decide to think 'staircase' this time, while knowing that 'up' will take you elsewhere next time.";
	Now the foyer is UpTo;
	move player to staircase;
	stop the action.

Before going up from foyer while the foyer is UpTo:
	say "You rise up and through the second floor, arriving at...";
	move player to master bedroom;
	stop the action.

Understand "staircase" as going to the stairs.
Going to the stairs is an action applying to nothing.

Carry out going to the stairs:
	move player to staircase.

The Upper Hallway is up from the staircase. "The upper hallway provides access to the staircase (down), three separate bedrooms (to the north, west, and south)."

The Master Bedroom is south of the upper hallway. "The master bedroom has a malodorous spirit pervading its space."

The Master Bathroom is west of the master bedroom. "This is the master bathroom."

The Guest Bedroom is west of the upper hallway. "This is the guest bedroom."

Jessica's Bedroom is north of the upper hallway with the printed name "Unnammed Bedroom". "This the bedroom of the troubled spirit found on the porch earlier."

The Kitchen is north of the lower hallway. "The kitchen is adorned as most any other farmhouse. with iron skillets hanging from leather ties hovering over a wooden chopping table, rustic cabinets adorning the outer walls, an icebox and stove, as well as a door leading the the back of the farmhouse."

The Backyard is a room. "This is the backyard."

Before going south from the Backyard:
	say "You pass through window and wall...";
	move player to Dining Room;
	stop the action.

The back door is a closed door. It is north of the Kitchen. Through it is the Backyard.

The Dining Room is east of the Kitchen.

Living Status is a kind of value. The living statuses are alive and dead.
People have a living status.

Mary is an unknown dead woman in the dining room.

The Pantry is west of the kitchen. "The pantry contains shelves filled with various items preserved in jars along with dried goods in boxes."

The Garden is southwest of the backyard. "This is Jessica's garden, which was once her mothers favorite places to be."

The garden is northwest of the front of the farmhouse.

The Cornfield is north of the backyard. The cornfield is west of the backyard.

Jonathon is an unknown man in the cornfield.

Part III - Understanding The Call

Identifying Jessica is a scene.
Identifying Jessica begins when Mack is known.
Identifying Jessica ends when Jessica is known.

Identifying Mary is a scene.
Identifying Mary begins when Mack is known.
Identifying Mary ends when Mary is known.

Identifying Jonathon is a scene.
Identifying Jonathon begins when Mack is known.
Identifying Jonathon ends when Jonathon is known.

Table 1 - Mary's Movements
Current Room		Next Room		Move Time
dining room		living room		1:00 PM
living room		foyer			2:00 PM
foyer			lower hallway		3:00 PM
lower hallway		kitchen			4:00 PM
kitchen			backyard		6:00 PM
backyard		upper hallway		7:00 PM
upper hallway		master bedroom		7:15 PM
master bedroom		jessica's bedroom	11:00 PM
jessica's bedroom	guest bedroom		12:00 AM
guest bedroom		dining room		5:00 AM

Table 2 - Jessica's Movements
Move Number	Current Room		Next Room		Move Time
1		front of the farmhouse	foyer			7:30 AM
2		foyer			lower hallway		7:33 AM
3		lower hallway		kitchen			7:36 AM
4		kitchen			backyard		8:30 AM
5		backyard		kitchen			10:30 AM
6		kitchen			lower hallway		10:45 AM
7		lower hallway		foyer			10:48 AM
8		foyer			living room		10:51 AM
9		living room		foyer			12:24 PM
10		foyer			lower hallway		12:27 PM
11		lower hallway		kitchen			12:30 PM
12		kitchen			backyard		1:30 PM
13		backyard		cornfield			1:35 PM
14		cornfield			backyard		1:55 PM
15		backyard		garden			2:00 PM
16		garden			front of the farmhouse	4:30 PM
17		front of the farmhouse	foyer			5:21 PM
18		foyer			lower hallway		5:26 PM
19		lower hallway		kitchen			5:30 PM
20		kitchen			lower hallway		6:30 PM
21		lower hallway		foyer			6:34 PM
22		foyer			staircase		6:39 PM
23		staircase		upper hallway		6:44 PM
24		upper hallway		jessica's bedroom	6:50 PM
25		jessica's bedroom	upper hallway		5:00 AM
26		upper hallway		guest bedroom		5:05 AM
27		guest bedroom		upper hallway		5:37 AM
28		upper hallway		staircase		5:42 AM
29		staircase		foyer			5:47 AM
30		foyer			lower hallway		5:53 AM
31		lower hallway		kitchen			5:58 AM
32		kitchen			lower hallway		6:55 AM
33		lower hallway		foyer			7:00 AM
34		foyer			front of the farmhouse	7:05 AM

Before doing something to Mary:
	change Mary to inactive;
	change the inactive time limit of mary to 5.

To move Mary:
	if Mary is inactive, change the inactive time limit of Mary to the inactive time limit of Mary minus one;
	if Mary is inactive and the inactive time limit of Mary is zero, change Mary to active;
	if Mary is inactive, stop;
	let Mary's room be the holder of Mary;
	let nextroom be the next room corresponding to a current room of Mary's room in the Table of Mary's Movements;
	let movetime be the move time corresponding to a current room of Mary's room in the Table of Mary's Movements;
	if time of day is after movetime and Mary is visible, say "Mary disappears into thin air...";
	if time of day is after movetime, move Mary to nextroom;
	if time of day is after movetime and Mary is visible, say "Mary appears out of nowhere..."

To move Jessica:
	let Jessica's room be the holder of Jessica;
	let currentmove be the current move of Jessica;
	let movetime be the move time corresponding to a move number of currentmove in the Table of Jessica's Movements;
	let nextroom be the next room corresponding to a move number of currentmove in the Table of Jessica's Movements;
	if the time of day is after movetime begin;
		if the player can see Jessica, say "Jessica leaves for the [nextroom]...";
		move Jessica to nextroom;
		change the current move of Jessica to the current move of Jessica plus one;
		if the current move of Jessica is 35, change the current move of Jessica to 1;
		if the player can see Jessica, say "Jessica arrives from the [jessica's room]...";
	end if.

Every turn:
	move Mary;
	move Jessica.

[	move jonathon.
	move mack.]


Part IV - Apparating

Section - Table of Rooms

Table of Farmhouse Rooms
topic			goal
"front of the farmhouse"	Front of the Farmhouse
"south of the farmhouse"	South of the Farmhouse
"porch"			Front of the Farmhouse
"foyer"			Foyer
"living room"		Living Room
"dining room"		Dining Room
"kitchen"			Kitchen
"pantry"			Pantry
"lower hallway"		Lower Hallway
"upper hallway"		Upper Hallway
"master bedroom"	Master Bedroom
"jessica's bedroom"	Jessica's Bedroom
"guest bedroom"		Guest Bedroom
"backyard"		Backyard
"cornfield"		Cornfield
"garden"			Garden
"lower bathroom"		Lower Bathroom
"master bathroom"	Master Bathroom
"staircase"		Staircase

Section - Setup

Understand "jump to [text]" as apparating to.

Apparating to is an action applying to one topic.

[In case the player types something like JUMP TO DETROIT.]
Carry out apparating to:
     say "Sorry, I didn't quite catch where you wanted to go."

Instead of apparating to a topic listed in the Table of Farmhouse Rooms:
     change the destination to goal entry;
     try apparating vaguely.

Understand ".apparate" as apparating vaguely. [oldskool hackish evil,  
but it does indeed prevent the player from typing this verb  
successfully.]

Apparating vaguely is an action applying to nothing.

Carry out apparating vaguely:
     if the destination is the location, say "You are already in [the  
location]!" instead;
     if the destination is the Backyard begin;
        if the location is the Kitchen, now the Backyard is visited;
        if the location is the Dining Room, now the Backyard is visited;
     end if;
     if the destination is unvisited, say "You have to discover such  
a place, therefore your spirit has no way of apparating there." instead;
     say "You spirit requests passage from the [location] to [the  
destination]. [The destination] accepts your passage and no other  
spirits block your way.";
     move player to the destination.

[This part is imperfect: what we really want is "if the player's  
command *matches* topic entry", so that we will catch only those  
commands and not, for instance, >SEARCH DINING ROOM. But currently if  
I do that I get some kind of runtime crash from Zoom. This does  
*mostly* work, however.]

After reading a command:
     repeat through Table of Farmhouse Rooms
     begin;
         if the player's command includes topic entry
         begin;
             replace the player's command with ".apparate";
             change the destination to goal entry;
         end if;
     end repeat.

Destination is a room that varies.


Understand "dining room" as Apparating to the Dining Room.
Apparating to the Dining Room is an action applying to nothing.

Before Apparating to the Dining Room while Dining Room is known:
	say "You spirit requests passage from the [location] to the Dining Room. The Dining Room accepts your passage and no other spirits block your way.";
	move player to Dining Room;
	stop the action.

Before Apparating to the Dining Room while the Dining Room is unknown:
	say "You have to discover such a place, therefore your spirit has no way of apparating there.";
	stop the action.

Before Apparating to the Dining Room while Mack is unknown:
	say "Although you may assume there is a dining room in the farm house, without knowing for sure you are unable to establish safe passage. Besides, the farmhouse is currently under a strong spiritual protection eminating from the small entity and any such movements are currently impossible.";
	stop the action.

Understand "living room" as Apparating to the Living Room.
Apparating to the Living Room is an action applying to nothing.
Before Apparating to the Living Room while Mack is known:
	say "You spirit requests passage from the [location] to the Living Room. The Living Room accepts your passage and no other spirits block your way.";
	move player to Living Room;
	stop the action.

Before Apparating to the Living Room while Mack is unknown:
	say "The small entity prevents such actions.";
	stop the action.


Part V - Interacting with People

Part VI - Conflicts

Part VII - Epilogue
