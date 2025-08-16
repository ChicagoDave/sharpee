"Reflection" by David Cornelson, with Portals by Roger Carbol

Include Portals by Roger Carbol.
Include Reflections Mirrors by David Cornelson.
Include Basic Screen Effects by Emily Short. 
Include FyreVM Core by David Cornelson.

Chapter Players

Section The Thief

The thief is a man.

The satchel is a container carried by the thief. The description of the satchel is "It's your work bag. Everything you need is always at your fingertips."

A cellphone is a kind of supporter. A cellphone can be on or off. The cellphone is usually off. The description of the cellphone is "It's a generic smartphone with a touchscreen."
Understand "phone" as cellphone.

An iPhone is a cellphone carried by the thief. The description of the iPhone is "It's an Apple iPhone. You use it mostly for work. On the back is your work mirror, encoded with all of your important destinations."

The phone mirror is a small portal. The phone mirror is part of the iPhone. The printed name of the phone mirror is "small mirror". The description of the phone mirror is "It's the most important resource you have. It's your map through all of the mirrors."

Understand "small mirror", "work mirror", and "iphone mirror" as phone mirror.

Instead of taking the phone mirror:
	say "It's securely attached to your phone."

A roll of duct tape is a thing in the satchel. The description of the Duct Tape is "A roll of wide silver tape with many uses, on and off the job."

Taping is an action applying to one visible thing.

Understand "tape [something]" as taping.

Check taping:
	if the noun is a portal:
		say "You place two strips of tape over the mirror forming a large 'X'.";
		now the noun is reach-disabled;
		now the noun is not enterable;
	otherwise:
		if the noun is a person:
			if the noun is the player:
				say "You do need to make less noise, but that might be going too far.";
			otherwise:
				say "You place a large piece of duct tape over [noun]'s mouth.";
		otherwise:
			say "You don't need to tape the [noun].";

An x-acto knife is a thing in the satchel. The description of the x-acto knife is "It's a thin metallic knife you used for many tasks on the job."
The indefinite article is "an".

A headlamp is an unlit wearable thing in the satchel. The description of the headlamp is "It's band that wraps around your head with a lightbulb attached. It's mostly useful for night jobs."

Understand "lamp" and "head lamp" as headlamp.

The headlamp is a device.

Carry out switching on the headlamp: now the noun is lit.
Carry out switching off the headlamp: now the noun is unlit.

To enable the headband:
	if the player is wearing the headlamp:
		say "Your eyes close for a second from the bright light emanating from the headlamp.";
	otherwise:
		say "You switch the headlamp on and a bright light begins to eminate from the bulb.";
	now the headlamp is lit.

Instead of switching on the headlamp:
	enable the headband.

Instead of burning the headlamp:
	enable the headband.

coverall is a wearable thing in the satchel. The description of the coverall is "It's a very thin, bright white, one piece 'suit' similar to those from high-tech clean room facilities. When worn it covers a person from head to toe."

Instead of wearing the coverall:
	if the player is wearing the headlamp:
		say "First you remove the headlamp, then don the coverall, then replace the headlamp over the hood of the coverall.";
	otherwise:
		say "You don the coverall, pulling the hood up over your head, leaving only your eyes exposed.";
		now the player is wearing the coverall.

A remote control is a thing in the satchel. The description of the remote control is "It's a small black rectangle with a single button."

Understand "button" as remote control.

Pressing is an action applying to one thing.

Understand "press [remote control]" as pressing.

[
   Consider the remote is within range of the garage and clicking it works, but you don't know that until you get out to the alley. Consider something bad happens if you open the garage before you're in the alley.
]
Instead of pressing the remote control:
	if the thief is in the alley:
		now the garage-door is unlocked;
		now the garage-door is open;
		say "Clicking the remote opens the garage door, revealing a clean and mostly empty space.";
	otherwise:
		say "You press the button, hear the click, but nothing happens."

