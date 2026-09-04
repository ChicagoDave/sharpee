Version 5/071110 of WhoWhat by David Cornelson begins here.

Include Punctuation Removal by Emily Short.

After reading a command:
	remove stray punctuation.

Understand "who is/are/am [text]" as identifying people.
Understand "what is/are/am [text]" as identifying things.
Understand "who is/are the [text]" as identifying people.
Understand "what is/are the [text]" as identifying things.
Understand "am i a/an [text]" as identifying yourself.
Understand "am i [text]" as identifying yourself.

Identifying people is an action applying to one topic.
Identifying things is an action applying to one topic.
Identifying yourself is an action applying to one topic.

Carry out identifying people:
	say "Who?".

Carry out identifying things:
	say "What?".

Carry out identifying yourself:
	say "Only you can answer that.".

The People Identity Table is a table-name that varies. The People Identity Table is the Table of Blank People Identities.
The Thing Identity Table is a table-name that varies. The Thing Identity Table is the Table of Blank Thing Identities.
The Player Character Identity table is a table-name that varies. The Player Character Identity Table is the Table of Blank Player Character Identities.

Instead of identifying people a topic listed in the People Identity Table:
	say "[response entry][paragraph break]".

Instead of identifying things a topic listed in the Thing Identity Table:
	say "[response entry][paragraph break]".	

Instead of identifying yourself a topic listed in the Player Character Identity Table:
	say "[response entry][paragraph break]".	

Table of Blank People Identities
Topic		Response
text		text

Table of Blank Thing Identities
Topic		Response
text		text

Table of Blank Player Character Identities
Topic		Response
text		text

WhoWhat ends here.

---- DOCUMENTATION ----

This extension allows the player to ask who and what things or people are within the game.

The extension uses two tables, which are blank by default and can be reset by the author. The table names are People Identity Table and Thing Identity Table. When you create your tables, set these values to the names of your tables. Your tables will require Topic and Response columns, both of which are text.

Player Usage:

	Who is floyd?
	What is floyd?
	Who is the thief?
	What is the thief?
	Am I a girl?
	Am I pretty?

Example: ** InfoLand - Example of asking who and what a couple of things are in a game.

	"InfoLand"

	Include WhoWhat by David Cornelson.

	Infoland is a room. "You are in a familiar land with lots of familiar things. You can see Floyd here and a thief."

	When play begins:
		now the People Identity Table is the Table of People Identities;
		now the Thing Identity Table is the Table of Thing Identities;
		now the Player Character Identity Table is the Table of Player Character Identities.

	Table of People Identities
	Topic				Response
	"floyd/robot"			"He is your friend."
	"thief/stranger"		"You don't know the stranger, 	but he looks very suspicious."

	Table of Thing Identities
	Topic				Response
	"floyd/robot"		"Floyd is a robot."
	"thief/stranger"		"He seems to be a thief."

	Table of Player Character Identities
	Topic				Response
	"girl"			"So it would seem, although you'd prefer a few more curves."
	"pretty"			"You hide it well."

	Test me with "who is floyd? / what is floyd? / who is the thief? / what is the thief? / am i girl? / am i pretty? ".

