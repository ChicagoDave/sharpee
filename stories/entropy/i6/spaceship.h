!
! Spaceship
!

OL_Room above_lb "Above the Lost Battlefield"
	with	name 'above' 'lost' 'battlefield' 'field',
			description
			[;	print "Hovering about three hundred meters above the ground you survey
						   the battlefield below. The destruction is even more daunting from
						   up here.^";
			],
	d_to	[;	print "With only a minor communication, the flight-skin gently carries
						   you to the ground....^";
				return lostbattlefield;
			],
	u_to	[;	print "You close your eyes and communicate to the flight skin
					   that you wish to travel to the planet's orbital plane.^^
					   With a sudden hardening, the skin turns you into a speeding
					   bullet, streaking though clouds, thin air, and then into
					   space....^^Spectral lights and noise attack your senses
					   as you fly through the different layers of atmosphere. Suddenly,
					   you're swimming in the dead silence of the void.^";
				return orbit;
			],
	cant_go	[; print "In all directions, the pocked-mark devistation smokes and billows
						  from below. You fly around in circles, afraid of losing the landmarks
						  below.^"; 
			],
	before	[;	give player inflight;
				Jump:	Systems.jump();
						rtrue;
			];

SC_Object earth_alb "earth"
	with	name 'earth' 'ground' 'land' 'planet',
			description
			[;	print "From this height you see the destruction of an entire continent. Little
						   remains of the once plush green earth, the rolling hills, crystal lakes,
						   and shining cities.^";
			];

OL_Room	orbit "Planetary Orbit"
	with	name 'planetary' 'orbit',
			initial
			[;	if (self hasnt seen) {
					print "^The immensity of space overwhelms the senses and humbles even
							   the most callous soul. For an android, it is a baptism of
							   power, because your human creator gave you the ability to be here,
							   and weakness, because one rather small android
							   in the middle of space is hardly anything that matters....^";
					give self seen;
				}
			],
			description
			[;	print "Floating in a low orbital plane, you peer down at an ash covered
			 			   world. All around you are the lights of distant stars and the
						   loneliness of the void.^";
			],
			before
			[;	Jump:	Systems.jump();
						rtrue;
			],
	d_to	above_lb ~seen;

SC_Object planet "planet" orbit
	with	name 'Earthangelos' 'planet' 'earth',
			description
			[;	print "Normally this view would be breathtaking, and concentrating on
						   the large bodies of water, it is. But when you look at the land
						   based areas of the planet, all hope fades, for the planet is
						   blackened and burning. Even from this height you can see massive
						   destruction. It doesn't appear that a single area of habitation
						   has survived the war with the Tra 'Jan Gore.^";
			];

Object SpaceShip "small spaceship"
	with	name 'small' 'spaceship' 'ship' 'rocket' 'cho' '^tak' 'tak' 'ru',
			article "a",
			description
			[;	if (AEField.status ~= FAST_TIME)
					print "The sleek ship is one of the Tra 'Jan Gore's lightweight spacecraft, modeled
							   after their most revered idol, a fish called the ~Cho 'Ang Zore~. With large
							   dorsal and pectral fins, a pair of forward windows, the ship clearly bears the
							   idols resemblance.^^Main Systems notes, ~The reason they chose this particular
							   fish is because of its quite deadly striking capabilities.~^";
				else
					print "The Cho 'Tak Ru seems frozen in place.^";
				self.examined = true;
			],
	react_before
			[;	Board,GoTo:	if (AEField.status ~= FAST_TIME) {
							print "Unfortunately, the Cho 'Tak Ru is moving too fast and already moving away
									   from you. No matter how hard you try, you can't seem to grab onto
									   the sides.^";
							rtrue;
						}
						print "The AEFG does the job, allowing you to grapple onto the spaceship.
								   You quickly locate the hatch, searching for some way to gain entry.^^
								   Main Systems says, ~Safety sub-systems report an extemely high chance of
								   failure in this course of action. I suggest returning to the planet.
								   Immediately.~^";
						PlayerTo(OutsideShip);
						rtrue;
			],
	daemon_start
			[;	self.status = 1;	! keep ship moving
			],
	daemon	[;	if (self.examined) {
						self.examined = false;
						return;
				}
				if (AEField.status ~= FAST_TIME)
					self.status++;
				else
					if (self.status == LO_FREQ or HI_FREQ)
						self.status = LO_FREQ + 1;
				if (self.status >= LO_FREQ && self.status <= HI_FREQ && player in orbit) {
					if (self has seen)
						print "^The Cho 'Tak Ru ";
					else {
						self.article = "the";
						print "^A small, sleek ship ";
					}
					move self to orbit;
				} else
					move self to NoWhere;
				if (self.status == LO_FREQ && player in orbit) {
					print "cruises into your view range...^";
					if (self hasnt seen) {
						print "^Main Systems says, ~Tra 'Jan Gore Chrysilya. Safety sub-systems recommend
								immediate return to the planet's atmosphere.~^";
						give self seen;
					}
				}
				if (self.status == HI_FREQ && player in orbit)
					print "floats away and out of sight...^";
				if (self.status > LO_FREQ && self.status < HI_FREQ && player in orbit)
					print "is floating nearby...^";
				if (self.status == ORBIT_END)	self.status=ORBIT_BEGIN;
			],
	examined false,
	status	1,
	has		scenery ~seen;