Instead of examining the thief:
	if the player is the thief:
		say "Despite passing your middle years, you've retained a younger man's profile. Crows feet decorate a worn look, and a sadness pervades your aura. Even when you smile, people know any real happiness is long passed.";
	if the player is the old man:
		say "As an adversary, he looks fit, capable, and deadly. As a man you're sure he's able to maneuver through any part of society with aplomb. Both observations give you pause and a feeling of deja vu washes over you.";
	if the player is the young woman:
		say "Knowing what you know, he is nothing short of breathtaking. He is everything you imagined he might be and more.".

Section The Girl

The young woman is a woman. The description of the young woman is "Short of your twentieth birthday, you stand tall and at the beginning of your vibrancy. Long black hair pulled perfectly into a mane's tail, tight-fitting clothes for effcient movement, and a clear awareness of your surroundings might lead someone to believe you were a military brat."

Section The Old Man

The old man is a man. The description of the old man is "You're an old man with little to do but hunt down renegades. You hate everyone and everything, but not in an outward way. It simmers...until it is needed."

Chapter Setup

A thing can be known or unknown.
A thing can be broken.
Limbo is a room.

When play begins:
	surreptitiously move the player to limbo;
	move the thief to the rundown bedroom;
	set mirrors as young woman then thief then old man;
	Now the player is the thief.

Saying the magic word is an action applying to nothing. Understand "xyzzy" as saying the magic word.
Report saying the magic word the first time:
	say "A hollow voice says, 'The Blood of the ....' but you just miss the last part before it fades."

Describing the story is an action out of world. Understand "about" as describing the story.
Report describing the story:
	say "Reflection is an old story of mine that I'd put together over the years in my head. In 2014 I joined a couple of friends in the process of developing a short film. I took this idea and finished it as a short screenplay with the hopes that we might choose it for our short film. I eventually backed out of that short-firm group and decided to make it into an IF story, which was my original design anyway. I started laying out the game in May of '14 and mentioned some technical requirements on the #I7 channel on ifMud. Roger Carbol took it upon himself to build one of the major technical pieces based on a small list of requirements. His work is a fundamental reason this work has a high level of systemic symmetry. I then mentioned some other requirements and he of course went off and built those as well. I'm sure whatever system I would have created would have been kludgy and nowhere near as elegant. His help is greatly appreciated and thus his name is next to mine in the creation of this story. As are the following alpha and beta testers."
	
Chapter Locations

Section Prologue

[
	Introduce the thief and the first "talent", sensing, directing, seeing through, and walking through mirrors.
]

When play begins:
	say "In a rundown bedroom, a thief stands before a cheap mirror. He reflects on his lost interest in these little endeavors. Carrying the silver suit he's donned many times, along with the headlamp, reflect quite literally, his demeanor. Buried within his malaise is the certainty that his next step will engender a lethal attempt on his life...
	
	In a brothel in Paris, an old man rages of the past. Every morning he wakes up from the same nightmare; of his only daughter fully grown, murdered by a [italic type]scélérat[roman type], whose death was far too kind. The old man relives, in every contracted murder, the vengeance he sought for the man that stole his only child...
	
	A young woman stands in the corner of a garage nervously waiting, and unsure if her movements will save lives...or destroy them..."

The Rundown Bedroom is a room. The description of the rundown bedroom is "Moldy and filled with garbage, this bedroom is likely not a place of relaxation or life. A cheap mirror leans upright against a wall. [if bedroom-door is open]An open[otherwise]A closed[end if] door stands to the south.[if rundown bedroom is unvisited]

[italic type]'Right. Got it. The client wants the Van Gogh painting 'The Bedroom'. I'll have it within the hour[roman type],' the thief replies to someone on his phone, then ends the call.";

The cheap mirror is a portal in the rundown bedroom. The description of the cheap mirror is "One of those inexpensive mirrors from a big box retailer that flexes like a bow."
The cheap mirror is scenery.

