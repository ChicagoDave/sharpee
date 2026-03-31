!
! Riverbed
!

LB_Room riverbed "Riverbed"
	with	name 'riverbed',
			description
			[;	print "In the bottom of the riverbed, you find the boiled and battered
						   remains of both animal and plant life. Although the river once
						   flowed from north to south, only the north seems passable. On either
						   side, one to the southwest and one to the east, you see small ledges
						   to carry you up and out of the river bottom.^";
			],
			compasslook
			[ obj;	switch(obj)	{
						w_obj,nw_obj:	print "Through wisps of smoke you see a tremendous crater.^";
						n_obj:	print "Vaporous clouds weave through a city skyline devastated by holocaust.^";
						s_obj,se_obj,ne_obj:	print "The riverbed is angles upward steeply and remains impassable.^";
						sw_obj,e_obj:	print "A series of small ledges look climbable in that direction.^";
						u_obj:	print "As you gaze upward you see an angry red sky filled with clouds
									   of smoke and floating ash.^";
						default: rfalse;
					}
					rtrue;
			],
			d_to
				[;	print "The southern portion of the riverbed is filled with dangerous
							   pitfalls.^";
				],
			w_to
				[;	print "The western bank of the riverbed is too steep, but a slight
							   adjustment to the southwest allows you an escape.^";
				],
			nw_to
				[;	print "The northwest portion of the bank is far too high to even
							   consider climbing.^";
				],
			ne_to
				[;	print "Between the open riverbed to the north and the ledge leading up
							   to the east, a tower of rock blocks any movement.^";
				],
			se_to
				[;	print "The gradually higher southeast bank is beyond your reach.^";
				],
			n_to	underground,
			e_to	geyser,
			sw_to	deepcrater;

SC_Object rb_water "water" riverbed
	with	name 'water',
			description
			[;	print "Your sensors determine that nearly ninety-seven percent of the water once
						   contained in this riverbed has evaporated and the remaining moisture is
						   hardly noticable by even your equipment.^";
			];

SC_Object rb_remains "remains" riverbed
	with	name 'remains',
			description
			[;	print "The range of species destroyed with the river is too numerous to classify. You
						   turn your attention elsewhere.^";
			];

SC_Object rb_river "river" riverbed
	with	name 'river',
			description
			[;	print "Clearly, the river has been destroyed by the war. The most likely cause is
						   the extreme temperatures from thermonuclear bombs.^";
			];

OL_Room underground "Underground River"
	with	name	'underground' 'river',
			description
			[;	print "Adjusting to low light, you make out the muddy remains of
						   a once thriving underground river. Fossils and roots adorn
						   the floors, walls, and ceiling while the echoes of splashing
						   water emanate from all around. Mud still glistens with sweat
						   throughout most of the tunnel.^";
			],
			compasslook
			[ obj;	switch(obj)	{
						w_obj:	<<Examine westernwall>>;
						nw_obj,n_obj,se_obj,ne_obj,sw_obj,e_obj:
								<<look>>;
						s_obj:	print "That way lies the only exit.^";
						u_obj:	print "As you gaze upward you see an angry red sky filled with clouds
									   of smoke and floating ash.^";
						default: rfalse;
					}
					rtrue;
			],
			w_to	westernwall,
			in_to	westernwall,
			d_to	riverbed,
			s_to	riverbed;

SC_Object mud "mud" underground
	with	name 'mud',
			description
			[;	print "Everything glistens with the muddy remnants of a once thriving underground river.^";
			],
			before
			[;	print "Main Systems says, ~Mud: A slimy, sticky, or slippery mixture of water and silt
						   or clay-sized earth material, with the consistency ranging from semi-fluid to soft
						   and plastic.~^^~Let's move on Chrysilya,~ it continues in a firm robotic tone.^";
				rtrue; ! Opportunity for humor here - maybe long diatribe by systems about composition of mud?
			];

SC_Object fossils "fossils" underground
	with	name 'fossil' 'fossils',
			description
			[;	print "Various amphibian fossils can be seen embedded in the glistening mud.^";
			];

Object walls "walls" underground
	with	name 'walls' 'tunnel',
			description
			[;	print "As you closely examine the walls, it becomes clear that the western
						   wall is drier compared to the rest of the tunnel. In fact, a distinct
						   rectangular shape can be seen within the drier mud.^";
			],
	has		scenery concealed;

SC_Object westernwall "western wall" underground
	with	name 'west' 'wall' 'western' 'wall' 'shape' 'door',
			parse_name
			[i;	i=0;
				if (NextWord() == 'west' or 'western' or 'door' or 'shape') i=9;
				return i;
			],
			description
			[;	if (self hasnt open)
					print "It seems to be a door of some kind.^";
				else
					print "The door is hidden within the wall somehow.^";
			],
			before
			[;	Push:	print "Taking a chance, you press inward on the door-like shape
								   and after a brief hissing noise, the wall opens.^";
						give self open;
						rtrue;
				Open:	print "Main Systems says, ~I would suggest pushing on the door. This looks
								   like a model 6XA7B4901-09 underground river hidden door and that is
								   the method used to open this model door.~^";
						rtrue;
				Close:	print "There doesn't seem to be anyway to close it.^^Main Systems notices your
								   pause and reples, ~I don't know either.~^";
						rtrue;
			],
			door_to
			[;	if (player in underground)
					return enemybunker;
				else
					return underground;
			],
			door_dir
			[;	if (player in underground)
					return w_to;
				else
					return e_to;
			],
			found_in enemybunker underground,
	has		door openable ~open;

OL_Room enemybunker "Enemy Bunker"
	with	name 'enemy' 'bunker',
			description
			[;	print "You've just entered what seems to be a hidden enemy bunker. It's clear
						   that the Tra 'Jan Gore were entrenched long before they began
						   the war. The bunker is empty except for a plasma rifle rack on the far
						   wall.^";
			],
	e_to	underground,
	out_to	underground;

SC_Object rack "plasma rifle rack" enemybunker
	with	name 'plasma' 'rifle' 'rack',
			description
			[;	print "The rack once contained hundreds of weapons. Unfortunately, it is
						   empty now.^";
			];
