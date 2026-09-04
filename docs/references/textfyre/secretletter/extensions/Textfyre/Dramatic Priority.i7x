Dramatic Priority by Textfyre begins here.

"A means by which important events can take priority over less important ones, so dramatic verisimilitude can be maintained."

Use authorial modesty.

Include Triggers by Textfyre.
Include Scripted Events by Textfyre.

Dramatic importance is a kind of value. The dramatic importances are trivial, unimportant, interesting, important, essential, and show-stopping.

The current tension is a dramatic importance that varies. The current tension is [initially] trivial.

A dramatic event is a kind of trigger.
A dramatic event has a text called the display text.

A dramatic event has a dramatic importance called the priority.
The priority of a dramatic event is usually unimportant.
Understand the priority property as describing a dramatic event.

Rule for firing a dramatic event (called x):
	if the display text of x is not "",
		say the display text of x, paragraph break;

The dramatic possibilities is a list of objects [dramatic events] that varies.
The deferred dramatic possibilities is a list of objects [dramatic events] that varies.

When play begins:
	change the dramatic possibilities to {};
	change the deferred dramatic possibilities to {};

Deferring dramatic possibilities is an activity.

Rule for deferring dramatic possibilities:
	let p be trivial;
	if the dramatic possibilities is not empty:
		sort the dramatic possibilities in reverse priority order;
		repeat with x running through the dramatic possibilities:
			if the priority of x is at least p:
				change p to the priority of x;
				if p is show-stopping:
					change p to essential;
			otherwise if the priority of x is at least important and the priority of x is at most essential:
				add x to the deferred dramatic possibilities, if absent;
				remove x from the dramatic possibilities;
			otherwise if the priority of x is at most interesting:
				remove x from the dramatic possibilities;

Choosing a dramatic possibility is an activity.

The chosen event is a dramatic event that varies.

First before choosing a dramatic possibility:
	change the chosen event to nothing;

For choosing a dramatic possibility:
	unless the dramatic possibilities is empty:
		sort the dramatic possibilities in random order;
		sort the dramatic possibilities in reverse priority order;
		change the chosen event to entry 1 of the dramatic possibilities;

Last after choosing a dramatic possibility:
	if the chosen event is not nothing:
		unless the priority of the chosen event is at least the current tension:
			if the priority of the chosen event is less than important:
				remove the chosen event from the dramatic possibilities, if present;
			change the chosen event to nothing;

Last every turn (this is the dramatic priority rule):
	carry out the deferring dramatic possibilities activity;
	carry out the choosing a dramatic possibility activity;
	if the chosen event is not nothing:
		fire the chosen event;
		unless the rule failed:
			remove the chosen event from the dramatic possibilities;
	add the deferred dramatic possibilities to the dramatic possibilities;
	change the deferred dramatic possibilities to {};
	change the current tension to trivial;

To ratchet the current tension to (boiling point - a dramatic importance):
	if the current tension is less than boiling point:
		change the current tension to boiling point;

Dramatic Priority ends here.

---- DOCUMENTATION ---- 

Dramatic Priority is a support library that attempts to improve narrative realism by allowing the most important in-game events to occur by themselves, unimpeded by possibly bathetic intrusions from other sources. To invent an extreme example - possible but immensely unlikely in "The Secret Letter":

	> WAIT
	Time passes.

	The stallkeeper carefully straightens his display of cheese.

	Those mercenaries are getting uncomfortably close. You'd better get going before they notice you!

	One of the mercenaries bumps into a passing shopper, and angrily shoves him out of his way.

	A fat servant with crooked teeth squeezes past you.

Reading through them now, we could reclassify these messages (excepting "Time passes") as unimportant, important, interesting, and unimportant, respectively. The purpose of this extension, therefore, is to allow the important events to stand out, the interesting ones to survive, and the trivial ones to die: as quietly and unremarkably as if they had never considered happening at all.