Instead of taking the cheap mirror:
	say "The cheap mirror is firmly nailed to the wall.";

The bedroom-door is a closed and unlocked door. The bedroom-door is south of the rundown bedroom. The bedroom-door is scenery. The printed name of the bedroom-door is "door". Understand "door" as bedroom-door.

The Top of the Stairs is south of the bedroom-door. The description of the Top of the Stairs is "Even filthier than the bedroom, this short hallway has only one direction; down. A steep and not entirely safe narrow staircase leads to the back of the building. A bright light can be seen at the bottom of the stairs."

Section Museum and Paintings

[

The museum has many rooms and many pieces of artwork. The thief must safely get into the museum, evade the guards, and get the correct painting.

The thief must remain disguised at all times.

The thief will need a knife to cut the painting out of its frame.

The thief can't steal the wrong painting.

The thief can't identify the painting with the headlamp on. Turning the headlamp off reveals his identity and the game ends.

The iphone camera acts as a viewer and can locate the correct painting.
  - TURN ON IPHONE CAMERA
  - FIND PAINTING WITH IPHONE CAMERA

The thief must use the camera to cut the painting out as well.
  - CUT OUT PAINTING WITH X-ACTO KNIFE USING IPHONE CAMERA

The security guards will arrive within 5 turns. If they catch the thief, the game ends.
 
]

The Museum is a room. The description of the museum is "Within this gallery of the Art Institute of Chicago is a number of priceless paintings by Van Gogh and Paul Gauguin. Ceiling-mounted video cameras watch every movement within. Sirens have begun to blast throughout the closed museum."



Stolen Art is a scene. Stolen Art begins when the player is in the museum and the frame is filled. Stolen Art ends when the player has the goods and the player is in the rundown bedroom.

To decide if the player has the goods:
	if the player is carrying the bedroom-painting:
		decide yes;
	if the player is carrying the satchel and the bedroom-painting is in the satchel:
		decide yes;
	decide no.

Every turn during Stolen Art:
	repeat through the Table of Security Guards: 
		say "[event description entry][paragraph break]";
		if the status entry is 1:
			end the story;
		blank out the whole row;
		stop. 	

Table of Security Guards
event description	status
"In the distance, you hear steel gates descend at every door, trapping any intruder inside. Eventually the one entrance to this gallery is blocked. You roll your eyes and continue working."	0
"High beam lights shine down on you from the ceiling and a voice can be heard over an intercom, 'Intruder! You are trapped in Gallery 241. You cannot escape. We do not wish to harm you, but armed security is on its way. Please lay down on the floor face-down and no harm will come to you!"	0
"Sir. Lay down!"	0
"You hear security guards coming close to the door. They knock. This door will open in 30 seconds. Lay face down and no harm will come to you!"	0
"The steel gate begins to rise. A gas cannister rolls in and explodes, bringing you to tears."	0
"The gate is up and the guards grab you. 'The game is up thief. No one steals art from our museum!'"	1

A painting-frame is a kind of thing. A painting-frame can be filled or empty. A painting-frame is usually filled.

The frame is a painting-frame in the museum. It is scenery.

A work of art is a kind of thing. A work of art can be found or not found. A work of art is usually not found. A work of art can be targeted or untargeted. A work of art is usually untargeted. Understand "painting" as a work of art.

The Terrace-Painting is an untargeted work of art in the museum. The Terrace-Painting is scenery. The printed name of the Terrace-Painting is "painting titled, 'The Terrace and Observation Deck at the Moulin de Blute-Fin, Montmartre'".  The description of the Terrace-Painting is "The plaque underneath the painting 'The Terrace and Observation Deck at the Moulin de Blute-Fin, Montmartre' reads, '[italic type]This painting dates from the winter of 1887, roughly a year after Vincent van Gogh arrived in Paris to join his brother, the art dealer Theo van Gogh. It is one of a group of landscapes featuring the Butte Montmartre, a short climb from the apartment on the rue Lepic where Vincent and Theo lived. Montmartre was dotted with reminders of its quickly receding rural past—abandoned quarries, kitchen gardens, and three surviving windmills, including the Moulin de Blute-Fin. The nonfunctional mill had become a tourist attraction, affording spectacular panoramic views over Paris from the observation tower erected beside it.[roman type]'";

