!
! Spaceport
!

LB_Room spaceport "Space Port"
	with	name 'space' 'port',
			description
			[;	print "Once an active space port, the surrounding area is now a cemetery of twisted
						   ships, buildings, and hangars. A large hole, presumably once the control tower,
						   marks the center of a wide circle of destruction. Smoking fields can be seen
						   to the southeast.^";
			],
			se_to	scorchedfields;

SC_Object ship "ship" spaceport
	with	name 'ship',
			before	[;	print "Your Main System replies, ~Ambiguous query. Please restate your intentions.~^";
						rtrue;
			];

SC_Object "twisted ships" spaceport
	with	name 'twisted' 'ships',
			description
			[;	print "There are literally hundreds of twisted ships, mainly light non-spacefaring
						   aircraft that operated off the magnetic field of the planet, although a few 
						   of them are of the larger, 'warp' variety.^";
			];
						   
SC_Object "light spacecraft" spaceport
	with	name 'light' 'ships' 'spacecraft' 'craft',
			parse_name
			[i;	i=0;
				if (NextWord() == 'light') i++;
				if (NextWord() == 'ships' or 'spacecraft' or 'craft') i++;
				return i;
			],
			description
			[;	print "The light planet-bound spacecraft are completely destroyed.^";
			];

SC_Object "warp ships" spaceport
	with	name 'warp' 'ships',
			parse_name
			[i;	i=0;
				if (NextWord() == 'warp') i++;
				if (NextWord() == 'ships') i++;
				return i;
			],
			description
			[;	print "Clearly, the warp ships received extra attention in the recent battle. All of them
						   are melted slags of metal. Amazingly, one such ship survived complete destruction,
						   so much so that the name 'Caledonia' is still visible on it's hull.^";
			];

SC_Object caledonia "Caledonia" spaceport
	with	name 'caledonia',
			description
			[;	print "The Caledonia looks to have been a reconnaissance warp vehicle. The nose of the ship
						   is twisted into a single mass of plasteel, while much of the main cabin seems to have
						   survived. A hole, probably where the air-lock once was, has been blasted through to the
						   inside.^";
			],
			before
			[;	Enter:	print "You climb inside the Caledonia...^";
						PlayerTo(maincabin);
						rtrue;
			],
			in_to
			[;	<<Enter>>;
			],
	has		proper female enterable;

SC_Object kids "kids" spaceport
	with	name "kids" "children" "child" "class" "dal" "mkor",
			description
			[;	Memory.flashback();
			];

OL_Room maincabin "Main Cabin of Caledonia"
	with	name 'main' 'cabin' 'caledonia',
			description
			[;	print "Inside the Caledonia's main cabin the destruction is more personal. Four
						   distinct blasts incinerated the crew, their charred remains fused with
						   the port-side hull. The air-lock was breached with a large plasma rifle
						   or some directed explosive, the bridge of the ship is a ball of
						   melted plasteel, and the rear compartments seem to be in a similar state.^";
			],
	out_to	[;	if (PlayerCharacter.AttachedToCaledonia()) {
					print "Since the safety cable is attached to your belt and to the
							   control panel, leaving the ship is impossible.^";
					rtrue;
				}
				return spaceport;
			],
	has		scored;

SC_Object hull "hull" maincabin
	with	name 'hull' 'bridge',
			description
			[;	print "The hull is mostly intact except for the burn marks from recently deceased
						   and the bridge.^";
			];

SC_Object rearcompartment "rear compartment" maincabin
	with	name 'rear' 'compartment',
			description
			[;	print "The rear compartment is a mass of impenatrable plasteel.^";	];

SC_Object sp_airlock "air-lock" maincabin
	with	name 'air-lock' 'air' 'lock',
			description
			[;	print "The blast created a hole just large enough to remove the air-lock itself, but
						   the control panel is still visible.^";
			],
	has		concealed;

SC_Object CaledoniaCP "control panel" maincabin
	with	name 'control' 'panel',
			article "the",
			description
			[;	if (safety_cable.attached_to_a == self || safety_cable.attached_to_b == self) {
					if (safety_cable.attached_to_a == self && safety_cable.attached_to_b == self)
						print "The control panel is in ruins except for a safety cable which
								   is attached at both ends to the control panel.^";
					else
						if (safety_cable.attached_to_a == self || safety_cable.attached_to_b == self)
							print "The control panel is in ruins except for a safety cable which
									   is attached at one end to the control panel.^";
				} else
					print "The control panel is in ruins except for two small sockets where a safety cable can be attached.^";
			],
	has		concealed attachable supporter;

SC_Object cal_sockets "sockets" maincabin
	with	name 'socket' 'sockets',
			description
			[;	print "The control panel sockets are small octagonal fittings, universal in design, for connecting a
						   safety belt or a spacewalking tether.^";
			];