OL_Room OutsideShip "Outside Ship"
	with	name 'outside' 'ship',
			description
			[;	print "You're holding onto the outer hull door of";
				if (AEField.status == FAST_TIME)
					print " the Cho 'Tak Ru, seemingly frozen in space.";
				else
					print " the Cho 'Tak Ru that is traveling
							   around the planet 'below'.";
				print " There is a small button next to the door.^";
			],
			spinning 0,
			before
			[;	if (AEField.status ~= FAST_TIME) {
					self.spinning++;
					if (self.spinning == 5) {
						print "With the Cho 'Tak Ru moving so swiftly, you get slightly disoriented
								   and slip away...^";
						self.spinning = 0;
						PlayerTo(orbit);
					}
				}
			];

Object button "small button" OutsideShip
	with	name 'small' 'button',
			before
			[i width;
				Push:	if (AEField.status ~= FAST_TIME) {
							print "As you press the small button, the air-lock depressurizes and the door swings
									   inward. You jump free of the door before it closes behind you and the air-lock
									   pressurizes, filling with oxygen.^^";
							width = (0->33 - 26) / 2;
							for (i=0: i < width: i++)	print "_";
							print " MEANWHILE, ON THE BRIDGE ";
							for (i=0: i < width: i++)	print "_";
							style underline;
							print "^^The ships computer says,
									   ~Captain, there is an intruder in the air-lock; species
									   android; main systems at full strength; no apparent weapons.
									   Advise caution.~^";
							for (i=0: i < ((width*2) + 26): i++)	print "_";
							print "^";
							style roman;
							PlayerTo(airlock);
							give player ~inflight;
							StartDaemon(window);		! This controls the TJG ejecting you...
							OutsideShip.spinning = 0;	! reset in case the pc comes back...
							rtrue;
						}
						print "Nothing Happens.^";
						rtrue;
			],
	has		scenery concealed;

OL_Room airlock "Air-Lock"
	with	name 'air-lock',
			description
			[;	print "This is the air-lock of the small ship. ";
				if (self.inner_door == IS_OPEN && self.outer_door == IS_OPEN)
					print "Both hatches are open.";
				if (self.inner_door == IS_CLOSED && self.outer_door == IS_CLOSED)
					print "Both hatches are closed.";
				if (self.inner_door == IS_OPEN && self.outer_door == IS_CLOSED)
					print "The inner hatch opens to the ship proper, while the outer hatch close.";
				if (self.inner_door == IS_CLOSED && self.outer_door == IS_OPEN)
					print "The inner hatch is closed, while the outer hatch opens to the void of space.";
				print " A panel on one of the two remaining walls controls them. The airlock is currently ";
				if (self.status == PRESSURIZED) {
					print "pressurized.^";
				} else {
					print "depressurized.^";
				}
			],
			in_to
			[;	if (self.inner_door == IS_OPEN) {
					if (safety_cable.AttachedToAirLock() && safety_cable.AttachedToMe()) {
						print "You can't leave the air-lock while attached to the safety cable (which
								   is attached to the control panel).^";
						rtrue;
					}
					return InsideShip;
				}
				print "The inner hatch is closed.^";
				rtrue;
			],
			out_to
			[;	if (self.outer_door == IS_OPEN) {
					if (safety_cable.AttachedToAirLock() && safety_cable.AttachedToMe()) {
						print "You can't leave the air-lock while attached to the safety cable (which
								   is attached to the control panel).^";
						rtrue;
					}
					return orbit;
				}
				print "The outer hatch is closed.^";
				rtrue;
			],
			status		PRESSURIZED,
			inner_door	IS_CLOSED,
			outer_door	IS_CLOSED,
	has		scored;

