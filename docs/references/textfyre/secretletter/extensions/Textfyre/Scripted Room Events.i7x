Scripted Room Events by Textfyre begins here.

Use authorial modesty.
Include Scripted Events by Textfyre.

A room has a list of objects called the room-script.
The room-script of a room is usually {}.

Definition: a room is scripted:
	decide on whether or not the number of entries in the room-script of the location is not 0;

Every turn when the location is a scripted room:
	fire the next event in the room-script of the location;
	unless the number of entries in the room-script of the location is 0:
		remove entry 1 from the room-script of the location;

Scripted Room Events ends here.
