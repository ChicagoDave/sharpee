Object NeedResources
	with
	daemon [;	if (Resources == 0) {
					if (Partial > 0) {
						if (PartialDec < 5) {
							PartialDec = (PartialDec+10)-5;
							if (Partial == 1) {
								Partial = 0;
								print "^Auto-Repair says, ~Partial systems failure.~^";
							} else
								Partial--;
						} else
							PartialDec = PartialDec - 5;
					}
					if (CompleteDec < 5) {
						CompleteDec = (CompleteDec+10)-5;
						if (Complete == 1) {
							deadflag = 1;
							"^*** Complete Systems Failure ***";
						} else
							Complete--;
					} else
						CompleteDec = CompleteDec - 5;

					if (Complete < 5) print "^Auto Repair says, ~Complete system failure imminent.~^";
				}
	];
