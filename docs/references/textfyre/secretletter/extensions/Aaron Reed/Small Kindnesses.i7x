Version 5 of Small Kindnesses by Aaron Reed begins here.

"Provides a number of small interface improvements for players, understanding commands like GO BACK and GET IN, automatically getting off enclosables before moving, responding to vague movement commands when there is only one sensible option, and more."

[Changelog:
 -- Version 5: Implemented some minor changes based on Sand-dancer feedback: for instance, wording on failure message for "use" changed to be more explicit what the player should do differently.
 -- Version 4: Updated to remove deprecated features.
 -- Version 3: Removed several sections incorporated into build 6859, including "Automatically leave enterables before going," "Describe contents of containers / supporters", "Understand Get Down as exiting", "Understand Get In as vague entering," as well as several sections that are better handled by other extensions (mention of which was added to the documentation). Also made rules more precise and modified them to use standard library messages whenever possible.
 -- Version 2: fixed a bug where containers/supporters without descriptions showed their contents twice; made the exits lister fail in darkness; added "Allow for switching things in darkness"; added "Prepositionless alternatives."; improved automatically taking indirectly held things to allow for locking/unlocking; removed "Describe contents of containers/supporters."]

Chapter - Exit leaves when there's only one way to go

[If a room only has a single exit, typing EXIT should use it. This extends the functionality in Emily Short's Modified Exit, which is already overriding the Standard Rules here. (Emily does bring up the objection, not addressed here, of whether this behavior makes sense when the only possible direction to go is IN.)]

Check an actor exiting (this is the small kindnesses exit leaves when there's only one way to go rule):
	let the local room be the location of the actor;
	if the container exited from is the local room:
		if the actor is the player and the number of adjacent rooms is 1:
			let way be best route from location to a random adjacent room, using even locked doors;
			if way is a direction, convert to the going action on way;
		otherwise if the room-or-door outside from the local room is not nothing:
			convert to the going action on the outside.

Section A (for use with Modified Exit by Emily Short)

The small kindnesses exit leaves when there's only one way to go rule is listed instead of the new convert exit into go out rule in the check exiting rules.

Section B (for use without Modified Exit by Emily Short)

The small kindnesses exit leaves when there's only one way to go rule is listed instead of the convert exit into go out rule in the check exiting rules.


Chapter - Go Back returns to previous location

[Based on "Polarity" in I7 docs; keeps track of the player's prior location and understands GO BACK and synonyms as attempting to return.]

The small kindnesses former location is a room that varies.

First carry out going rule (this is the store small kindnesses former location rule): 
    now the small kindnesses former location is the location.

Understand "go back" as retreating. Understand "back" or "return" or "retreat" as retreating.

Retreating is an action applying to nothing.

Carry out retreating (this is the small kindnesses carry out retreating rule):
	let way be the best route from the location to the small kindnesses former location, using even locked doors; 
    if way is a direction, try going way; 
    otherwise say "You can't see an open way back."


Chapter - Automatically leave containers before going (for use without Implicit Actions by Eric Eve)

[Based on the "Hagia Sophia" example in the Inform docs. Tries to get off/out of a supporter/container before movement.]

Before going somewhere when the player is in a container (called the platform) (this is the small kindnesses automatically get out of containers before going rule): 
	say "(first getting out of [the platform])[line break]"; 
	silently try getting off the platform. 

Instead of going nowhere when the player is in a container (this is the small kindnesses don't get out of containers automatically when nowhere to go rule): 
    say "You can't go that way."



Chapter - Show valid directions after going nowhere

[Based on the "Bumping into Walls" example. Tell players trying to move invalidly which directions are open.]

Definition: a direction is viable if the room it from the location is a room. 

Instead of going nowhere (this is the small kindnesses reporting on exits rule):
	if in darkness, say "You can't see which way to go in this darkness." instead; 
	let count of exits be the number of viable directions;
	issue library message going action number 2 for the room gone from;
	if the count of exits is 0, say "[line break]In fact, you can't see any obvious exits." instead; 
	if the count of exits is 1, say "[line break]From here, the only way out is to [a list of viable directions]."; 
	otherwise say "[line break]From here, you can go [list of viable directions]."

Chapter - Allow for switching things in darkness

[If the player switches off something providing light and not held, allow them to switch it back on again. ]

Definition: a thing is switchable: if it provides the property switched on, yes.

After deciding the scope of the player when in darkness (this is the allow for switching things in darkness rule):
	repeat with machine running through switchable things enclosed by location:
		unless the holder of machine is a closed opaque container and the holder of machine is not the holder of player, place machine in scope.


Chapter - Don't perform implicit actions for doomed tasks

[Inspired by (but implemented differently from) the "Delicious, Delicious Rocks" example. Don't bother to try automatically taking something as a result of an EAT or WEAR command that can't possible work (because the noun isn't eatable or wearable).]

Before eating an inedible thing (this is the small kindnesses don't implicitly take inedibles rule): 
	stop the action with library message eating action number 1 for the noun.

Before wearing a not wearable thing (this is the small kindnesses don't implicitly take unwearables rule):
	stop the action with library message wearing action number 1 for the noun. 

Chapter - Implement Use verb for common actions

[Based on "Alpaca Farm" in the I7 docs. Does the most obvious action if the player tries to USE something.]

Understand "use [an edible thing]" as eating. 

Understand "use [a wearable thing]" as wearing. 

Understand "use [a closed openable container]" as opening. Understand "use [an open openable container]" as closing. 

Understand "use [something preferably held] on [a locked lockable thing]" as unlocking it with (with nouns reversed). Understand "use [something preferably held] on [an unlocked lockable thing]" as locking it with (with nouns reversed). 

Understand "use [a switched off device]" as switching on. [We don't have the reverse, since typically something that's switched on has a more useful function which USE might refer to.]

Understand "use [something]" as using. Using is an action applying to one thing. Carry out using: say "You'll have to try a more specific verb than use." 

Understand "use [a door]" as opening. Understand "use [an open door]" as entering. 

Chapter - Prepositionless Alternatives

[This makes some commonly used but normally not understood command forms work as expected.]

Understand "sit [something]" as entering.
Understand "listen [something]" as listening to.



Small Kindnesses ends here.

---- DOCUMENTATION ----

Players often stumble on minor annoyances in the standard behavior of an Inform game. Many of these have been "fixed" over and over again by individual authors. This extension packages up a number of these small kindnesses, many taken from examples in the Inform 7 documentation, to make things a little easier for your players.

This extension is designed to play well and overlap as little as possible with several similar extensions. Anyone including this extension should highly consider also using Modified Exit by Emily Short, Locksmith by Emily Short, Extended Grammar by Aaron Reed, and Implicit Actions by Eric Eve. It borrows a few pieces of functionality from these extensions, in case of compiling for a small platform. This extension should function well with or without any of these. 

Also note that the shortcut actions defined here are not meant for use by actors other than the player.

Simply including the extension is all that is needed, unless you wish to remove some of the behaviors. To remove one, replace the section title with a blank or modified bit in your code (see "Extensions can interact with other extensions" in the docs). For example, if you don't want the implementation of a "use" verb:

	Chapter - No use verb (in place of Chapter - Implement Use verb for common actions in Small Kindnesses by Aaron Reed) 

Here are the names of all the sections.

	Chapter - Exit leaves when there's only one way to go
	Chapter - Go Back returns to previous location
	Chapter - Automatically leave containers before going
	Chapter - Show valid directions after going nowhere
	Chapter - Allow for switching things in darkness
	Chapter - Don't perform implicit actions for doomed tasks
	Chapter - Implement Use verb for common actions
	Chapter - Prepositionless Alternatives
	Chapter - Exiting Through Something

Example: * Checkup - A small example illustrating the extension's functionality.

	*: "Checkup"

	Include Small Kindnesses by Aaron Reed.

	Sidewalk is a room. The Waiting Room is inside from Sidewalk. The Dentist's Office is east of Waiting Room. A reclined chair is a fixed in place enterable supporter in Office. "You see a comfy chair here." The player wears a backpack. The backpack is open and openable. In the backpack is a magazine.    

	Test me with "in / e / exit / n / e / get in chair / w / go back / eat chair / sit on chair / use backpack". 