SC_Object innerhatch "inner hatch" airlock
	with	name 'inner' 'hatch',
			description
			[;	if (airlock.inner_door == IS_CLOSED)
					print "The inner hatch, currently sealed, leads to the main cabin of the ship and has a small window.^";
				else
					print "The inner hatch leads to the main cabin of the ship and stands open.^";
			];

SC_Object outerhatch "outer hatch" airlock
	with	name 'outer' 'hatch',
			description
			[;	if (airlock.outer_door == IS_CLOSED)
					print "The outer hatch leads to space and is safely sealed shut.^";
				else
					print "The outer hatch is open.^";
			];

SC_Object ShCP_Buttons "buttons" airlock
	with	name 'buttons',
			description
			[;	Panel.description();	];

Object Panel "control panel" airlock
	with	name 'control' 'panel',
			description
			[;	if (safety_cable.AttachedToAirLock()) {
					if (safety_cable.attached_to_a == self && safety_cable.attached_to_b == self)
						print "The control panel consists of a green button, a white button, and a
								   red button. Below the three buttons is a safety cable which is
								   attached at both ends to the control panel,^";
					else
						if (safety_cable.attached_to_a == self || safety_cable.attached_to_b == self)
							print "The control panel consists of a green button, a white button, and a
									   red button. Below the three buttons is a safety cable which is
									   attached at one end to the control panel.^";
				} else
					print "The control panel consists of a green button, a white button, and a
							   red button. Below the three buttons are two small sockets where a
							   safety cable can be attached.^";
			],
	has		scenery concealed supporter attachable;

SC_Object cp_sockets "sockets" airlock
	with	name 'socket' 'sockets',
			description
			[;	print "The control panel sockets are small octagonal fittings, universal in design, for connecting a
						   safety belt or a spacewalking tether.^";
			];


Object GreenButton "green button" Panel
	with	name 'green' 'button',
			description
			[;	print "It's green, shaped like an arrow, and points to the inner hull
						   door.^";
			],
			before
			[;	Push:	if (airlock.outer_door == IS_OPEN) { ! we can assume the airlock is depressurized...
							if (PlayerCharacter.AttachedToAirLock()) {
								print "The Tra 'Jan Gore soldier is ejected from the ship! You have only a moment before he recovers.^";
								StartDaemon(TraJanGore);
								move TraJanGore to orbit;
								airlock.inner_door = IS_OPEN;
								StopDaemon(window);
								score++;
							} else {
								print "The pressure from inside the ship forces you out into space, along with the Tra 'Jan Gore soldier, who quickly grabs you and fires a plasma bolt directly into your torso...^";
								deadflag = 1;
							}
						} else {
							print "Quickly, you open the inner hull door...^^
									   ~KRISH NU KAI!!!!!!~ yells a surprised Tra 'Jan
									   Gore soldier...^^
									   ...and then your sworn enemy recovers, quickly brandishing
									   its plasma rifle and pointing it at your chest...^^
									   PHRISH! PHRISH! PHRISH!, three bolts of plasma-fire exit
									   the rifle and milliseconds later turn your body into 
									   a pile of melted android parts...^";
						   deadflag=1;
						}
						rtrue;
			],
	has	scenery concealed;

Object WhiteButton "small white button" Panel
	with	name 'small' 'white' 'button',
			description
			[;	print "It's a small white button without any indication to its use.^";
			],
			before
			[;	Push:	if (airlock.status == PRESSURIZED) { ! we can assume the outer door is closed...
							if (airlock.outer_door == IS_OPEN) {
								print "Main Systems says, ~Pressurizing the airlock with the outer door open wouldn't be prudent.^";
								rtrue;
							}
							if (window.number == 2) {
								print "The Tra 'Jan Gore soldier presses a button and the
										   outer hatch begins to release.^^";
								print "You push the white button and the air is suddenly
										   sucked out of the chamber.^^";
								if (FlightSkin.status == SKIN_ON) {
									print "The flight skin protects
											   you from the airless room though.^";
									airlock.status = DEPRESSURIZED;
								} else {
									print "Fortunately, your self-protection systems
											   activate the Flight Skin...^";
									FlightSkin.status = SKIN_ON;
									airlock.status = DEPRESSURIZED;
								}
							} else {
								print "You push the white button and the air is suddenly
										   sucked out of the chamber.^";
								airlock.status = DEPRESSURIZED;
							}
						} else {
							if (airlock.outer_door == IS_OPEN) {
								print "Main Systems says, ~Pressurizing the airlock with the outer door open wouldn't be prudent.^";
							} else {
								print "You push the white button and the air is restored
										   inside the chamber.^";
								airlock.status = PRESSURIZED;
							}
						}
						rtrue;
			],
	has		scenery concealed;

