!
! Geyser
!

LB_Room geyser "Geyser"
	with	name 'geyser',
			description
			[;	if (Hatch == true) {
					AddToScope(rustyhatch);
					if (rustyhatch hasnt open)
						print "In all directions the land is a waste. Craters, bones, flesh, smoke,
						 and the remnants of war litter the entire landscape. The sky, an
						 angry red, is filled with ashen clouds. The earth trembles
						 from dislocated tectonic plates and the atmosphere is quickly becoming
						 unbreathable and unlivable. A plume of gas shoots out of the ground
						 nearby and an unopened rusty hatch has been uncovered in the ground.^";
					else
						print "In all directions the land is a waste. Craters, bones, flesh, smoke,
						 and the remnants of war litter the entire landscape. The sky, an
						 angry red, is filled with ashen clouds. The earth trembles
						 from dislocated tectonic plates and the atmosphere is quickly becoming
						 unbreathable and unlivable. A plume of gas shoots out of the ground
						 nearby and a rusty hatch opens to a dark chamber below the ground.^";
				} else
					print "In all directions the land is a waste. Craters, bones, flesh, smoke,
						 and the remnants of war litter the entire landscape. The sky, an
						 angry red, is filled with ashen clouds. The earth trembles
						 from dislocated tectonic plates and the atmosphere is quickly becoming
						 unbreathable and unlivable. A plume of gas shoots out of the ground
						 nearby.^";
			],
			initial
			[;	print "A plume of gas shoots out of the ground nearby, forcing you to stumble sideways.^";
			],
			compasslook
			[ obj;	switch(obj)	{
						e_obj,se_obj,ne_obj,s_obj:	print "Nothing but barren country can be seen.^";
						n_obj,nw_obj:	print "Vaporous clouds weave through a city skyline
												   devastated by holocaust.^";
						w_obj,sw_obj:	print "A dried-up riverbed weaves through the land and
												   beyond that, a huge crater can be seen.^";
						u_obj:	print "As you gaze upward you see an angry red sky filled with clouds
									   of smoke and floating ash.^";
						default: rfalse;
					}
					rtrue;
			],
	w_to	riverbed,
	d_to	[;	if (Hatch == true)	return rustyhatch;
				print "You don't see a way to climb downward from here.^";
				rtrue;
			];

SC_Object intheground "ground" geyser
	with	name 'land' 'ground' 'dirt' 'mud' 'earth',
			article 'the',
			description
			[;	print "The land is blackened from battle, leaving nothing behind.^";
			],
	before	[;	Dig:	if (Hatch == false) {
							print "You scrabble down onto all fours and dig your fingers into the
									   ground near the geyser. After an hour of hard labor, you finally
									   locate and clear dirt off of a square rusty hatch.^";
							move rustyhatch to geyser;
							score++;
							Hatch = true;
						} else
							print "You've been digging around here already. The rusty hatch is proof
									   enough of that.^";
						rtrue;
			];

SC_Object bones "bones"
	with	name 'bones' 'flesh',
			description
			[;	print "The skeletal remains of all life on this planet can be seen everywhere.
						   Whatever damage the enemy had done, leaving the remains was likely a
						   reminder to whomever may think of challenging them again.^";
			],
			found_in
			[;	if (location ofclass LB_Room)	return true;	return false;
			];

SC_Object smoke "smoke"
	with	name 'air' 'smoke' 'pillars' 'pollution',
			description
			[;	print "From the burning land rises foul-colored gases and smoke. Where flesh
						   and bone will eventually turn into soil, most of the living have been
						   vaporized and are now apart of a death-filled fog.^";
			],
			found_in
			[;	if (location ofclass LB_Room)	return true;	return false;
			];

SC_Object gasplume "gas plume" geyser
	with	name 'gas' 'geyser' 'plume' 'vapor',
			description
			[;	if (AEField.status ~= FAST_TIME)
					print "The gas plume is shooting pure hydrogen out of a manmade hole in the ground.^";
				else
					print "The gas plume is currently frozen, as if a tree of cotton stood in front of you.^";
			];