Understand "Terrace" or "Observation Deck" or "Moulin de Blute-Fin" or "Montmartre" as the Terrace-Painting.

A cellphone can be viewed or unviewed. A cellphone is usually unviewed.

Using the iphone camera is an action applying to one thing.
Understand "use [cellphone]" as using the iphone camera.
Understand "use [cellphone] camera" as using the iphone camera.
Understand "turn on [cellphone]" or "turn on [cellphone] camera" or "turn [cellphone] camera on" as using the iphone camera.

Instead of using the iphone camera:
	if the iphone is viewed:
		say "You're already looking through the iPhone camera. All of the paintings are clearly identifiable.";
		stop the action;
	otherwise:
		now the iphone is viewed;
		say "You are now viewing the gallery through the iPhone camera. Each of the paintings comes into stark relief. You have always been moved by such things.";
		stop the action.

The paintings are in the museum. They are scenery.
Understand "vincent" or "van gogh" or "paul" or "gauguin" or "paul" or "serusier" or "adolphe" or "joseph" or "thomas" or "monticelli" or "emile" or "bernard" as paintings.

Instead of examining or searching or taking the paintings:
	if the iphone is unviewed:
		say "There are a number of Van Gogh and Gauguin paintings in this gallery. You're only interested in 'The Bedroom' by Van Gogh. This is the item your client has asked you to procure. Although you know what is here and can make out vague details, the headlamp prevents you from identifying any particular painting.";
		stop the action;
	otherwise:
		say "(looking through your iPhone) You can see several Van Gogh paintings, a couple by  Paul Guaguin, one Paul Sérusier, an Adolphe-Joseph-Thomas Monticelli, and an Emile Bernard.";
		stop the action.

Instead of taking a work of art when the player is in the museum:
	say "It's hard to tell the paintings apart with the headlamp glaring in front of you.";
	stop the action.

The Bedroom-Painting is a targeted work of art. The Bedroom-Painting is a part of the frame. The description of The Bedroom-Painting is "The plaque underneath the painting 'The Bedroom' reads, '[italic type]Vincent van Gogh's three versions of this composition are the only record he made of the interior of the Yellow House, where he lived while he was in Arles in the south of France. The house embodied the artist's dream of a 'Studio of the South,' a community of like-minded artists working in harmony to create art for the future. The first version of The Bedroom (Van Gogh Museum, Amsterdam) was one of the paintings Van Gogh made to decorate the house in anticipation of the arrival of his first guest, Paul Gauguin. 'It's just simply my bedroom,' he wrote, 'only here color is to do everything ... to be suggestive here of rest or of sleep in general. In a word, looking at the picture ought to rest the brain, or rather the imagination.' Gauguin's stay at the Yellow House would be fraught with tension: after two months, Van Gogh's self-mutilation and Gauguin's flight back to Paris ended the Studio of the South. Van Gogh made this second version of The Bedroom about a year after the first, while he was living at an asylum in Saint-Rémy.[roman type]'"

The printed name of The Bedroom-Painting is "painting titled, 'The Bedroom'".
Understand "bedroom" as the bedroom-painting.

Trimming is an action applying to two things.
Understand "cut out [something] with [something]" as trimming.
Understand "cut [something] out with [something]" as trimming.
Understand "cut out [something] with [something] using the iphone camera" as trimming.
Understand "cut out [something] with [something] using the iphone" as trimming.
Understand "cut out [something] with [something] using iphone" as trimming.