Object RedButton "red button" Panel
	with	name 'red' 'button',
			description
			[;	print "It's red, shaped like an arrow, and points to the outer hull
						   door.^";
			],
			before
			[;	Push:	if (airlock.outer_door == IS_OPEN) {
							airlock.outer_door = IS_CLOSED;
							print "The outer hull door closes.^";
							rtrue;
						}
						! Air-Lock is closed...
						if (airlock.status == PRESSURIZED) {
							if (safety_cable.AttachedToAirLock()) {
								print "The combination of the air-lock opening along with the
										   sudden depressurization of the air-lock catapults you out of the
										   ship along with the safety cable.^";
								ShipPanel.emergency_detachment();
							} else
								print "The combination of the air-lock opening and depressurizing catapults
										   you into space.^";											
							give player inflight;
							PlayerTo(orbit);
							StopDaemon(window);
							StartDaemon(SpaceShip);
						} else {
							airlock.outer_door = IS_OPEN;
							print "The outer hull door opens to a calm and empty view of space.^";
						}
						rtrue;
			],
	has		scenery concealed;

Object window "window" airlock
	with	name 'window',
			description
			[;	print "It's a small round window that shows a portion of the
						   inside of the spaceship.^";
			],
			before
			[;	Search:	self.looks++;
						self.counter = 0;
						self.look_in_window(self.unforced);
						rtrue;
			],
			look_speed 7,
			looks 0,
			counter	0,
			forced 1,
			unforced 2,
			daemon_start				! Resets daemon to starting position
			[;	self.look_speed = 7;
				self.looks = 0;
				self.counter = 0;
				self.forced = 1;
				self.unforced = 2;
			],
			daemon
			[;	self.counter++;
				if (self.counter > self.look_speed) {
					self.looks++;
					self.counter = 0;
					self.look_in_window(self.forced);
				}
			],
			look_in_window
			[ how;	print "^";
					switch (self.looks) {
						1:	if (how == self.unforced)
								print "As you look through the window, a
										   Tra 'Jan Gore soldier leaps into view.^";
							else
								print "Through the window in the inner hatch
										   you see a Tra 'Jan Gore soldier coming into
										   the main cabin from the bridge.^";
						2:	if (how == self.unforced)
								print "The Tra 'Jan Gore soldier stares at
										   you with a wide grin and a large
										   battle rifle in its arms.^";
							else
								print "Movement in the inner hatch window
										   forces you to notice the Tra 'Jan
										   Gore soldier staring directly at
										   you with a wide grin.^";
						3:	if (how == self.unforced)
								print "The Tra 'Jan Gore soldier reaches
									   for the red button on the inner control
									   panel...^";
							else
								print "An intuition tells you to look inside
										   the ship and is confirmed. The Tra 'Jan
										   Gore soldier is reaching for the red
										   button on the inner control panel...^";
							self.look_speed = 1;
						4:	if (how == self.unforced)
								print "The Tra 'Jan Gore soldier presses the red button...^^";
							else
								print "Through the window you see the Tra 'Jan Gore soldier press the red button...^^";
							style bold;
							print "WOOSH!!!^^";
							style roman;
							if (FlightSkin.status == SKIN_OFF) {
								print "As you're ejected from the air-lock, your flight skin activates automatically...^";
								FlightSkin.status = SKIN_ON;
							} else
								print "You're violently ejected from the air-lock...^";
							StartDaemon(SpaceShip);
							StopDaemon(window);
							give player inflight;
							PlayerTo(orbit);
					}
			],
	has		scenery concealed transparent;

