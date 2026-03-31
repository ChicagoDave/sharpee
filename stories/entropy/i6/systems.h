System Systems
	with	name 'main' 'systems',
			short_name
			"Main Systems",
			description
			[;	"Your main systems include all functions that provide information
						   and health to your android body.^";
			],
			XAll
			[;	"Your systems report a list of several million 'things' that you could theoretically identify
     		              in your sensor range and concludes that this command is a malfunction.^^Main systems
            		      replies, ~Please be more specific.~^";
            ],
            Jump
            [;	self.number++;
            	if (location == above_lb) {
	            	switch (self.number) {
	            		1:	"Main Systems says, ~Another bug in the system Chrysilya.
									   Please avoid that command for the time being.~^";
						2:	"Main Systems says, ~Jumping in mid-air may seem like an appropriate
									   task to you, but it is causing a great deal of confusion among the
									   sub-systems. Please stop using that command.~^";
						default:	"Main Systems ignores your command.^";
					}
				} else {
	            	switch (self.number) {
	            		1:	"Main Systems says, ~Another bug in the system Chrysilya.
									   Please avoid that command for the time being.~^";
						2:	"Main Systems says, ~Jumping in zero-gravity may seem like an appropriate
									   task to you, but it is causing a great deal of confusion among the
									   sub-systems. Please stop using that command.~^";
						default:	"Main Systems ignores your command.^";
					}
				}
            ],
            number 0,
	status	REPAIRING;

System Memory
	with	name 'memory',
			short_name
			"Memory",
			description
			[;	"Your memory systems include all of your past experiences recorded
						   in artificial synaptic loops.^";
			],
			daemon
			[;	if (memory_array->0 == 0 && location == deepcrater) {
					style underline;
					print "^
							   ~Chrysilya!~ cries a little girl nearby. You try to look for
							   the wimpering child, suddenly seeing her dirty face...^^
							   PHRISH! PHRISH! PHRISH! the distinct sound of a plasma rifle
							   suddenly obliterates the little girl and silences her cries.^^
							   Your deeply encoded human protection systems are reeling from
							   the attack. Other children cry out, followed by more plasma bolts,
							   and then longer moments of silence. On your knees, with your empty
							   plasma rifle, you bite down an urge to wail when suddenly a roving
							   Tra 'Jan Gore landbiter hits you square in the chest, dragging you
							   until your systems begin to fail...^";
					style roman;
					memory_array->0 = 1;
					if (self.number == 0) {
						print "^....and the flashback fades...^";
						self.number = 1;
					}
				}
				if (memory_array->1 == 0 && location == chamber) {
					style underline;
					print "^
							   ~INCOMING!!!~, yells Dal MKor, and everyone in the bunker ducks
							   down to shield their heads.^^
							   BOOOM!!! BOOOM!!! BOOOM!!!^^
							   The bombs explode one after another and immediately afterwards
							   Dal yells at you, ~Get the time displacement device!!! It's our only hope now!!!~^^
							   He pushes you up through the hatch and immediately pulls it shut.^^
							   People are fighting and dying everywhere. Bombs are exploding, plasma
							   bursts are streaking through the sky, and smoke fills
							   the air. You can barely see a meter in any direction when suddenly a
							   Tra 'Jan Gore troop marches by, and you dive for cover...^";
					style roman;
					memory_array->1 = 1;
					if (self.number == 0) {
						print "^....and the flashback fades...^";
						self.number = 1;
					}
				}
				if (memory_array->2 == 0 && location == spaceport) {
					style underline;
					print "^
							   ~Chrysilya, welcome to Earthangelos!~ says a tall dark man. ~I am
							   Dal Mkor, your sponsor.~ Pointing to a group of small children he
							   says, ~Your charge is here to greet you.~ Then speaking to the children he says,
							   ~Alright kids, say hello to Chrysilya.~ and the children obediantly
							   sing, ~Hellooo Chrysilya!!!~ and give you a short round of applause.^^
							   Your internship has begun at last. You will be the sole teacher for
							   these children for the next twelve years, guiding them through adolesence
							   and into adulthood. Your synaptic nervous system is unusually fluid
							   today. You feel almost emotional...^";
					style roman;
					memory_array->2 = 1;
					if (self.number == 0) {
						print "^....and the flashback fades...^";
						self.number = 1;
					}
				}
				if (memory_array->3 == 0 && location == bridge) {
					style underline;
					print "^
							   ~Dal Mkor is showing you Earth's primary protection mechanism in an underground cavern. ~As you know Chrysilya,
							   we've had warnings about a potential invasion by the Tra 'Jan Gore. We've prepared for
							   this possiblity for hundreds of years. This device (pointing to a massive cylindrical container)
							   is a large-field time displacement device. If left untouched, it will memorize everything
							   within this solar system. While we are at peace, the device is 'reset' every night at
							   midnight. If we were ever to come under attack, we would simply wait until we knew as much
							   as possible about the attack, and execute a recall on the device. This must be done by an android since no human
							   is likely to survive a large scale invasion.^^By executing a recall, everything in the solar system would revert back to the original reset-point, except
							   for that android, who would remember everything.^^Anything within about 12 meters of the device
							   will in fact remain exactly the same. Everything outside of that 12 meter space out to 500
							   billion kilometers would be reverted. We've chosen you Chrysilya to handle this critical duty. We plan to add armor
							   and other essential protections to your android body so you can withstand any assault.~^";
					style roman;
					deadflag = 2;
					memory_array->3 = 1;
					if (self.number == 0) {
						print "^....and the flashback fades...^";
						self.number = 1;
					}
				}
			],
			flashback
			[;	if (self.number > 0) {
					self.number++;
					switch (self.number) {
						2:	"Memory Systems says, ~Flashbacks are being triggered by visual patterns. I'm attempting
									   to fix the problem. Please be patient.~^";
						3:	"Memory Systems says, ~It appears that the problem is in the central memory core. One of
									   the redundant bridges is corrupted by plasma burns. This may need a surgical bath.~^";
						4:	"Memory Systems says, ~All diagnostic measures have been exhausted. The flashback problem
									   will continue until a surgical bath is located.~^";
						default:	"Memory Systems, ~Nothing new to report.~^";
					}
				} else {
					"Memory Systems, ~Nothing to report.~^";
				}
			],
			number	0,
			status	REPAIRING;