Instead of cutting the Bedroom-Painting:
	say "Cutting such a magnificent piece of artwork is beyond even your depravity.";
	stop the action.

Check trimming:	
	if the second noun is not the x-acto knife:
		say "You don't have a cutting tool.";
		stop the action;
	if the noun is not Bedroom-Painting:
		say "You can't cut that out!";
		stop the action;
	if the iphone is unviewed:
		say "Your headlamp blurs the artwork and you can't discern which painting to purloin.";
		stop the action.
	
Carry out trimming:
	if the player has the x-acto knife or the x-acto knife is in the satchel:
		if the frame is filled:
			say "You carefully cut the edges of the painting out of the frame, roll it up and place it in your satchel.";
			now the description of the frame is "It's empty.";
			now the description of the Bedroom-Painting is "It's the rolled up work of Van Gogh entitled, 'The Bedroom'.";
			now the printed name of the Bedroom-Painting is "rolled up painting";
			now the frame is empty;
			now the Bedroom-Painting is in the satchel;
			stop the action;
		otherwise:
			say "The frame is empty.";
			stop the action.

Rule for clarifying the parser's choice of the bedroom-painting: say ""; 

Does the player mean examining the rundown bedroom while the bedroom-painting is a part of the frame: It is unlikely.
Does the player mean examining bedroom-painting while the bedroom-painting is a part of the frame: It is very likely.

Does the player mean trimming the rundown bedroom: It is very unlikely.
Does the player mean trimming the bedroom-painting: It is very likely.

Instead of taking the Bedroom-Painting when the frame is filled:
	say "It's firmly sealed inside the sturdy frame.";
	stop the action.

Instead of examining the bedroom:
	say "Your brain does a little dance for a second considering both the rundown bedroom you can see through the mirror and the Van Gogh painting, but settles on the painting. Through your iPhone, you see The Bedroom and read the description of it from a nearby plaque...";
	try examining bedroom-painting;
	stop the action.
		
The ornate mirror is a portal in the museum. It is scenery. The description of the ornate mirror is "A massive construct, gaudy himself would have shuddered at its garish zeal for reflection."

After going to the museum:
	if the player is not wearing the coverall:
		if the player is wearing the headlamp:
			if the headlamp is lit:
				say "Although the bright light from the headlamp coceals most of your face, a scar below your left ear is evidence enough for the authorities to pick you up. While sitting in the holding cell, a very large inmate comes back from his one phone call and proceeds to quietly strangle you.";
				end the story saying "You have died.";
				stop the action;
			otherwise:
				say "With brilliant, if unintentional style, you emerge into the museum with an unlit headlamp on your head and nothing to prevent the video cameras from recording your escapade. This leads to your inevitable capture and incarceration. While sitting in the holding cell, a very large inmate comes back from his one phone call and 'accidentally' trips into you, crushing your skull againt the exposed toilet. (not a very stylish way to go one might note)";
				end the story saying "You have died.";
				stop the action;
		otherwise:
			say "Without a disguise, the video cameras record your face quite clearly. This leads to your inevitable capture and incarceration. While sitting in the holding cell, a very large inmate comes back from his one phone call and proceeds to break your neck.";
			end the story saying "You have died.";
			stop the action;
	if the player is not wearing the headlamp:
		say "Although the coverall prevents the video cameras from noting what clothes you're wearing, it does not prevent a detailed record of your face. This leads to your inevitable capture and incarceration. While sitting in the holding cell, a very large inmate comes back from his one phone call and proceeds to break your neck.";
		end the story saying "You have died.";
		stop the action;
	otherwise:
		if the headlamp is unlit:
			say "With brilliant, if unintentional style, you emerge into the museum with an unlit headlamp on your head and nothing to prevent the video cameras from recording your escapade. This leads to your inevitable capture and incarceration. While sitting in the holding cell, a very large inmate comes back from his one phone call and 'accidentally' trips into you, crushing your skull againt the exposed toilet. (not a very stylish way to go one might note)";
			end the story saying "You have died.";
		otherwise:
			say "You arrive in the museum safely disguised from the cameras.[line break]";
			try looking;

