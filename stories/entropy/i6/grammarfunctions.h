[ DiagnosisSub;

	switch (Health) {
		0:	print "[Your face is marred by burns, but functional. Auto-repair
		     will not waste power to repair it. Your arms and legs
		     are lacerated with burns and large wounds. Auto-repair has
		     already begun working on these. Your hip is seriously dislocated.
		     Auto-repair cannot handle the damage. You're seriously dehydrated
		     and low on energy. Auto-repair currently cannot locate any resources
		     for replenishment. Auto-repair reports that resources are required
		     within ";
		    if (Partial>0) {
		    	print (number) Partial;
		    	print " point ";
		    	print (number) PartialDec;
		    	print " standard hours of this diagnosis before partial system failure, ";
		    }
		    print (number) Complete;
		    print " point ";
		    print (number) CompleteDec;
		    print " standard hours before complete system failure.]^";
		    if (HumanSmile==1) {
		    	HumanSmile=0;
			    print "^This brings a smile to your damaged face. Auto-repair always makes
		         you feel human, especially when reporting upon your eventual demise.^";
		        AutoHelp(1);
		    }
		1:	print "You're still damaged in places, but for the most part, back to full strength.^";
	}

];

[ SystemsSub s;
	objectloop (s ofclass System)
		if (s.status > 0)
			s.statusdesc();
];

[ SkinSub;	print "Auto-Repair says, ~The [SKIN] command is currently unavailable.~^";	];

[ BoardSub;	print "You can't board that!^";	];

[ KnockSub;	print "That doesn't seem to help.^";	];

[ FastSub;	print "Auto-Repair says, ~The Anti-Entropic Field Generator is currently offline.~^";	];

[ SlowSub;	print "Auto-Repair says, ~The Anti-Entropic Field Generator is currently offline.~^";	];

[ AttachSub;	print "You can't do that.^";	];

[ DetachSub;	print "You can't do that.^";	];

[ AboutSub;	"This work was inspired by Dan Simmons's Hyperion books, as well as all of the other great science fiction authors
			 that I have enjoyed reading over the years. The text output is controlled by the status of your well-being - you
			 are afterall, an android. Actions within the game allow you to regain your full power, but to me, this is an element
			 of the experience of being an android, and should therefore not be turned off in order to view the story as it was
			 intended. However, if you find this completely annoying, please enter the command [NOSLOW], which puts you into
			 what I call -ZarfMode-, since Andrew Plotkin told me in an e-mail one time that if I ever implemented this feature,
			 he would immediately close the game and never play it again. ZarfMode can be exited by entering [GOSLOW].^^
			 Beta Testing by:^
			 - Alexander Deubelbeiss, David C. Young, Steve Finney, Mike Sousa, Starkov Stas, Kat Feete, Jennifer Vaughan, and Jason Love.";
];

[ ShootSub;	print "Main Systems says, ~Chrysilya, Your action is unclear.~^";	];

[ GoSlowSub;	SystemSpeedOverride = false; print "Slow Printing Enabled.^"; ];

[ NoSlowSub;	SystemSpeedOverride = true; print "Slow printing disabled.^"; ];

[ FlySub;		if (location ofclass LB_Room)
					<<go u_obj>>;
				else
					print "You can't fly indoors!^";
];

Include "Help";

Verb 'di' 'diag' 'diagnosis' 'diagnose'
							*							-> Diagnosis;

Verb 'sy' 'systems'			*							-> Systems;

Verb 'activate'             * 'skin'                    -> Activate_Skin;

Verb 'deactivate'           * 'skin'                    -> Deactivate_Skin;

Verb 'skin'					*							-> Skin;

Verb 'board' 'grab'			*							-> Board
							* noun						-> Board;
							
Extend 'go'					* 'to' noun					-> GoTo;

Extend 'dig'				* 							-> Dig
							* 'in' noun					-> Dig;

Verb 'knock' 'bang'			* 'on' noun					-> Knock;

Verb 'fast'					* 'time'					-> Fast;

Verb 'slow'					* 'time'					-> Slow;

Verb 'attach' 'connect' 	* noun 'to' noun			-> Attach;

Verb 'detach' 'disconnect'	* noun 'from' noun			-> Detach;

Verb 'about'				*							-> About;

Verb 'goslow'				*							-> GoSlow;

Verb 'noslow'				*							-> NoSlow;

Verb 'fly'					*							-> Fly;

Verb 'fire' 'shoot'			* 'at' noun 'with' noun	-> Shoot
							* noun 'at' noun		-> Shoot
							* noun 'with' noun		-> Shoot;
				
Verb 'help' 'hint'			*							-> EntropyHelp;