Object safety_cable "safety cable" CaledoniaCP
	with	name 'safety' 'cable',
			article "the",
			description
			[;	print "The safety cable is a short (one meter) length of sofsteel cabling used to protect
						   against emergency depressurization while in space. Anyone secured to the control
						   panel via the safety cable would be anchored against such a consequence and
						   hopefully have time to secure at least one of the hatches of the air-lock";
				if (self.Attached()) {
					print ". Currently,";
					if (self.BothAttached()) {
						if (self.attached_to_a == self.attached_to_b) {
							print " both ends of the safety cable are attached to ";
							print (string) self.attached_to_a.article, " ", (name) self.attached_to_a;
						} else {
							print " one end of the safety cable is attached to ";
							print (string) self.attached_to_a.article, " ", (name) self.attached_to_a;
							print " and the other end is attached to ";
							print (string) self.attached_to_b.article, " ", (name) self.attached_to_b;
						}
					} else {
						print " one end of the safety cable is attached to ";
						if (self.attached_a) {
							print (string) self.attached_to_a.article, " ", (name) self.attached_to_a;
						} else {
							print (string) self.attached_to_b.article, " ", (name) self.attached_to_b;
						}
					}
				}
				print ".^";
			],
			before ! may want to add AttachedToSomethingBesidesPlayer() with an objectloop
			[;	Take,Remove:	if (self.Attached() && (self.AttachedToCaledonia() || self.AttachedToAirLock())) {
									print "You can't carry the safety cable while it's attached to ";
									if (self.attached_a() && self.attached_to_a() ~= player) {
										print (string) self.attached_to_a.article, " ", (name) self.attached_to_a;
									} else {
										print (string) self.attached_to_b.article, " ", (name) self.attached_to_b;
								}
							print ".^";
							rtrue;
						}
				Detach:	if (second == player) {
							second = belt;
						}
						if (self.attached_a && self.attached_to_a == second) {
							if (last_detached ~= second) {
								print "You detach an end of the safety cable from ";
								last_detached = second;
							} else
								print "You detach the other end of the safety cable from ";
							print (string) self.attached_to_a.article, " ", (name) self.attached_to_a;
							self.attached_a = false;
							self.attached_to_a = 0;
							if (~~self.attached_b) {
								move self to player;
								print " and pick it up.^";
							} else
								print ".^";
							rtrue;
						}
						if (self.attached_b && self.attached_to_b == second) {
							if (last_detached ~= second) {
								print "You detach an end of the safety cable from ";
								last_detached = second;
							} else
								print "You detach the other end of the safety cable from ";
							print (string) self.attached_to_b.article, " ", (name) self.attached_to_b;
							self.attached_b = false;
							self.attached_to_b = 0;
							if (~~self.attached_a) {
								move self to player;
								print " and pick it up.^";
							} else
								print ".^";
							rtrue;
						}
				Attach:	if (second == player) {
							second = belt;
						}
						if (self.attached_a && self.attached_b) {
							print "You must detach an end of the safety cable before you can
									   attach it to something else.^";
							rtrue;
						}
						if (second hasnt attachable) {
							if (second == player)
								second = belt;
							else {
								print "You can't attach the safety cable to ";
								print (string) second.article, " ", (name) second, ".^";
								rtrue;
							}
						}
						if (~~self.attached_a) {
							self.attached_a = true;
							self.attached_to_a = second;
							if (last_attached ~= second) {
								print "You attach an end of the safety cable to ";
								last_attached = second;
							} else
								print "You attach the other end of the safety cable to ";
							print (string) self.attached_to_a.article, " ", (name) self.attached_to_a, ".^";
							rtrue;
						} else {
							if (self.attached_b) {
								if (second == self.attached_to_b) {
									print "The cable is already attached to the ", (name) self.attached_to_b, ".^";
									rtrue;
								}
								print "You must first detach the cable from ", (name) self.attached_to_a, " or ", (name) self.attached_to_b, ".^";
								rtrue;
							}
							self.attached_b = true;
							self.attached_to_b = second;
							if (last_attached ~= second) {
								print "You attach an end of the safety cable to ";
								last_attached = second;
							} else
								print "You attach the other end of the safety cable to ";
							print (string) self.attached_to_b.article, " ", (name) self.attached_to_b, ".^";
							rtrue;
						}
				Drop:	if (AEField.status == FAST_TIME) {
							print "The AEFG System says, ~Inventory manipulation in FAST TIME is extremely
									   dangerous. For your protection, this command will be ignored.^";
							rtrue;
						}
						if (player has inflight) {
							print "The Main System says, ~Both the AEFG and FlightSkin Systems
									   report drastic consequences for this action. For your protection,
									   it will be ignored.^";
							rtrue;
						}
						if (self.AttachedToMe()) {
							print "You can't drop the safety cable while it is attached to your belt.^";
							rtrue;
						}
			],
			AttachedToAirLock
			[;
				if (self.attached_to_a == Panel || self.attached_to_b == Panel) {
					rtrue;
				}
				rfalse;
			],
			AttachedToCaledonia
			[;
				if (self.attached_to_a == CaledoniaCP || self.attached_to_b == CaledoniaCP) {
					rtrue;
				}
				rfalse;
			],
			AttachedToMe
			[;
				if(self.attached_to_a == belt || self.attached_to_b == belt) {
					rtrue;
				}
				rfalse;
			],
			Attached
			[;	return (self.attached_a || self.attached_b);
			],
			BothAttached
			[;	return (self.attached_a && self.attached_b);
			],
			attached_to_a	CaledoniaCP,
			attached_to_b	CaledoniaCP,
			attached_a true,
			attached_b true;