The cheap mirror connects to the ornate mirror.
The cheap mirror directs to the ornate mirror.

The Alley is down from the Top of the Stairs. The description of the alley is "An empty alley between a row of rundown brownstones and a row of even more dilapidated structures. The garage in front of you is well-known."

The Top of the Stairs is east of the alley.

To warn about the neighborhood:
	say "You could walk through the neighborhood, but survival would be questionable. You picked this neighborhood specifically for it's lack of eyes and ears, however it does have knives and guns."
	
Instead of going nowhere from the alley, warn about the neighborhood.
Instead of going east from the alley:
	say "You have a deadline. The painting should be secured immediately."

The garage-door is a closed and locked door. It is scenery. The alley is east of the garage-door. The printed name of the garage-door is "garage door".

The Garage is west of the garage-door. The description of the garage is "The garage is clean and relatively neat. A paint infused tarp covers a large rectangular object leaning against a wall."

A painted tarp is in the garage. It is scenery. The description of the painted tarp is "Upon closer inspection, the tarp is a drop cloth used to protect valuable items and floors when painting a room. Oddly, the paint is a mixture of colors not generally seen on interior (or exterior) walls."

A large picture mirror is a portal in the garage. It is scenery. The description of the large picture mirror is "Pulling the tarp up and taking a longer look at the mirror reveals a relatively plain, yet large mirror. The border is stainless steel with small flowers for docrations at the corners."

The large picture mirror is unknown.

Instead of taking the painted tarp:
	say "The tarp seems to be permanently attached to the [if large picture mirror is known]large picture mirror[otherwise]object underneath[end if].";
	now the large picture mirror is known.
	
Instead of looking under the painted tarp:
	if the large picture mirror is unknown:
		say "Looking under the tarp reveals a large picture mirror.";
		now the large picture mirror is known;
	otherwise:
		say "You look under the tarp to verify that the large picture mirror is still there and in one piece."

Section The Thief at Home

Your Bedroom is a room. "[if the player is the thief]Your[otherwise]The thief's[end if] bedroom [if the player is the thief]for the last few years [end if]is stylishly decorated with a king sized bed as the centerpiece. A dressing mirror stands in one corner, with a night stand on either side of the headboard. A closet and bathroom to the west serve their usual purposes, while an open door leads to a larger area in the apartment.[if the player is the thief] The window to the east displays your coveted view of Lake Michigan and downtown Chicago.[end if]"

Before printing the name of your bedroom:
	if the player is the thief:
		now the printed name of Your Bedroom is "Your Bedroom";
	otherwise:
		now the printed name of Your Bedroom is "The Thief's Bedroom".

The dressing mirror is a portal in your bedroom. It is scenery. The description of the dressing mirror is "[if the player is the thief]This is a gorgeous victorian era Cheval dressing mirror framed in beveled Mahogany stands six feet in height and is one of your prize posessions. A gift from your partner, it's been your primary entrance for many years.[otherwise]It is a very expensive mirror. You were never into such frivolities, but its purpose is undeniably useful.[end if]"

The large picture mirror connects to the dressing mirror.
The large mirror directs to the dressing mirror.

The bed is a supporter in Your Bedroom. It is scenery. The description of the bed is "King size and very comfortable."

Before going north from your bedroom the first time:
	now the coverall is in the satchel;
	now the headlamp is in the satchel;
	now the satchel is in your bedroom;
	now the bedroom-painting is on the bed;
	say "You drop the satchel on the floor and throw the painting on your bed before heading to the living room."

Your Living Room is north of your bedroom. "The living room is practical and tastefully decorated, an extension of the way you dress. A large television adorns the south wall while a floor to ceiling window looks out on Lake Michigan. A kitchen area is located on the opposite of a countertop island."