System AEField
	with	name 'anti' 'entropic' 'field' 'generator' 'aefg',
			short_name
			"Anti-Entropic Field Generator",
			description
			[; "The anti-entropic field generator operates internally within one of your
						  sub-systems using the commands, [SLOW TIME] and [FAST TIME]. In a confined
						  area (your body space), the AEFG will speed up time so that your surroundings
						  seem to be frozen.^";
			],
			react_before
			[;	Slow:	switch (self.status) {
							REPAIRING:	rfalse;
							RECHARGING:	"The AEFG system responds, ~System recharging. Check [SYSTEMS]
												   for more details.~^";
							SLOW_TIME:	"The AEFG system responds, ~Slow time already achieved.~^";
							FAST_TIME:	print "Your immediate surroundings begin to flow normally again.^^
										   The AEFG system confirms, ~Slow time achieved.~^";
										self.status = RECHARGING;
										StartDaemon(AEField);
						}
						rtrue;
				Fast:	switch (self.status) {
							REPAIRING:	rfalse;
							RECHARGING:	print "The AEFG system responds, ~System recharging. Check [SYSTEMS]
												   for more details.~^";
							SLOW_TIME:	print "Everything begins to blur for a moment and then all of your
											   surroundings seem to stop. There is neither sound nor movement.^";
										self.status = FAST_TIME;
							FAST_TIME:	print "The AEFG system responds, ~Fast time already achieved.~^";
						}
						rtrue;
			],
			daemon
			[;	self.recharge++;
				if (self.recharge == self.recharge_time) {
					print "^The AEFG System says, ~System recharged.~^";
					self.recharge = 0;
					StopDaemon(AEField);
					self.status = SLOW_TIME;
				}
			],
	recharge_time 30,
	recharge 0,
	status	REPAIRING;

System FlightSkin
	with	name 'flight' 'skin',
			short_name
			"Flight Skin",
			description
			[;
			"Your flight skin is a living organism that resides in a small portion
			 of your plasteel skull. When activated with the command [SKIN], the
			 organism will 'pour' itself over your entire body, giving you nearly
			 perfect atmospheric safety, including all oxygen required by your
			 andriod body. Once the skin is in place, you can use normal vertical
			 and compass rose directions to fly. A second [SKIN] command will send
			 the organism back into its protective home. The skin does not provide
			 protection against most weapons.^";
			],
			react_before
			[;	Skin:	if (self.status == SKIN_OFF) {
							return Activate_SkinSub();
						}
						if (self.status == SKIN_ON) {
							return Deactivate_SkinSub();
						}
				Activate_Skin:	if (self.status == SKIN_OFF) {
								return Activate_SkinSub();
							} else {
								print "Your flight skin is currently active.^";
								rtrue;
							}
				Deactivate_Skin: if (self.status == SKIN_ON) {
								return Deactivate_SkinSub();
							} else {
								print "Your flight skin is currently deactivated.^";
								rtrue;
							}
			],			
	status	SKIN_OFF;

[ Activate_SkinSub;
	if (safety_cable.attached_to_a == belt || safety_cable.attached_to_b == belt) {
		print "You cannot activate the flight skin while the safety cable
			   is attached to your belt.^";
		rtrue;
	}
	FlightSkin.status = SKIN_ON;
	print "Activating the flight skin is simply a matter of
	 twitching a specific nerve deep within your skeletal
	 structure....^^
	 Through an opening the size of a nail, the organism
	 flows out and begins the process of enveloping your
	 external structure. It does this within a matter of
	 seconds, eventually closing over your face and providing
	 oxygen.^";
	 rtrue;
];

[ Deactivate_SkinSub;
	if (player has inflight) {
		print "Your self-protection is built far too deeply into
		 your brain to accomodate this request.^";
		 rtrue;
	}
	FlightSkin.status = SKIN_OFF;
	print "The organism slowly returns through the aperature in
			   your skull, leaving you in your normal state.^";
	rtrue;
];