OL_Room InsideShip "Inside Ship"
	with	name 'inside' 'ship',
			description
			[;	print "The inside of the ship is a utilitarian's utopia. Inset
						   lockers line both sides, a hatch leads to the pressure
						   chamber and an open doorway leads to the bridge.";
				if (TraJanGore in orbit && airlock.inner_door == IS_OPEN && airlock.outer_door == IS_OPEN) {
					print " The Tra 'Jan Gore soldier outside of the ship is quickly making his way back...";
				}
				if (TraJanGore in orbit && airlock.inner_door == IS_CLOSED && airlock.outer_door == IS_OPEN) {
					print " Through the window of the inner hatch, you can see that the Tra 'Jan Gore soldier is quickly making his way back to the ship...";
				}
				if (TraJanGore in airlock && airlock.inner_door == IS_OPEN && airlock.outer_door == IS_OPEN) {
					print " The Tra 'Jan Gore soldier is back inside the airlock and moving fast...";
				}
				if (TraJanGore in airlock && airlock.inner_door == IS_CLOSED && airlock.outer_door == IS_OPEN) {
					print " Through the window of the inner hatch, you can see the Tra 'Jan Gore soldier reach the airlock...";
				}
			],
			in_to
			[;	if (TraJanGore in orbit || TraJanGore in airlock) {
					print "Before you can reach the bridge, the Tra 'Jan Gore soldier leaps into the ship and fires a plasma bolt into your back.^";
					deadflag = 1;
					rtrue;
				}
				return Bridge;
			],
			out_to
			[;	if (safety_cable.AttachedToMe() && safety_cable.AttachedToAirLock()) {
					print "You can't go anywhere while the safety cable is attached to you
							   and the control panel.^";
					rtrue;
				}
				return airlock;
			];

Object inner_button "small button" InsideShip
	with	name 'small' 'button',
			before
			[;
				Push:	if (AEField.status ~= FAST_TIME) {
							print "The inner hatch closes.^";
							rtrue;
						}
						print "Nothing Happens.^";
						rtrue;
			]
	has	scenery concealed;
	
Object PlasmaRifle "plasma rifle" InsideShip
	with	name 'plasma' 'rifle',
			description "A standard plasma rifle locked to killing force.",
			before
			[;
				Shoot:	if (noun == TraJanGore && second == PlasmaRifle || noun == PlasmaRifle && second == TraJanGore) {
							if (airlock.inner_door == IS_OPEN && airlock.outer_door == IS_OPEN) {
								print "As you aim the rifle through the airlock, the Tra 'Jan Gore soldier leaps forward...but you have just enough time to fire a single plasma bolt into its chest, killing it.^";
								score++;
								StopDaemon(TraJanGore);
								move TraJanGore to nowhere;
							} else {
								print "You can't fire through the airlock doors.^";
							}							
						}
						rtrue;
			];

SC_Object ShipPanel "control panel" InsideShip
	with	name 'control' 'panel' 'socket' 'sockets',
			article "the",
			description
			[;	print "The control panel consists of a green button, a white button, and a
						   red button. Below the three buttons ";
				if (safety_cable.AttachedToMe()) {
					if (safety_cable.attached_to_a == self && safety_cable.attached_to_b == self)
						print "is a safety cable which is attached at both ends to
								   the control panel";
					else
						if (safety_cable.attached_to_a == self || safety_cable.attached_to_b == self)
							print "is a safety cable which is attached at one end to
										the control panel";
				} else
					print "are two small sockets where a safety cable can be attached";
				print ".^";
			],
	emergency_detachment
			[;	if (safety_cable.attached_to_a == self)	give safety_cable ~attached_a;
				if (safety_cable.attached_to_b == self)	give safety_cable ~attached_b;
			],
	has		concealed attachable supporter;

NPC	TraJanGore "Tra 'Jan Gore Soldier" InsideShip
	with	name 'tra' '^jan' 'jan' 'gore' 'soldier',
			description
			[;	print "The enemy is at least two and half meters tall, wearing
						   heavy body armor and a fierce grin.^";
			],
			counter 0,
			daemon_start
			[;
				self.counter = 0;
			],
			daemon ! only runs when in orbit
			[;
				self.counter++;
				if (self.counter >= 10) {
					move self to InsideShip;
					StopDaemon(self);
					if (PlayerCharacter in InsideShip || PlayerCharacter in Bridge) {
						print "The Tra 'Jan Gore soldier leaps back into the ship, aims his plasma rifle at you and fires.^";
						deadflag = 1;
					}
				}
			]
	has		~seen;

OL_Room Bridge "Bridge of Tra 'Jan Gore Ship"
	with	name 'bridge',
			description "This is the bridge of the ship, where command controls reside. There is no door between here and outward to the aft cabin.",
			out_to InsideShip;
			