Before going south from your living room:
	say "As you walk into your bedroom, an old man appears through [italic type]your mirror[roman type]. Before you can react, a dagger flies out of his hand and catches you square in the throat.
	
	[bold type]Your Bedroom[roman type][line break]As you lay dying on your own bedroom floor, the old man recgnizes you and cries, 'You!. You should not die so easily!' He sits on the bed and stares at you.  Your breathe rasping, you whisper, 'I buried her, but I did not kill her.'
	
	'You buried her?', the old man kneels down. 'You buried her how?'
	
	Your breathing is rattled and bloody. You grab the arm of the old man and try to whisper something, but the wound in your throat is too grevious. Your grip slips, your vision fades...
			
	[bold type]Garage[roman type][line break]A young woman holds her hand against the mirror where the scene of your death takes place. As the scene fades, the young woman buckles and whispers something only she understands.[roman type]";
	end the story.

Before printing the name of Your Living Room:
	if the player is the thief:
		now the printed name of Your Living Room is "Your Living Room";
	otherwise:
		now the printed name of Your Living Room is "The Thief's Living Room";

The Kitchen is north of your living room. "The kitchen is utilitarian with a standard gas stove, a regfrigerator, and countertop that separates the living room."

Section Scene II - The Old Man and The Girl

[
	In this scene, the player character switches to an old man in a brothel (in Paris). It opens with him sensing the movement of the thief, someone he has recently started tracking. The old man is a hit man of sorts. He kills stray talent and does it out of anger. An anger with roots in the past and relevence to his future.
	
	He can chase the thief immediately, but might have more incentive if he visits the bar first. A phone call will make a specific request...that being the return of the stolen painting.

	The scene switches to the perspective of a young woman, who is also tracking the thief and is oddly happy to discover the old man.
]

After going to the kitchen for the first time:
	say "You walk into your kitchen and begin to wind down from your excursions....";
	move the old man to the small bedroom;
	now the player is the old man;
	center "*    *    *    * ";
	say "	
	
	[italic type]As the thief relaxes in his kitchen, an old man looks into the bedroom recently occupied by said thief. He mumbles to himself, 'Who are you mister thief and where did you get such powers?'[roman type][line break]";

Small Bedroom is a room.  "You're in a very small bedroom with space for nothing but a full sized bed. A beeded doorway leads south to a hallway. A simple mirror takes up a large portion of the west wall. Clearly this room has a rather [italic type]singular[roman type] purpose, with a mirrored ceiling, a lack of adornment, and the smell of sweat."

The simple mirror is a portal in the small bedroom.
The simple mirror connects to the dressing mirror.

Before going south when the thief is in the kitchen and the player has visited your bedroom:
	now the large mirror directs to nothing;
	now the simple mirror directs to the dressing mirror;
	say "Your target is through the mirror. No time to waste.";
	stop the action.

The Hallway is south of the small bedroom. "This is the west end of the hallway, which leads past several similar doorways to a small staircase on the east end."

The Front is east of The Hallway. "This is the 'front' of the bordello, looking very much like a small pub. A short bar stands to one side with a handful of stools partially occupied by a couple of decorously annointed women. A glass door leads to the street which you recognize as a section of Pigalle, Paris."

The Madame is a women in The Front. The description of The Madame is "Madame DuBois is the owner and operator of this fine establishment. She's also thirty-six years your wife. Currently she's standing behind the bar chatting with the women."

Stealing Artwork is a scene.
Stealing Artwork begins when the old man is the player and the player is in Your Bedroom.
Stealing Artwork ends when the old man is in the garage and the player has the Bedroom-Painting.

Instead of going to Your Living Room when the player is the old man:
	Say "You hear the thief cooking dinner in the kitchen, and balk at a confrontation."
	
Instead of taking the satchel when the player is the old man:
	Say "The thief's tool bag holds no interest for you."

