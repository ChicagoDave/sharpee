[ AutoHelp i;	switch (i) {
					0:	print "^[DIAGNOSIS]^";
					1:	print "^[SYSTEMS]^";
				}
];

[ ChooseObjects obj code;
	if (code < 2) rfalse;
	if (action_to_be == ##Dig && obj == intheground) return 9;
	return 1;
];

