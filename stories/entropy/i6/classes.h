Class PC
	has ~inflight proper animate;

Class OL_Room
	has light scenery;

Class System
	with
		statusdesc	[w i;	self.short_name.print_to_array(short_name_array);
							w = 50-(short_name_array-->0);
							print (string) self.short_name;
							for (i=1 : i<=w : i++) {
								print ".";
							}
							if (self.status == REPAIRING && self == Systems) {
								if (SystemsSpeed == 0)
									"100%";
								else {
									print (10-SystemsSpeed)*10, "%";
									"";
								}
							}
							switch (self.status) {
								RECHARGING:	"RECHARGING ", (AEField.recharge/6)*20, "%";
								REPAIRING:	"REPAIRING";
								default:	"READY";
							}
					],
		before		[;	Drop: "You can't drop an internal sub-system";	],
		found_in	[; rtrue; ],
		status		0,
	has				scenery;

Class INV_Tool;

Class SC_Object
	has				scenery;

Class LB_Room class OL_Room
	with	name 'lost' 'battlefield',
	counter 0,
	u_to	[;	if (FlightSkin.status == SKIN_ON) {
					print "Reacting to your internal suggestion, the flight skin tightens
					slightly and aligns itself with the magnetic field surrounding the planet.
					Then, suddenly, you feel the power of flight as your body leaps into the air....^";
					return above_lb;
				}
				if (FlightSkin.status == SKIN_OFF) {
					print "You must activate your flight skin before attempting to fly.^";
					rtrue;
				}
				print "Auto-Repair says, ~Flight-Skin is currently being repaired.~^";
				rtrue;
			],
	after	[;	if (auto_help_array->0 == false)	{
					auto_help_array->0 = true;
					AutoHelp(0);
				}
				give player ~inflight;
			];

Class NPC	has proper animate;