Section Scene III - The Chase

Section Scene IV - The Setup

Section Scene V - The Place Pigalle

Section Scene VI - The Trap

Section Scene VII - The Revelation

Section Scene VIII - The Reconciliation

Section Scene IX - Epilogue

Section Tests

test theft with "wear coverall / wear headlamp / turn headlamp on / walk through mirror / turn iphone camera on / cut out bedroom with knife / walk through mirror / turn iphone camera off / turn headlamp off / remove headlamp / remove coverall / south / west / press button / west / look under tarp / walk through mirror / north".

test prologue with "south / down / press button / west / examine tarp / look under tarp / look under tarp / examine mirror / walk through mirror / north  / examine me / north".

Chapter Z - Design

[

Moldy and filled with garbage, this bedroom is likely not a place of relaxation or even living. A cheap, tall mirror, like the ones you buy at the convenience hardware store, is leaning against the wall. A closed/open door stands to the south.

> x mirror
It's a thin, flexible mirror about your height and width.

> bend mirror
> get mirror
> move mirror
> turn mirror
> flip mirror
> break mirror
> cover mirror
> lay mirror on floor

> touch mirror
The mirror currently shows a room in a museum from an elevated position. You can feel several more mirrors nearby and of course remember the signature of dozens of mirrors.

> list mirrors
Do you mean nearby or remembered?

> list nearby mirrors
You sense three mirrors:
  - a small gold-framed mirror currently dark
  - a very large mirror on a wall in a pawn shop currently showing jewelry-filled glass cases, a few guitars, and an LCD TV
  - a dresser mirror in an empty bedroom similar to the one you're standing in. The bedroom contains a bed with a large man watching TV and eating take-out chinese food
 
> list remembered mirrors
There are too many to recall at once, but you have the important ones connected to the small mirror in your left jacket pocket.

> i
You are carrying:
 - a small rectangular mirror about the size of your palm.
 
 > touch small mirror
 You graze your hand across the mirror and remember other mirrors, including:
  - a very large mirror currently dark, but accessible for transport
  - an oval dressing mirror showing a tastefully furnished bedroom, well lit and accessible. You know this as your own apartment
  - a silver-bordered dressing mirror on a door in a hotel room, currenlty accessible
  - a plain dressing mirror showing a very small, disheveled bedroom with a scantily clad lady smoking on the bed, currently accessible

> direct mirror to mirror
It's not working. You know you need to concentrate on both the local and distant mirror's exact description to use your power.

> direct thin mirror to oval dressing mirror
Done. The thin, flexible mirror now shows your bedroom.

> go through mirror, walk through mirror, jump through mirror, dive through mirror
You feel a familiar tingling sensation, an emination of power from within, as you transport to your bedroom...

You step softly into.../You land roughly in.../You tumble into...

Your Apartment (Bedroom)
Your bedroom is tastefully decorated with contemporary furniture, a king-sized bed, a wide dresser, and of course the oval-shaped dressing mirror. A bathroom is to the south and the living area is to the west. The entire eastern wall is a floor to ceiling window showing the downtown Chicago city-scape.

Scene 1 - The Museum - PC is Thief					completed
Scene 2 - The Old Man and The Girl - PC is Old Man
Scene 3 - The Apartment - PC is Thief
Scene 4 - Department Store - PC is Old Man
Scene 5 - Bank Vault - PC is Theif or Old Man
Scene 6 - Paris Bordello - PC is Young Man
Scene 7 - Hotel Room - PC is Thief
Scene 8 - Second Hotel Room - PC is Old Man
Scene 9 - Bordello Bedroom - PC is Girl
Scene 10 - Hotel Room - PC is Thief

Tasks
- build mirror system - thanks Roger!
- build PC characters - mostly done
- flesh out map
- outline each scene
- second pass each scene with detail
- third pass each scene to add alternate paths
- fourth pass over game to repair continuity
- fifth pass regression test

]
