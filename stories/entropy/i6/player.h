PC PlayerCharacter "you"
	with	description
			[;	if (FlightSkin.status == SKIN_ON)
					"Your meter and a half frame is currently completely encased
					 by the flight skin organism.";

				print "Standing about a meter and a half in height, your external feminine
			   			  coverings are nearly unrecognizable beyond the damage done in battle.
			    		  You examine yourself and once again shrug at the human engineer that
			    		  decided to make you in her own image. Outside of the normal humaniform
			    		  features is a wide utility belt built into your waist";
				if (safety_cable.AttachedToMe())
			   		print " with a safety cable attached";
			   	print ".^";
			   	rfalse;
			],
			add_to_scope 
			[;
				if ((TraJanGore in airlock || TraJanGore in orbit) && airlock.outer_door == IS_OPEN && airlock.inner_door == IS_OPEN) {
					AddToScope(TraJanGore);
				}
			],
			AttachedToCaledonia
			[;	if (safety_cable.AttachedToCaledonia() && safety_cable.AttachedToMe()) rtrue; else rfalse;
			],
			AttachedToAirLock
			[;	if (safety_cable.AttachedToAirLock() && safety_cable.AttachedToMe()) rtrue; else rfalse;
			];

SC_Object face "face"
	with	name 'face' 'wires' 'bent' 'metal',
			description
			[;	print "Your face is disfigured and torn, exposing wires and pieces of bent metal.^";
			],
			found_in
			[;	return true;
			],
	has		concealed;

SC_Object legs "legs"
	with	name 'leg' 'legs',
			description
			[;	print "Both of your legs have sharp burns showing surface damage.^";
			],
			found_in
			[;	return true;
			],
	has		concealed;

SC_Object arms "arms"
	with	name 'arm' 'arms',
			description
			[;	print "Your arms have scrapes and burns but nothing too serious.^";
			],
			found_in
			[;	return true;
			],
	has		concealed;

SC_Object hip "hip"
	with	name 'hip' 'hips',
			description
			[;	print "Your hips are bent to the left from the impact of a nearby shock grenade. It does
						   not seem to be impeding your stride too much.^";
			],
			found_in
			[;	return true;
			],
	has		concealed;

SC_Object belt "belt"
	with	name 'belt',
			article "your",
			description
			[;	print "It's a built-in utility belt that comes standard on all androids";
				if (safety_cable.attached_to_a == self && safety_cable.attached_to_b == self) {
					print " and currently has two ends of a safety cable attached";
				}
				if (safety_cable.attached_to_a == self || safety_cable.attached_to_b == self) {
					print " and currently has one end of a safety cable attached";
				}
				print ".^";
			   	rfalse;
			],
			before
			[;	Disrobe,Drop,Remove:	print "You can't remove the utility belt because it
												   is a part of you.^";
										rtrue;
			],
			found_in
			[;	rtrue;
			],
	has		attachable static;
