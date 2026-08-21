Textfyre Standard Backdrops by Textfyre begins here.

"An extension providing standard floors, ceilings, walls, and sky."

Include Textfyre Standard Rules by Textfyre.

A room can be interior or exterior. A room is usually interior.
A room can be grounded or aerial. A room is usually grounded.
A room can be ceilinged or unceilinged.
An interior room is usually ceilinged.
An exterior room is usually unceilinged.

The circadia is a kind of value. The circadias are defined by the table of times of day.

The present moment is a circadia that varies.
The present moment is day.

Table of times of day
circadia		sunlight		moonlight
day		true		false
night		false		true

Atmospheric condition is a kind of value. The atmospheric conditions are defined by the table of atmospheric conditions.

The weather is an atmospheric condition that varies. The weather is clear skies.

Table of atmospheric conditions
atmospheric condition
clear skies
cloudy skies

The backdrop-floor is a privately-named backdrop. The backdrop-floor is everywhere. The printed name of the backdrop-floor is "floor".
Understand "floor", "ground" as the backdrop-floor when the location is grounded.

Instead of putting something on the backdrop-floor:
	try dropping the noun;

First check removing something from the backdrop-floor when the noun is not fixed in place:
	now the noun is in the location;
	try taking the noun instead.

Check facing down towards nothing when the location is grounded and the player can see the backdrop-floor (this is the convert looking down at nothing into examining the floor rule):
	try examining the backdrop-floor instead;

The backdrop-ceiling is a privately-named backdrop. The backdrop-ceiling is everywhere. The printed name of the backdrop-ceiling is "ceiling".
Understand "ceiling" as the backdrop-ceiling when the location is ceilinged.

Check facing up towards nothing when the location is ceilinged and the player can see the backdrop-ceiling (this is the convert looking up at nothing into examining the ceiling rule):
	try examining the backdrop-ceiling instead;

Some backdrop-walls are a privately-named backdrop. The backdrop-walls are everywhere. The printed name of the backdrop-walls is "walls".
Understand "walls", "wall" as the backdrop-walls when the location is interior.

The backdrop-sky is a privately-named backdrop. The backdrop-sky is everywhere. The printed name of the backdrop-sky is "sky".
Understand "sky" as the backdrop-sky when the location is exterior.

Check facing up towards nothing when the location is exterior and the location is unceilinged and the player can see the backdrop-sky (this is the convert looking up at nothing into examining the sky rule):
	try examining the backdrop-sky instead;

The backdrop-sun is privately-named, scenery. The backdrop-sun is part of the backdrop-sky. The printed name of the backdrop-sun is "sun".
Understand "sun" as the backdrop-sun when the location is exterior and the weather is clear skies and the sunlight of the present moment is true.

The backdrop-moon is privately-named, scenery. The backdrop-moon is part of the backdrop-sky. The printed name of the backdrop-moon is "moon".
Understand "moon" as the backdrop-moon when the location is exterior and the moonlight of the present moment is true.

Some backdrop-clouds are privately-named, scenery. The backdrop-clouds are part of the backdrop-sky. The printed name of the backdrop-clouds is "clouds".
Understand "clouds" as the backdrop-clouds when the location is exterior and the weather is cloudy skies.

Understand "north/n wall" as north when the location is interior.
Understand "south/s wall" as south when the location is interior.
Understand "east/e wall" as east when the location is interior.
Understand "west/w wall" as west when the location is interior.
Understand "northwest/nw wall" as northwest when the location is interior.
Understand "northeast/ne wall" as northeast when the location is interior.
Understand "southwest/sw wall" as southwest when the location is interior.
Understand "southeast/se wall" as southeast when the location is interior.

Textfyre Standard Backdrops ends here.

---- DOCUMENTATION ----

An extension which provides standard floors, ceilings, walls, and sky. 
