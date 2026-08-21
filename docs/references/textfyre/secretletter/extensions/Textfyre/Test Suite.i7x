Test Suite by Textfyre begins here.

Part 1 - Assertions

Chapter 1 - Stubs - For Release

To assert the/-- equality of (m - a thing) and (n - a thing), critically:
	do nothing;

To assert the/-- equality of (m - a number) and (n - a number), critically:
	do nothing;

To assert the/-- inequality of (m - a thing) and (n - a thing), critically:
	do nothing;

To assert that/-- (C - a condition) issuing (report - indexed text), critically:
	do nothing

To assert that/-- (T - a truth state) issuing (report - some text), critically:
	do nothing;

Chapter 2 - Definitions - Not For Release

To assert the/-- equality of (m - a thing) and (n - a thing), critically:
	let the failure be indexed text;
	let the failure be "[m] == [n].";
	if critically:
		assert that m is n issuing failure, critically;
	otherwise:
		assert that m is n issuing failure;

To assert the/-- equality of (m - a number) and (n - a number), critically:
	let the failure be indexed text;
	let the failure be "[m] == [n].";
	if critically:
		assert that m is n issuing failure, critically;
	otherwise:
		assert that m is n issuing failure;

To assert the/-- inequality of (m - a thing) and (n - a thing), critically:
	let the failure be indexed text;
	let the failure be "[m] =/= [n].";
	if critically:
		assert that m is not n issuing failure, critically;
	otherwise:
		assert that m is not n issuing failure;

To assert the/-- inequality of (m - a number) and (n - a number), critically:
	let the failure be indexed text;
	let the failure be "[m] =/= [n].";
	if critically:
		assert that m is not n issuing failure, critically;
	otherwise:
		assert that m is not n issuing failure;

To assert that/-- (C - a condition) issuing (report - indexed text), critically:
	(- TF_Assertion ({C}, {report}, {critically}); -);

To assert that/-- (T - a truth state) issuing (report - some text), critically:
	if T is false:
		bug "[bracket]ASSERTION FAILURE[close bracket]: [report]";
		if critically:
			stop the game abruptly;
		rule fails;
	otherwise:
		warning "[bracket]assertion passed[close bracket]: [report]";

Include (-
[ TF_Assertion T report;
	if (~~(T)) {
		print "[ASSERTION FAILED";
		if (metaclass(report) == String) {
			print ": ", (string) report;
		} else if (metaclass(report) == Routine) {
			print ": "; report.call();
		} else if (BlkType(report) == INDEXED_TEXT_TY) {
			print ": "; INDEXED_TEXT_TY_Say (report);
		} else {
			print " -- without a printable report.";
		}
		print "]^";
		rfalse;
	}
	rtrue;
];
-).

Part 2 - Unit tests

Chapter 1 - Definitions - For Release

A unit test is a kind of thing.

The unit test rules are an object-based rulebook.
The unit test rules have default success.

Chapter 2 - Implementation - Not For Release

Unit test executing is an action applying to one visible thing.
Understand "execute [any unit test]" as unit test executing.

Carry out unit test executing:
	abide by the unit test rules for the noun;

Part 3 - Bugs, Warnings, Placeholders

Section 1 - Stubs - For Release

To bug (X - indexed text):
	do nothing;

To warning (X - indexed text):
	do nothing;

To placeholder (X - indexed text):
	say X;

To debug (X - indexed text):
	do nothing;

To say placeholder -- beginning say_placeholder:
	do nothing.

To say end placeholder -- ending say_placeholder:
	do nothing.


Section 2 - Not For Release

[By placing these second in the source, we ensure that the previous definitions are overridden.]

To bug (X - indexed text):
	say "[b]****[bracket]BUG[close bracket]: [X]****[r][paragraph break]";
	say "[one of](Don't panic.)[paragraph break][or][stopping]";

To warning (X - indexed text):
	if warning-display is true:
		say "[bracket][b]WARNING[r][close bracket]: [X][paragraph break]";
	otherwise:
		do nothing;

[This one won't compile in release mode - deliberately so!]
To placeholder:
	say "[bracket]placeholder: please fill this gap with some text![close bracket][paragraph break]";

To placeholder (X - indexed text):
	say "[bracket]placeholder text: '[X]'[close bracket][paragraph break]";

To debug (X - indexed text):
	say "[bracket]debug[close bracket] [X][paragraph break]";


To say placeholder -- beginning say_placeholder:
	say "[bracket]placeholder text: '";

To say end placeholder -- ending say_placeholder:
	say "'[close bracket][paragraph break]";


Section 3 - Not For Release

Warning-display is a truth state that varies. Warning-display is false.

Toggling warnings is an action out of world applying to nothing. Understand "warnings" as toggling warnings.

Carry out toggling warnings:
	now warning-display is whether or not warning-display is false;

Report toggling warnings:
	say "[bracket]Warnings will [if warning-display is true]now[otherwise]not[end if] be displayed[close bracket][paragraph break]";


Part 3 - miscellaneous

Section 1 - ifndef debug compiler directives

[these I wrap around anything that is "for release only", such as the PAUSE THE GAME phrase which breaks the Skein and many TEST ME commands]
To ifndef debug: [do nothing.] (- #ifndef DEBUG; -).
To enddef debug: [do nothing.]  (-  #endif; -). 


Section 2 - showing Inform's scheduled events

[Use from a rule, like this :

Every turn: say future events.

]

To say future events: (- sfe(); -).

Include (-
[ sfe i rule;
	print (TimedEventsTable-->0), " pending events: ";
	for (i=1: i<=(TimedEventsTable-->0): i++)
		!if ((rule=TimedEventsTable-->i) ~= 0)
		{ rule=TimedEventsTable-->i;
  		  print (RulePrintingRule) rule, "(", (TimedEventTimesTable-->i), "), "; }
	print "^";

];-).


Part 4 - Stopping abruptly (For use without Basic Screen Effects by Emily Short)

To stop the/-- game abruptly:
	(- quit; -)
				
Test Suite ends here.

---- DOCUMENTATION ----

A tentative step towards providing development tools to assist in assuring correct implementation.

Chapter: Bugs, Warnings and Placeholder Text

The extension provides three means by which programmers can indicate areas where the code is in need of attention. These are made apparent when they occur during gameplay in a debug build, but pass silently by in release builds.

Section: Bugs

Bugs can be marked in the text thus:

	bug "This is a bug.";

Bugs can be used to keep track of areas where there are implementation details which are unanticipated in the design, and also to ensure that assumptions about program structure are correct.

Section: Warnings

Warnings are a lesser category of bugs, but they are treated in a similar way. They are never normally output at all, but their output can be turned on and off by an in-game command available only in development builds.

	warning "You have been warned.";

Section: Placeholder Text

Placeholders indicate where a textual response needs to be output, but one is not available. These are indicated by a "[placeholder text]" tag during gameplay in development builds, but output as plain text in release builds.

	placeholder "This is placeholder text for some action.";

Or even just:

	placeholder;

...which prints a generic message calling for more text to be provided. Be advised that this is a drastic measure indicating severe incompleteness, and as such, games using this phrase will not successfully compile for release!