SC_Object gashole "vent" geyser
	with	name 'vent' 'pipe' 'hole',
			before
			[;	Search:		print "Ignoring the gas plume, you try to look inside the vent and fail to
									   discern anything extraordinary.^";
							rtrue;
			],
			description
			[;	print "The hole is about twenty centimeters wide, obviously the broken portion of a cooling
						   system buried beneath the ground.^";
			];

SC_Object rustyhatch "rusty hatch"
	with	name 'rusty' 'hatch',
			description
			[;	print "The hatch is about a meter square, rusted, with a handle inset into the metal.^";
			],
	before	[;	Open:	if (AEField.status == FAST_TIME) {
							print "The hatch refuses to budge.^";
							rtrue;
						}
						if (self has open) {
							print "The hatch is already open.^";
							rtrue;
						}
						give self open;
						if (location == geyser) {
							print "The hatch swings open, revealing darkness below.^";
							rtrue;
						}
						print "You push the hatch up and it bangs onto the surface above.^";
						rtrue;
				Close:	if (AEField.status == FAST_TIME) {
							print "The hatch refuses to budge.^";
							rtrue;
						}
			],
	door_to	[;	if (player in geyser)
					return chamber;
				else
					return geyser;
			],
	door_dir
			[;	if (player in geyser)
					return d_to;
				else
					return u_to;
			],
	found_in
			[;	if (Hatch == true && player in geyser)	rtrue;
				if (player in chamber) rtrue;
				rfalse;
			],
	has		door openable ~open;

OL_Room chamber "Dark Chamber"
	with	name 'dark' 'chamber',
			description
			[;	print "Your blue mechanical eyes immediately adjust to the lack of
						   light in this dark chamber. This seems to be the 'forward'
						   cabin of an MDB (mechanically deployed bunker). The interior
						   hatch in the floor is closed and the";
				if (rations in chamber)
					print "re are rations strewn about in an otherwise
							   empty room.^";
				else
					print " bunker is otherwise completely empty.^";
			],
	u_to	[;	if (rustyhatch has open)	return rustyhatch;
				print "The hatch is currently closed.^";
				rtrue;
			],
	d_to	interiorhatch;

SC_Object flashbackdark "flashbackdark" chamber
	with	name 'dal' 'mkor' 'time' 'devices' 'people' 'everyone' 'tra' 'jan' 'gore' 'troop' 'soldier',
			description
			[;	Memory.flashback();
			];

INV_Tool rations "supply of rations" chamber
	with	name 'food' 'rations' 'supplies',
			article "a",
			describe
			[;	rtrue;
			],
			description
			[;	print "Typical in wartime, the rations are basic liquid and solid
						   refreshment usable by humans and androids.^";
			],
	number	3,
	before	[;	Eat,Drink:	if (AEField.status == FAST_TIME) {
								print "You can't eat while the AEFG is activated.^";
								rtrue;
							}
							if (FlightSkin.status == SKIN_ON) {
								print "You can't eat while the flight skin is activated.^";
								rtrue;
							}
							self.number = 0;
							SystemsSpeed = 0;
							print "You consume what seems to be the last of the rations. Hopefully, 
									   you won't need to find anymore.^";
							Health = 1;
							AEField.status = SLOW_TIME;
							move self to NoWhere;
							StopDaemon(NeedResources);
							print "^Auto-Repair says, ~Main systems are now at full power.~^";
							rtrue;
			],
	has		edible pluralname;

OL_Room interiorhatch "interior hatch" chamber
	with	name 'interior' 'hatch',
			description
			[;	print "The interior hatch is about a meter round and locked. ";
				if (self hasnt seen) {
					print "^^Main Systems says, ~These MDB units were
                           designed to withstand two assaults. The first assault would give access to
                           this room and the second assault would eventually gain access to the lower
                           compartment. It seems as though there was no second assault because the interior
                           hatch remains locked and intact.~";
                    give self seen;
                }
                print "^";
			],
	before	[;	Knock:	print "You bang on the interior hatch but there is no response. Internal
						 		   sensors are unable to penetrate the floor. There is no way to know
								   if anyone is down there.^";
						rtrue;
			],
	has		door openable locked ~seen;
