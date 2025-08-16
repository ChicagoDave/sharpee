Version 1/140610  of Portals by Roger Carbol begins here.

"A portal is a magical sort of conduit that can dynamically connect two rooms."

Use authorial modesty. 

Chapter 1 - Definitions

Section 1 - Portals Defined

A portal is a kind of person.  [So we can turn the player into it, for looking around.]

The specification of portal is "Represents a magical sort of conduit that can join two rooms.  Unlike doors, this connection can be changed dynamically, a process called 'directing'.  Furthermore, portals remember every other portal they have ever been directed to (or from), called its connections.  Finally, portals can sense other portals nearby if you wave one around."

A portal has a number called strength.  The strength of a portal is usually 3.
A portal has a number called the signal.  [These are used for detecting nearby portals.]

A portal is usually neuter.

A portal can be enterable.  A portal is usually enterable.

A portal can be open or closed. A portal is usually open.
A portal can be openable or unopenable. A portal is usually unopenable.
A portal can be intact or broken.  A portal is usually intact.
A portal can be enterable.  A portal is usually enterable.

A portal can be open or closed. A portal is usually open.
A portal can be openable or unopenable. A portal is usually unopenable.
A portal can be intact or broken.  A portal is usually intact.

A portal can be reach-enabled or reach-disabled.  A portal is usually reach-enabled.

A portal can be darkly or brightly.  A portal is usually brightly.  [They usually provide light from a bright room into a dark room.]

A portal can be known or unknown.  A portal is usually unknown.

A portal can be fake or nonfake.  A portal is usually nonfake.

A portal can be small, medium, or large.  A portal is usually large.

The viewpoint is a privately-named portal.  The viewpoint is nowhere.  The viewpoint is fake.[used to abuse room headings]

Section 2 - Portals as Light Sources

The lamplighter is a privately-named portal.  The lamplighter is nowhere.  The lamplighter is fake.[used to spread light through portals]

A portal can be lamplit or unlamplit.  A portal is usually unlamplit.

Before printing the name of a nonfake portal (called the portal being printed) (this is the make named portals mentioned and known rule):
	if expanding text for comparison purposes, continue the activity;
	now the portal being printed is known;
	now the portal being printed is mentioned.	
	
Every turn (this is the prepare and light lamps rule):
	repeat with item running through brightly directed portals:
		now the item is unlamplit;
	follow the light lamps rule.
		
[The light lamps rule is listed before the check light in new location rule in the carry out going rulebook.]
The prepare and light lamps rule is listed after the move floating objects rule in the carry out going rulebook.

This is the light lamps rule:
	repeat with item running through brightly nonfake portals:
		if the item is undirected:	[undirected portals are always unlit]
			now the item is unlit;
			now item is lamplit;
		otherwise:
			let the endpoint be the terminus of the item;
			if the location of the item is the location of the endpoint:  [a location can't illuminate itself]
				now the item is unlit;			
				now the endpoint is unlit;		
				now item is lamplit;
				now endpoint is lamplit;
			otherwise:
				if the endpoint is brightly:		
					let item_darkness be false;
					let endpoint_darkness be false;
					now the home of the item is the holder of the item;
					now the item is nowhere;
					now the home of the endpoint is the holder of the endpoint;
					now the endpoint is nowhere;
					now temp_PC is the player;					
					move the lamplighter to the home of the item;					
					now the player is the lamplighter;
					if the player is invisible, now item_darkness is true;
					move the player to the home of the endpoint;
					if the player is invisible, now endpoint_darkness is true;	
					now the player is temp_PC;	
					move the item to the home of the item;					
					move the endpoint to the home of the endpoint;			
					now the lamplighter is nowhere;
					if item_darkness is false and item is unlamplit:
						if endpoint_darkness is true:
							now endpoint is lit;
						otherwise:
							now the endpoint is unlit;
					if endpoint_darkness is false and endpoint is unlamplit:
						if item_darkness is true:
							now item is lit;
						otherwise:
							now the item is unlit;
					now item is lamplit;
					now endpoint is lamplit;
					now temp_PC is the player;	[forces room visibility to update]
					move the lamplighter to the home of the item;					
					now the player is the lamplighter;
					move the player to the home of the endpoint;
					now the player is temp_PC;
					now the lamplighter is nowhere.
					
Section 3 - Changes to Other Definitions

A person has an object called home.  [used to abuse room headings]

A person has a list of portals called the list of nearby portals.
A person has a number called the portal insensitivity.  The portal insensitivity of a person is usually 99.  The portal insensitivity of yourself is 1.  The portal insensitivity of a portal is usually 0.  [These are used for detecting nearby portals.]

temp_PC is initially yourself.

A room can be scried or unscried. A room is usually unscried.

Definition: A room is beheld rather than unbeheld if it is visited or it is scried.

A room has a text called portal preposition.  The portal preposition of a room is usually "in ".
A room has a text called portal article.  The portal article of a room is usually "the ".
A room can be portal proper-named or portal improper-named.  A room is usually portal improper-named.

A container has a text called portal preposition.  The portal preposition of a container is usually "in ".
A container has a text called portal article.  The portal article of a container is usually "the ".
A container can be portal proper-named or portal improper-named.  A container is usually portal improper-named.

A supporter has a text called portal preposition.  The portal preposition of a supporter is usually "on ".
A supporter has a text called portal article.  The portal article of a supporter is usually "the ".
A supporter can be portal proper-named or portal improper-named.  A supporter is usually portal improper-named.

[These are used primarily in listing connections and listing nearby portals.]

A thing can be hard or soft.  A thing is usually soft.  [Hard things can break a mirror.  Don't make a portal hard.]
A thing can be a projectile.  A thing is usually not a projectile.  [Used for throwing things at portals.]

Section 4 - Making Portals Less Animate - Rule Removals

The can't take other people rule does nothing when the noun is a portal.	
The can't pull people rule does nothing when the noun is a portal.	
The can't push people rule does nothing when the noun is a portal. 	
The can't turn people rule does nothing when the noun is a portal.	

The innuendo about squeezing people rule does nothing when the noun is a portal.	
The can't rub another person rule does nothing when the noun is a portal.	
[These redirect to touching.]

The report touching other people rule does nothing when the noun is a portal.	

Section 5 - Making Portals Less Animate - Rule Additions

[Irritatingly, these failures advances the game turn clock, while a 'real' parser error does not.  But not quite irritating to bother with fixing.  Still, mentioned for completeness.]

[The parser error internal rule translates into I6 as  [...]  "You can only do that to something animate." (M),  ]

Check an actor kissing (this is the block kissing portals rule):
	if the actor is the player and the noun is a portal:
		say "[text of parser error internal rule response (M)][line break]" (A);
	stop the action.
	
The block kissing portals rule is listed before the block kissing rule in the check kissing rules.	

Check an actor showing something to (this is the block showing to portals rule):
	if the actor is the player and the second noun is a portal:
		say "[text of parser error internal rule response (M)][line break]" (A);
	stop the action.
		
The block showing to portals rule is listed before the block showing rule in the check showing it to rules.	

Check an actor waking (this is the block waking portals rule):
	if the actor is the player and the noun is a portal:
		say "[text of parser error internal rule response (M)][line break]" (A);
	stop the action.
		
The block waking portals rule is listed before the block waking rule in the check waking rules.	

Report an actor answering something that (this is the block answering portals rule):
	if the actor is the player and the noun is a portal:
		say "[text of parser error internal rule response (M)][line break]" (A);
	stop the action.

The block answering portals rule is listed before the block answering rule in the report answering it that rules.	

Report an actor telling something about (this is the block telling portals rule):
	if the actor is the player and the noun is a portal:
		say "[text of parser error internal rule response (M)][line break]" (A);
	stop the action.

The block telling portals rule is listed before the block telling rule in the report telling it about rules.	

Report an actor asking something about (this is the block asking portals rule):
	if the actor is the player and the noun is a portal:
		say "[text of parser error internal rule response (M)][line break]" (A);
	stop the action.

The block asking portals rule is listed before the block asking rule in the report asking it about rules.	

Rule for deciding whether all includes portals while taking or taking off or
	removing (this is the include portals from take all rule): it does.

Chapter 2 - Relations for Portals

Section 1 - The Directing To Relation

Directing to relates one portal to another (called the terminus).

The verb to direct to means the directing to relation.	

Definition: a portal (called the origin) is undirected rather than directed if the origin directs to nothing or the origin directs to the origin.

Section 2 - The Connecting To Relation

Connection relates portals to each other.

The verb to connect to means the connection relation.	
The verb to be connected by means the reversed connection relation.

Chapter 3 - Actions for Portals

Section 1 - Rules for Examining Portals

[This is a moderately-abusive hack, but it seems to be effective.  Note that this rule follows the standard examining rule so we get the noun description first.]
Carry out examining (this is the examine portals rule):
	if the noun is a portal:
		if the noun is directed:
			if the location of the noun is the location:
				say "Through [the noun] [we] [see]...[paragraph break]" (A);
				now temp_PC is the player;
				now the player is the terminus of the noun;
				try looking;		
				now the player is temp_PC;
				now examine text printed is true;  [I'm not entirely sure what this does, but it seems standard.]
			otherwise:  [we are remotely-viewing the portal]
				say "From this vantage [we] [can't] see into [the noun]." (B);
				now examine text printed is true; 
		otherwise:
			if the noun is broken:
				say "Broken, [the noun] [seem] to reflect [our] fractured surroundings." (C);
				now examine text printed is true;
			otherwise:
				say "[The noun] [seem] to reflect [our] surroundings." (D);
				now examine text printed is true.					
			
Rule for writing a paragraph about temp_pc when the player is a portal:	
	say "Disconcertingly, [we] [can see] [ourselves] peering into [the terminus of the player]." 

[This is much worse than it would otherwise be because I'm also using it to construct the description of the surroundings of connected portals.]
Carry out looking (this is the portalized room description heading rule):
	if the actor is the lamplighter, stop the action;
	if the home of the actor is not a portal:
		say bold type;
	if the visibility level count is 0:
		begin the printing the name of a dark room activity;
		if handling the printing the name of a dark room activity:
			if the home of the actor is not a portal:
				say "Darkness" (A);
			otherwise:
				say "darkness" (E);
		end the printing the name of a dark room activity;
	otherwise if the visibility ceiling is the location:
		if the home of the actor is not a portal:
			say "[visibility ceiling]"  (G);
		otherwise:
			if the visibility ceiling is portal proper-named:
				say "[portal preposition of the visibility ceiling][portal article of the visibility ceiling][visibility ceiling]" (H);	
			otherwise:
				say "[portal preposition of the visibility ceiling][portal article of the visibility ceiling][visibility ceiling]" (I) in lower case;	
	otherwise:
		if the home of the actor is not a portal:
			say "[The visibility ceiling]" (J);
		otherwise:
			if the visibility ceiling is portal proper-named:
				say "[portal preposition of the visibility ceiling][portal article of the visibility ceiling][visibility ceiling]" (K);	
			otherwise:
				say "[portal preposition of the visibility ceiling][portal article of the visibility ceiling][visibility ceiling]" (L) in lower case;	
	say roman type;
	let intermediate level be the visibility-holder of the actor;
	repeat with intermediate level count running from 2 to the visibility level count:
		if the intermediate level is a supporter or the intermediate level is an animal:
			if the home of the actor is not a portal:
				say " (on [the intermediate level])" (B);
			otherwise:
				if the visibility ceiling is portal proper-named:
					say " ([portal preposition of the intermediate level][portal article of the intermediate level][intermediate level])" (M);	
				otherwise:
					say " ([portal preposition of the intermediate level][portal article of the intermediate level][intermediate level])" (N) in lower case;			
		otherwise:
			if the intermediate level is the player: 
				if the home of the actor is not a portal:
					say " (from [our] inventory)" (D);
				otherwise:
					say " (in [our] inventory)" (F);	
			otherwise:
				if the home of the actor is not a portal:
					say " (in [the intermediate level])" (C);
				otherwise:
					if the visibility ceiling is portal proper-named:
						say " ([portal preposition of the intermediate level][portal article of the intermediate level][intermediate level])" (O);	
					otherwise:
						say " ([portal preposition of the intermediate level][portal article of the intermediate level][intermediate level])" (P) in lower case;
		let the intermediate level be the visibility-holder of the intermediate level;
	if the home of the actor is not a portal:
		say line break;
		say run paragraph on with special look spacing;
	otherwise:
		say run paragraph on;
		stop the action.				

The portalized room description heading rule is listed instead of the room description heading rule in the carry out looking rulebook.

For printing a locale paragraph about a thing (called the item) (this is the sometimes mention player's supporter rule):
	if the item encloses the player and the player is not a portal, set the locale priority of the item to 0;
	continue the activity.	
	
The don't mention player's supporter in room descriptions rule is not listed in any rulebook. 
[replaced by the sometimes mention player's supporter rule.]

For printing the locale description (this is the portalized-you-can-also-see rule):
	let the domain be the parameter-object;
	let the mentionable count be 0;
	repeat with item running through things:
		now the item is not marked for listing;
	repeat through the Table of Locale Priorities:
		if the locale description priority entry is greater than 0,
			now the notable-object entry is marked for listing;
		increase the mentionable count by 1;
	if the mentionable count is greater than 0:
		repeat with item running through things:
			if the item is mentioned:
				now the item is not marked for listing;
		begin the listing nondescript items activity with the domain;
		if the number of marked for listing things is 0:
			abandon the listing nondescript items activity with the domain;
		otherwise:
			if handling the listing nondescript items activity with the domain:
				if the domain is not temp_pc:  [this line added]
					if the domain is the location:
						say "[We] " (A);
					otherwise if the domain is a supporter or the domain is an animal:
						say "On [the domain] [we] " (B);
					otherwise:
						say "In [the domain] [we] " (C);
					if the locale paragraph count is greater than 0:
						say "[can] also see " (D);
					otherwise:
						say "[can] see " (E);
					let the common holder be nothing;
					let contents form of list be true;
					repeat with list item running through marked for listing things:
						if the holder of the list item is not the common holder:
							if the common holder is nothing,
								now the common holder is the holder of the list item;
							otherwise now contents form of list is false;
						if the list item is mentioned, now the list item is not marked for listing;
					filter list recursion to unmentioned things;
					if contents form of list is true and the common holder is not nothing,
						list the contents of the common holder, as a sentence, including contents,
							giving brief inventory information, tersely, not listing
							concealed items, listing marked items only;
					otherwise say "[a list of marked for listing things including contents]";
					if the domain is the location, say " here" (F);
					say ".[paragraph break]";
					unfilter list recursion;
			end the listing nondescript items activity with the domain;
	continue the activity.	

The portalized-you-can-also-see rule is listed instead of the you-can-also-see rule in the for printing the locale description rulebook.

Check an actor searching (this is the convert searching portals to examining rule):
		if the noun is a portal, convert to the examining action on the noun.

The can't search unless container or supporter rule does nothing when the noun is a portal.  [LOOK IN MIRROR]
	
Carry out looking (this is the check new arrivals and scriers rule):
	if in darkness:
		now the darkness witnessed is true;
	otherwise:
		if the location is a room:
			if the player is a portal:
				now the location is scried;
			otherwise:
				 now the location is visited.

The check new arrivals and scriers rule is listed instead of the check new arrival rule in the carry out looking rulebook.

Section 2 - Directing Portals

Directing it to is an action applying to two things.

The specification of the directing it to action is "DIRECT TINY MIRROR TO BIG MIRROR opens up the magical portal between the two.  For this to work, we need to be in the location of at least one of them, and a connection between them must exist -- unless we have both of them in our location.  The order of the nouns does not matter.  They must also both be intact and not broken.  Any existing directed-relations on each portal is superceded."

Check an actor directing something to (this is the can't direct a nonportal rule):
	if the noun is not a portal:
		if the actor is the player:
			say "[regarding the noun][Those] [don't] seem to be something [we] [can] direct." (A);
		stop the action.

Check an actor directing something to (this is the can't direct to a nonportal rule):
	if the second noun is not a portal:
		if the actor is the player:
			say "[regarding the second noun][Those] [don't] seem to be something to which [we] [can] direct." (A);
		stop the action.

Check an actor directing something to (this is the can't direct a broken nonportal rule):
	if the noun is a broken portal:
		if the actor is the player:
			say "[The noun] [seem] to be broken." (A);
		stop the action.

Check an actor directing something to (this is the can't direct to a broken nonportal rule):
	if the second noun is a broken portal:
		if the actor is the player:
			say "[The second noun] [seem] to be broken." (A);
		stop the action.

Check an actor directing something to (this is the already directed rule):
	if the noun directs to the second noun:
		if the actor is the player:
			say "[The noun] [are] already directed to " (A); 
			if the noun is the second noun:
				say "[themselves]." (B); 
			otherwise:
				say "[the second noun]." (C);
		stop the action.

Check an actor directing something to (this is the can't direct to an unconnected or nonpresent portal rule):
	if the location of the noun is the location and the location of the second noun is the location:
		continue the action;
	otherwise:
		if the location of the noun is not the location and the location of the second noun is not the location:
			if the actor is the player:
				say "[We] [can't] see either such thing." (C);
			stop the action;
		otherwise:
			if the location of the noun is the location:
				if the second noun connects to the noun:
					continue the action;
				otherwise:
					if the actor is the player:
						say "[The noun] [have] never been connected to [the second noun], so [regarding the player][we] [can't] direct [the noun] to [regarding the second noun][them] -- unless [regarding the player][we] [can] get into the presence of [the second noun], of course." (A);
					stop the action;
			if the location of the second noun is the location:
				if the noun connects to the second noun:
					continue the action;
				otherwise:
					if the actor is the player:
						say "[The noun] [have] never been connected to [the second noun], so [regarding the player][we] [can't] direct [the second noun] to [regarding the noun][them] -- unless [regarding the player][we] [can] get into the presence of [the noun], of course." (B);
					stop the action.
				
Carry out an actor directing something to (this is the standard directing rule):
	now the noun directs to the second noun;
	follow the light lamps rule;
	if the noun connects to the second noun:
		do nothing;
	otherwise:
		if the noun is not the second noun:
			now the noun connects to the second noun.						

To direct is a verb.
				
Report an actor directing something to (this is the standard report directing rule):
	if the actor is the player:
		if the action is not silent:
			if the noun is the second noun:
				say "[We] [direct] [the noun] to [themselves]." (A);
			otherwise:
				say "[We] [direct] [the noun] to [the second noun]." (B);
	otherwise:
		if the actor is visible:
			say "[The actor] [direct] [the noun] to [the second noun]." (C);

Understand "direct [something preferably held] to [something]" as directing it to.

Understand "undirect [something preferably held]" as undirecting.

Undirecting is an action applying to one thing.

The specification of the undirecting action is "Undirecting is exactly equivalent to directing a portal to itself, although note that a portal never has a connection to itself."

Check an actor undirecting (this is the convert undirecting rule):
	convert to request of the actor to perform directing it to action with the noun and noun.

Section 3 - Entering Portals

Rule for setting action variables for going (this is the portalized standard set going variables rule):
	now the thing gone with is the item-pushed-between-rooms;
	now the room gone from is the location of the actor;
	let the target be nothing;
	if the noun is a portal:  [the new part]
		let the target be the noun;
		now the door gone through is the target;
		now the target is the terminus of the target;
		now the target is the holder of the target;
	otherwise:
		if the actor is in an enterable vehicle (called the carriage),
			now the vehicle gone by is the carriage;	
	if the noun is a direction:
		let direction D be the noun;
		let the target be the room-or-door direction D from the room gone from;
	otherwise:
		if the noun is a door, let the target be the noun;
	if the target is a door:
		now the door gone through is the target;
		now the target is the other side of the target from the room gone from;
	now the room gone to is the target.
		
The portalized standard set going variables rule is listed instead of the standard set going variables rule in the setting action variables rulebook.

Check an actor entering (this is the convert enter portal into go rule):
	if the noun is a portal, convert to the going action on the noun.	
	
The can't enter something carried rule does nothing when the noun is a portal.	
The implicitly pass through other barriers rule does nothing when the noun is a portal.	
	
Check an actor going (this is the portalized determine map connection rule):
	let the target be nothing;
	if the noun is a direction:
		let direction D be the noun;
		let the target be the room-or-door direction D from the room gone from;
	otherwise:
		if the noun is a door, let the target be the noun;
		if the noun is a portal, let the target be the noun;
	if the target is a door:
		now the target is the other side of the target from the room gone from;
	if the target is a portal:  [the new part]
		now the target is the terminus of the target;
		now the target is the holder of the target;	
	now the room gone to is the target.
 	
The portalized determine map connection rule is listed instead of the determine map connection rule in the check going rulebook. 	

Check an actor going (this is the can't enter medium portals rule):
	if the door gone through is a portal:
		if the actor is the player:
			if the door gone through is medium:			
				say "[The door gone through] [are] too small for [us] to enter." (A);
				stop the action.
										
Check an actor going (this is the can't enter small portals rule):
	if the door gone through is a portal:
		if the actor is the player:
			if the door gone through is small:			
				say "[The door gone through] [are] far too small for [us] to enter." (A);
				stop the action.
				
Check an actor going (this is the can't exit medium portals rule):
	if the door gone through is a portal:
		if the actor is the player:
			let the endpoint be the terminus of the door gone through;
			if the endpoint is medium:			
				say "[The door gone through] [are] directed to [the endpoint], which [are] too small for [us] to enter." (A);
				stop the action.					
				
Check an actor going (this is the can't exit small portals rule):
	if the door gone through is a portal:
		if the actor is the player:
			let the endpoint be the terminus of the door gone through;
			if the endpoint is small:			
				say "[The door gone through] [are] directed to [the endpoint], which [are] far too small for [us] to enter." (A);
				stop the action.	

Check an actor going (this is the can't destroy spacetime while going rule):
	if the door gone through is a portal:
		if the actor is the player:
			let the endpoint be the terminus of the door gone through;
			if the player encloses the endpoint:			
				say "[We] [seem] to be carrying [the endpoint], and as [the door gone through] [are] directed to [the endpoint], that course of action [are] unwise, to say the least." (A);
				stop the action.

Check an actor going (this is the can't port into what's not enterable rule):
	if the door gone through is a portal:
		if the room gone to is a container:
			if the room gone to is not enterable:
				if the actor is the player:
					let the endpoint be the terminus of the door gone through;
					say "[We] [can't], since [the door gone through] [lead] to [the endpoint], and [the endpoint] is [portal preposition of the room gone to][the room gone to], which [we] [cannot] enter." (A);						
[					say "[The door gone through] [seem] to lead somewhere [we] [cannot] enter." (A);]
				stop the action.			

Check an actor going (this is the can't port if this exceeds carrying capacity rule):
	if the door gone through is a portal:
		if the room gone to provides the property carrying capacity:
			if the room gone to is a supporter:
				if the number of things on the room gone to is at least the carrying capacity of the room gone to:
					if the actor is the player:
						let the endpoint be the terminus of the door gone through;						
						say "[We] [can't], since [the door gone through] [lead] to [the endpoint], and [the endpoint] is [portal preposition of the room gone to][the room gone to], and [there] [are] no more room for [us] [portal preposition of the room gone to][the room gone to]."  (A);
[						say "[The door gone through] [seem] to lead somewhere [we] [cannot] fit." (A);]
					stop the action;
			otherwise if the room gone to is a container:
				if the number of things in the room gone to is at least the carrying
					capacity of the room gone to:
					if the actor is the player:
						let the endpoint be the terminus of the door gone through;						
						say "[We] [can't], since [the door gone through] [lead] to [the endpoint], and [the endpoint] is [portal preposition of the room gone to][the room gone to], and [there] [are] no more room for [us] [portal preposition of the room gone to][the room gone to]."  (B);	
[						say "[The door gone through] [seem] to lead somewhere [we] [cannot] fit."  (B);]
					stop the action;
	
Check an actor going (this is the can't enter undirected portals rule):
	if the door gone through is an undirected portal:
		if the actor is the player:
			say "[We] [can't], since [the door gone through] [lead] nowhere." (A);						
		stop the action.	
	
Report an actor going (this is the describe the portal experience rule):
	if the player is the actor and the noun is a portal:
		if the action is not silent:
			say "[We] [feel] a familiar tingling sensation, and [find] [ourselves] elsewhere..." (A);
			continue the action.
		
The describe the portal experience rule is listed before the describe room gone into rule in the report going rulebook.

Section 4 - Touching Portals and Listing Connections

Report an actor touching a portal (this is the report touching portals rule):
	if the actor is the player:
		if the action is not silent:
			say "[We] [touch] [the noun], " (A);
			if the noun is broken:
				say "but since [they] [are] broken, [their] connections are lost." (E); 
				stop the action;
			otherwise:
				let the connectivity be the number of entries in list of portals to which the noun relates by the connection relation;
				if the connectivity is 0:
					say "but [we] [cannot] recall [regarding the noun][them] ever being connected." (C);
					stop the action;
				otherwise:	
					say "and [regarding the player][find] [ourselves] reminded of [regarding the noun][their] connection[run paragraph on]" (D);
					print connections of noun;
	otherwise:
		say "[The actor] [touch] [the noun]." (B);
	stop the action.

Check an actor squeezing (this is the convert squeezing portals to touching rule):
	if the noun is a portal, convert to the touching action on the noun.
	
Check an actor rubbing (this is the convert rubbing portals to touching rule):
	if the noun is a portal, convert to the touching action on the noun.	

To print connections of (P - portal):
	follow the for printing the connections rulebook.

For printing the connections rulebook is a rulebook.
	
This is the prepare the connected portals rule:
	repeat with item running through portals connected by the noun: 
		now the home of the item is the holder of the item;
		move the item to the noun.

The prepare the connected portals rule is listed first in the for printing the connections rulebook.	[first]
	
This is the standard printing the connections rule:
	let the connectivity be the number of entries in list of portals to which the noun relates by the connection relation;
	if the connectivity is 1:
		say(" -- to ");
		list the contents of the noun, as a sentence, tersely;
		say (".");
	otherwise:	
		say("s:[line break]");
		list the contents of the noun, with newlines, indented, with extra indentation.
	
The standard printing the connections rule is listed last in the for printing the connections rulebook.  [middle]

This is the reset the connected portals rule:
	repeat with item running through portals carried by the noun: 
		move the item to the home of the item.

The reset the connected portals rule is listed last in the for printing the connections rulebook.  [last]
 
After printing the name of a portal (called target) while touching (this is the abusive room headings rule): 
	if the target is not the noun:
		abuse the room headings for target.

To abuse the room headings for (target - portal):
		say " ([run paragraph on]";
		now the home of the viewpoint is the holder of the target;
		move the viewpoint to the home of the target;
		now temp_PC is the player;
		now the player is the viewpoint;
		try looking;		
		now the player is temp_PC;
		now the viewpoint is nowhere;
		say ")".

Section 5 - Sensing Nearby Portals

Report an actor waving a portal (this is the report waving portals rule):
	if the actor is the player:
		if the action is not silent:
			say "[We] [wave] [the noun] [run paragraph on]" (A); 
			construct the list of nearby portals;
			let the connectivity be the number of entries in the the list of nearby portals of the player;
			if the connectivity is 0:
				say "but [we] [cannot] sense anything unusual nearby -- other than [the noun], of course." (C);
				stop the action;
			otherwise:	
				say "and [regarding the player][find] [we] [can] sense nearby[run paragraph on]" (D);
			print nearby portals;
	otherwise:
		say "[The actor] [wave] [the noun]." (B);
	stop the action.
			
To construct the list of nearby portals:
	follow the constructing the list of nearby portals rule.

The pseudo-detector is a fake portal. 

This is the constructing the list of nearby portals rule:
	truncate the list of nearby portals of the player to 0 entries; [empty it]
	now the player carries the pseudo-detector;	
	repeat with item running through nonfake portals:
		let the distance be the number of moves from the location to the location of the item, using even locked doors;
		if the distance is -1, now the distance is 999;  [make unreachable rooms very far away instead of very close.]
		now the signal of the item is the strength of the item minus the distance;
		let the total insensitivity be 0;
		if the noun is nothing:
			let the total insensitivity be the portal insensitivity of the player;
		otherwise:
			let the total insensitivity be the portal insensitivity of the player plus the portal insensitivity of the noun;
		if the signal of the item is at least the total insensitivity:
			if the item is not the noun and the item is not the viewpoint:
				add the item to the list of nearby portals of the player;
	if the number of entries in the list of nearby portals of the player is at least 2:
		sort the list of nearby portals of the player in signal order.

To print nearby portals:
	follow the for printing nearby portals rulebook.

For printing nearby portals rulebook is a rulebook.

This is the prepare nearby portals rule:
	repeat with item running through the list of nearby portals of the player: 
		now the home of the item is the holder of the item;
		move the item to the pseudo-detector.

The prepare nearby portals rule is listed first in the for printing nearby portals rulebook.  [first]

This is the standard printing nearby portals rule:
	let the connectivity be the number of entries in the list of nearby portals of the player;
	if the connectivity is 1:
		say(" ");
		list the contents of the pseudo-detector, as a sentence, tersely;
		say (".");
	otherwise:	
		say(":[line break]");
		list the contents of the pseudo-detector, with newlines, indented, with extra indentation.

The standard printing nearby portals rule is listed last in the for printing nearby portals rulebook. [middle]

This is the reset nearby portals rule:
	repeat with item running through portals carried by the pseudo-detector: 
		move the item to the home of the item;
	now the pseudo-detector is nowhere. 

The reset nearby portals rule is listed last in the for printing nearby portals rulebook.  [last]
 
After printing the name of a portal (called target) while waving (this is the other abusive room headings rule): 
	if the target is not the noun:
		abuse the room headings for target.

[sensing nearby portals without waving:]
Divining is an action applying to nothing.

Understand "search for/-- nearby/-- portal/portals" as divining.

To contemplate is a verb.  ['think' is a bit too irregular for comfort.]

Report an actor divining (this is the report divination rule):
	if the actor is the player:
		if the action is not silent:
			say "[We] [contemplate] for a moment [run paragraph on]" (A); 
			construct the list of nearby portals;
			let the connectivity be the number of entries in the the list of nearby portals of the player;
			if the connectivity is 0:
				say "but [we] [cannot] sense anything unusual nearby." (C);
				stop the action;
			otherwise:	
				say "and [regarding the player][find] [we] [can] sense nearby[run paragraph on]" (D);
			print nearby portals;
	otherwise:
		say "[The actor] [seem] pensive." (B);
	stop the action.
	
After printing the name of a portal (called target) while divining (this is the yet another abusive room headings rule): 
	abuse the room headings for target.	

Section 6 - Inserting Things into Portals

The can't insert into what's not a container rule does nothing when the second noun is a portal.
The standard inserting rule does nothing when the second noun is a portal.
The concise report inserting rule does nothing when the second noun is a portal.
The standard report inserting rule does nothing when the second noun is a portal.
 
Check an actor inserting something into a small portal  (this is the can't insert into small portals rule):
	if the actor is the player:
		say "[The noun] [can't] fit through [the second noun]" (A);
		 if the noun is a projectile:
			silently try the actor trying dropping the noun;
			now the noun is not a projectile;
			say ", so [regarding the noun][they] just [bounce] off" (B);
		say "." (C);
	stop the action.
				
Check an actor inserting something into a portal  (this is the can't insert through small portals rule):
	if the actor is the player:
		let the endpoint be the terminus of the second noun;
		if the endpoint is small:			
			say "[The second noun] [are] directed to [the endpoint], through which [the noun] [can't] fit" (A);
			 if the noun is a projectile:
				silently try the actor trying dropping the noun;
				now the noun is not a projectile;
				say ", so [regarding the noun][they] just [bounce] off" (B);
			say "." (C);	
			stop the action.	
 
Check an actor inserting something into a portal (this is the can't destroy spacetime while inserting rule):
	if the noun directs to the second noun:
		if the actor is the player:
			say "[The noun] [are] directed to [the second noun], so that course of action [are] unwise, to say the least." (A);
		stop the action.

Check an actor inserting something into a portal (this is the can't destroy spacetime while inserting cleverly rule):
	if the noun encloses the terminus of the second noun:
		if the actor is the player:
			say "[The noun] [seem] to contain [the terminus of the second noun], and as [the second noun] [are] directed to [the terminus of the second noun], that course of action [are] unwise, to say the least." (A);
		stop the action.

Check an actor inserting something into a portal (this is the can't insert into undirected portals rule):
	if the second noun is undirected:
		if the actor is the player:
			say "[We] [can't], since [the second noun] [lead] nowhere." (A);
		stop the action.

Check an actor inserting something into a portal(this is the can't insert if this exceeds the terminus portal holder's carrying capacity rule):
	let the endpoint be the terminus of the second noun;
	let the destination be the holder of the endpoint;
	if the destination provides the property carrying capacity:
		if the number of things in the destination is at least the carrying capacity
		of the destination or the number of things on the destination is at least the carrying capacity of the destination:
			if the actor is the player:
				now the prior named object is nothing;
				say "[We] [can't], since [the second noun] [lead] to [the endpoint], and [the endpoint] is [portal preposition of the destination] [the destination], and [there] [are] no more room [portal preposition of the destination] [the destination]." (A);
[				say "[There] [are] no more room [portal preposition of the destination] [the destination]." (A);]
			stop the action.

Carry out an actor inserting something into a portal (this is the standard inserting into portal rule):
	let the endpoint be the terminus of the second noun;
	let the destination be the holder of the endpoint;
	if the destination is a supporter:
		now the noun is on the destination;
	otherwise:
		now the noun is in the destination.

Report an actor inserting something into a portal (this is the concise report inserting into portal rule):
	if the action is not silent:
		if the actor is the player and the I6 parser is running multiple actions:
			say "Done." (A);
			stop the action;
	continue the action.

To toss is a verb.  ['Throw' is a bit too irregular for comfort.]

Report an actor inserting something into a portal (this is the standard report inserting into portal rule):
	if the action is not silent:
		let the endpoint be the terminus of the second noun;
		let the destination be the holder of the endpoint;
		say "[The actor] [if the noun is a projectile][toss][otherwise][put][end if] [the noun] into [the second noun], and [regarding the actor][see] [regarding the noun][it] arrive [run paragraph on]" (A);
		if the destination is the player:
			say 	"in [regarding the actor][our] inventory.[line break]" (B);		
		otherwise:
			if the destination is portal proper-named:
				say "[portal preposition of the destination][portal article of the destination][destination].[line break]" (H);	
			otherwise:
				say "[portal preposition of the destination][portal article of the destination][destination].[line break]" (I) in lower case;	
		now the noun is not a projectile.

Section 7 - Special Scoping for Portals	
	
Viewports is a list of portals which varies.

When play begins:
	repeat with item running through visible directed portals:
		add the terminus of the item to viewports.

Every turn:
	truncate viewports to 0 entries; [empty it]
	repeat with item running through visible directed portals:
		add the terminus of the item to viewports.
	
After deciding the scope of the player: 
	if the player is not the lamplighter:
		repeat with item running through viewports:
			now the home of the item is the holder of the item;
			let the temp_loc be the location of the item;
			now the item is nowhere;
			place the temp_loc in scope;
			move the item to the home of the item.

[This /mostly/ works, except when there's more than one portal around on either location, because we don't know which one is providing scope.  So be careful.]
This is the can reach through portals rule: 
	if the container in question is a room and the container in question is not the location: 
		if the container in question encloses a portal (called the endpoint) and the location encloses a portal (called the origin): 
			if the origin directs to the endpoint:
				if the origin is reach-disabled or the origin is small: 
					if the origin is small:
						say "[The origin] [are] too small to reach through." (A);
					otherwise:
						say "[We] [can't] reach through [the origin]." (B);
					deny access; 
				otherwise: 
					if endpoint is reach-disabled or the endpoint is small: 
						if the endpoint is small:
							say "[The origin] [direct] to [the endpoint], which [regarding the endpoint][are] too small to reach through." (C);
						otherwise:					
							say "[We] [can't] reach through [the endpoint]." (D);
						deny access; 
					otherwise:	
						allow access; 
		otherwise: 
			say "You can't reach into [the container in question] from here."; 
			deny access. 
			
The can reach through portals rule is listed instead of the can't reach inside rooms rule in the reaching inside rules. 

After deciding the scope of the player while directing:
	repeat with item running through known nonfake portals:		
		if the item connects to a portal enclosed by the location:
			place the item in scope. 

Section 8 - Throwing Things at Portals

Understand "drop [something preferably held] at/against/through [something]" as throwing it at.  [added "through"]
[Understand the commands "throw" and "discard" as "drop".]

To bounce is a verb.

Check an actor throwing something at (this is the convert throwing things at portals rule):
	if the second noun is a portal:
		if the second noun is directed:
			now the noun is a projectile;
			convert to request of the actor to perform inserting it into action with the noun and the second noun;
		otherwise:	
			if the noun is soft:
				say "[Regarding the noun][They] just [bounce] off." (A);
				silently try the actor trying dropping the noun;
				stop the action;
			otherwise:
				now the noun is a projectile;
				convert to request of the actor to perform smashing it with action upon the second noun and the noun.

Check an actor throwing something at (this is the convert throwing portals at things rule):
	if the noun is a portal:
		if the second noun is soft:
			say "[Regarding the noun][They] just [bounce] off." (A);
			silently try the actor trying dropping the noun;
			stop the action;
		otherwise:
			now the noun is a projectile;
			convert to request of the actor to perform smashing it with action upon the second noun and the noun.

[Workaround for bug http://inform7.com/mantis/view.php?id=1298 ]
To convert to request of (X - object) to perform (AN - action name) upon (Y - object) and (Z - object):
	(- return ConvertToRequest({X}, {AN}, {Y}, {Z}); -).

The convert throwing things at portals rule is listed before the futile to throw things at inanimate objects rule in the check throwing it at rules.	

The convert throwing portals at things rule is listed before the futile to throw things at inanimate objects rule in the check throwing it at rules.	

The block throwing at rule does nothing when the second noun is a portal.
The block throwing at rule does nothing when the noun is a portal.

Section 9 - Smashing Portals

Smashing it with is an action applying to one visible thing and one carried thing.

The specification of the smashing it with action is "Violence is often the answer when it comes to objects as fragile as magical mirrors."

Understand "attack [something] with [something preferably held]" as smashing it with.

Check an actor smashing something with (this is the convert smashing nonportals to attacking rule):
	if the noun is not a portal and the second noun is not a portal:
		convert to the attacking action on the noun.
		
Check an actor smashing something with (this is the can't smash with soft things rule):
	if the second noun is soft and the noun is soft:
		if the actor is the player:
			say "[Our] implement of destruction [regarding the second noun][are] ineffectual." (A);
		stop the action.
	
Check an actor smashing something with (this is the can't smash broken portals rule):
	if the noun is a broken portal:
		if the actor is the player:
			say "[Regarding the noun][They] [are] already broken." (A);
		stop the action;	
	if the second noun is a broken portal:
		if the actor is the player:
			say "[Regarding the second noun][They] [are] already broken." (B);
		stop the action;			
	
Check an actor smashing something with (this is the can't smash directed portals rule):
	if the noun is a directed portal:
		if the actor is the player:
			now the prior named object is nothing;
			say "Encountering no resistance from [the noun], [our] attempts at destruction [are] ineffectual."  (A);
		 stop the action;
	if the second noun is a directed portal:
		if the actor is the player:
			now the prior named object is nothing;
			say "Encountering no resistance from [the second noun], [our] attempts at destruction [are] ineffectual."  (B);
		 stop the action.		 

Carry out an actor smashing something with (this is the standard smashing rule):
	if the noun is a portal:
		now the noun is broken;
		now the noun directs to nothing;
		if the second noun is a projectile:
			now the second noun is not a projectile;
			silently try the actor trying dropping the second noun;
	if the second noun is a portal:
		now the second noun is broken;
		now the second noun directs to nothing;
		if the second noun is a projectile:
			now the second noun is not a projectile;
			silently try the actor trying dropping the second noun.
	
To smash is a verb.

Report an actor smashing something with (this is the standard report smashing rule):
	if the noun is a portal:
		if the actor is the player:
			if the action is not silent:
				say "[We] [smash] [the noun] with [the second noun]." (A);
		otherwise:
			if the actor is visible:
				say "[The actor] [smash] [the noun] with [the second noun]." (B);
	if the second noun is a portal:
		if the actor is the player:
			if the action is not silent:
				say "[We] [smash] [the second noun] against [the noun]." (C);
		otherwise:
			if the actor is visible:
				say "[The actor] [smash] [the second noun] against [the noun]." (D).			

Check an actor attacking a portal (this is the block attacking portals bare-handed rule):
	if the actor is the player:
		say "[We] [need] more than just [our] bare hands." (A);
	stop the action.
	
Portals ends here.

---- DOCUMENTATION ----

Chapter: Original Specification

	  > x mirror
	  It's a thin, flexible mirror about your height and width.

	  > bend mirror
	  > get mirror
	  > move mirror
	  > turn mirror
	  > flip mirror
	  > break mirror
	  > cover mirror
	  > lay mirror on floor

	  > touch mirror
	  The mirror currently shows a room in a museum from an elevated position. You can feel several more mirrors nearby and of course remember the signature of dozens of mirrors.

	  > list mirrors
	  Do you mean nearby or remembered?

	  > list nearby mirrors
	  You sense three mirrors:
		- a small gold-framed mirror currently dark
		- a very large mirror on a wall in a pawn shop currently showing jewelry-filled glass cases, a few guitars, and an LCD TV
		- a dresser mirror in an empty bedroom similar to the one you're standing in. The bedroom contains a bed with a large man watching TV and eating take-out chinese food

	  > list remembered mirrors

	  There are too many to recall at once, but you have the important ones connected to the small mirror in your left jacket pocket.

	  > i
	  You are carrying:
	   - a small rectangular mirror about the size of your palm.

	   > touch small mirror

	   You graze your hand across the mirror and remember other mirrors, including:
		- a very large mirror currently dark, but accessible for transport
		- an oval dressing mirror showing a tastefully furnished bedroom, well lit and accessible. You know this as your own apartment
		- a silver-bordered dressing mirror on a door in a hotel room, currenlty accessible
		- a plain dressing mirror showing a very small, disheveled bedroom with a scantily clad lady smoking on the bed, currently accessible

	  > direct mirror to mirror
	  It's not working. You know you need to concentrate on both the local and distant mirror's exact description to use your power.

	  > direct thin mirror to oval dressing mirror
	  Done. The thin, flexible mirror now shows your bedroom.

	  > go through mirror, walk through mirror, jump through mirror, dive through mirror
	  You feel a familiar tingling sensation, an emination of power from within, as you transport to your bedroom...

	  You step softly into.../You land roughly in.../You tumble into...

	  Your Apartment (Bedroom)

	  Your bedroom is tastefully decorated with contemporary furniture, a king-sized bed, a wide dresser, and of course the oval-shaped dressing mirror. A bathroom is to the south and the living area is to the west. The entire eastern wall is a floor to ceiling window showing the downtown Chicago city-scape.

Chapter: About Portals

A "portal" in the most generic sense is some sort of quasi-magical opening in space, as featured in the popular videogame of the same name.

The two main modes provided by a portal (or a pair of portals, which is the most common configuration) are:

1)  The Window:  Much like a window, we can look through one side and view the opposite side.  Furthermore, brightness on one side can illuminate the gloom of the other side.  With this extension, I've tried to remain neutral as to whether this remote-viewing is more like looking at a television set from a safe distance or more like sticking your entire head through an open window and looking around; you may find it useful to settle on one metaphor or the other, though.

2)  The Door:  Not being content with merely looking through a portal, we can also reach into a portal and pull an object to ourselves, or insert various objects into a portal -- up to our entire body.  I've leaned slightly towards a 'not really open all the time' model, in which, say, throwing a portal into the ocean would not result in an endless flood from its mate.  But that model could certainly be supported.

These modes are fairly orthogonal -- if you desire one but not the other in your particular game, this extension should be able to accomodate you.

Chapter:  Portals Defined

Portals are, perhaps non-intuitively, a kind of person.

The strength of a portal, usually 3, relates to the distance from which it can be detected by waving.

A portal can be enterable.  If you don't want to use a portal for travel, set it not enterable.

A portal can be intact or broken.  Smashing a portal renders it broken and generally not very useful for anything.

A portal can be reach-enabled or reach-disabled.  If you don't want someone reaching through a portal and grabbing whatever's on the far side, make it reach-disabled.  The example also has a more nuanced approach with the sink in the janitorial closet.

A portal can be darkly or brightly.  If you don't want a portal to be able to provide light from a bright room into a dark room, set it darkly.

A portal can be small, medium, or large.  A portal is usually large.  The effects of size:

-Small:  Can only be used for looking through.  Similar to reach-disabled and not enterable.

-Medium:  As small, but objects can also pass through them, either inserted or removed.  Similar to reach-enabled and not enterable.

-Large:  As medium, but people can also enter them.  Similar to reach-enabled and enterable.

You can probably use reach-disabled and not enterable to make a sized portal more restrictive; using reach-enabled or enterable to make them less restrictive is unlikely to work.

For a demonstration of how portal sizing works, see the Extra Medium example.

Chapter:  Portals as Light Sources

Like a window, if one portal is somewhere bright and its terminus is somewhere dark, the dark room will be lit by the portal.  This is sort of a second-rate illumination, insofar as it only occurs if the portal would be the only source of light in the dark room.

A portal can be darkly or brightly.  If you don't want a portal to be able to provide light from a bright room into a dark room, set it darkly.

I would not recommend building a portal that provides illumination independently of its inherent portal nature, like a mirror set into a glowing frame, but with sufficient testing it could probably be implemented eventually.

Chapter:  Changes to Other Definitions

This extension makes a few changes to other kinds.

Rooms are still visited or unvisited, but note that 'visited' means quite literally that the player was present in body in the room (and not in darkness, either.)  Newly, rooms are scried or unscried, depending on whether the player has ever remotely-viewed them through a portal.  Finally, a room is beheld if it has been either visited or scried; otherwise unbeheld.  VERBOSE, BRIEF, and SUPERBRIEF still only care about 'visited' and generally have no effect on scrying, but they're inelegant fossils from a less-civilized age.

Portal insensitivity is used in the portal detection process.  Higher is worse -- more insensitive to portals.  Both the person detecting -- "yourself", typically -- and the portal being waved around contribute their portal insensitivities.

Rooms, containers, and supporters now have:

A text called portal preposition.  The portal preposition of a room is usually "in ".
A text called portal article.  The portal article of a room is usually "the ".
Can be portal proper-named or portal improper-named. 

Note the trailing space which should be built into the portal preposition and the portal article.  These parts of speech are used to build up the listings of portal connections and nearby portals, which will typically be presented in a list something like:
	a broken mirror of contemplation (in the tomb of Shah Jamal (in a sarcophagus))
	a parabolic reflector (in the lighthouse)
	a solar collector (on Mars (aboard the Spirit))
	
Consult the example, particularly Chapter 2, for several examples of these in practice.

A thing can be hard or soft, and is usually soft.  Hard things can break a portal.  Don't make a portal hard, please.

Chapter:  Directing Portals and the Directing To Relation

"Directing" is the basic action that players take with portals as portals.  It's conceptually like dialing a telephone number -- it establishes a live connection between two portals.

It requires either an existing connection between the portals (see the next documentation chapter) or that both portals are in the same physical location.  Also neither portal can be broken.

A portal (called the origin) is undirected rather than directed if the origin directs to nothing or the origin directs to the origin.

Directing is always a mutual relationship between two portals; it is not possibly to direct A to B, B to C, C to A, for example.

Directing overwrites any existing directed relations, so that if we have A directed to B and C directed to D, and the player directs A to D, then B and C are newly-undirected.

In play, directing also creates a new connection in each portal if needed.  As an initial creation, if you start with a directed portal, you should probably explicitly establish the implied connection relation yourself.

"Undirecting" is exactly equivalent to directing a portal to itself.

Chapter:   The Connecting To Relation

"Connecting" is more like a directory of phone numbers you have called on a particular phone.  Directing one portal to another establishes the connection between them, even after those portals are directed elsewhere.

By convention, a portal is never considered to connect to itself.

Chapter:  Examining Portals

Examining an undirected portal is easy -- it's just a plain old mirror.

Examining a directed portal gives us the portal's own description, as well as whatever is depicted within the portal -- (almost) exactly as though the player were standing in the place of the portal's terminus.

As such, an author may need to take a certain amount of care that the room descriptions do not assume that the player is actually standing there in the room, if those room descriptions might be delivered by remote-viewing.  The "[if the player is a portal]" condition can be useful here.

Containers and supporters are generally observed, if the terminus is "in" or "on" something.

The player observing himself through a portal is treated as a special "disconcerting" case.

It's difficult, but not quite impossible, to remotely-view darkness though a portal.

Chapter:  Entering Portals

Entering a portal more-or-less treats it as a door.

If the terminus happens to be in a container or on a supporter, the carrying capacity of those enclosures are respected, as well as their overall enterability.

A player is allowed to enter a portal he is carrying, and he'll arrive at the terminus with it.

A player is not allowed to enter a portal when he's carrying the terminus of that portal, as he would end up trying to enter his own inventory, which is problematic on a number of levels.

Chapter:  Touching Portals and Listing Connections

When a player "touches" (or squeezes or rubs, for that matter) a portal, they receive a list of that portal's connections.

Both listing connections and nearby portals uses (or abuses) the 'list the contents of', which has quite a variety of options, which I will list here for reference:

	To list the contents of (O - an object),
		with newlines,
		indented,
		giving inventory information,
		as a sentence,
		including contents,
		including all contents,
		tersely,
		giving brief inventory information,
		using the definite article,
		listing marked items only,
		prefacing with is/are,
		not listing concealed items,
		suppressing all articles,
		with extra indentation,
		and/or capitalized

The intrepid author may wish to try different options here for different effects.

Note that broken portals do not report their connections, but intact portals report connections to (now broken) portals.  But there is a case to be made, perhaps, that they should do something differently here.

Also note that the player might be notified of portals, rooms, containers, etc, that he may not otherwise be aware of.  I consider this a feature, but others may consider it a bug.  Generally speaking, a player could immediately direct the portal he's touching to whatever new connection he's just learning about to discover more, so I don't think much is added by being too coy.  

Chapter:  Sensing Nearby Portals

The sensing of nearby portals is done by the player waving around a portal in his possession; this started off as sort of a placeholder verb, but it has grown on me enough that I'm now hesitant to part with it.

There's a bit of a formula involved in determining which portals are sensed:

Every portal has a strength.
Every person, like the player, has a portal insensitivity.  Higher numbers are less sensitive.
Every portal, like the one being waved around, also has a portal insensitivity.  A portal which is quite good at sensing will probably have a negative portal insensitivity.
  
The strength minus the two insensitivities gives us:

0:  We can sense portals in the same location as the player.

1:  We can sense portals in the next room over, too.  (But not sensing through portals.)

...and so on.
	
Alternatively, a portal-less player can try to sense nearby portals with "search for/-- nearby/-- portal/portals", described in the code as divining.  An author using a more-customized term for portals ("mirrors", for instance) may want to add or change the command string understood by the parser to be divining.

As this is somewhat complex and non-intuitive, the example Sensing Lab demonstrates this fairly exhaustively, and might be a useful scaffolding for an author to fine-tune exactly how they want sensing to work in their story.

Chapter:  Inserting Things into Portals

Similar, in theory and practice, to entering portals, which is pretty much just inserting yourself into a portal.

We don't actually have to worry about exceeding the carrying capacity of the player, since in such cases the object being inserted starts out and ends up in the inventory, so really nothing much happens.  But if we try something really fancy -- pushing an object through a mirror, perhaps -- then we should probably handle that case especially.

Chapter:  Special Scoping for Portals

A bit of scope manipulation occurs so that we can remotely examine objects through portals.  A bit more allows us to grab objects though reach-enabled portals.

 If you're having scope problems of one sort or another, this may be at fault.

Chapter:  Throwing Things at Portals

Throwing decomposes into one of two other cases:  if the target portal is directed, then we're just doing some fancy insertion from afar.  If the target portal is undirected, then we're trying to smash it.  Those are the only options.

The construction "throw x THROUGH y" is also understood.

Chapter: Smashing Portals

By default, we need some implement of destruction to smash a portal with, and that implement must be a "hard" thing and not a soft thing.

Note that I'm intentionally deciding to not deal with SMASH BIG MIRROR WITH SMALL MIRROR but feel free to tackle it yourself if you are so inclined.

If successful, a smashed portal becomes broken.  It becomes undirected, and a broken portal's connections are not accessible.  Typically, the author will want to update a few other things, such as the description and possible the printed name, after smashing.  Also, if you want to kill the connections to broken portals, this would be a good place to do it; by default, the non-broken end of the connection (if any) is not disturbed.

Chapter: Known Bugs

There is a bug involving reach-disabled and small portals.  When a portal the player should not be able to reach through is in the same location as a portal they can reach through, they can reach through the forbidden portal.  I don't feel like fixing it right now, but if it causes problems for real authors in their real games, I may revisit it.

Example: * Sensing Lab - Demonstrates how sensing nearby portals actually works.

	*: "Sensing Lab" by Roger Carbol

	The story headline is "An Interactive Demonstration and Testbed".
	The story genre is "Example".
	The story description is "An Interactive Demonstration and testbed for fine-tuning the sensing of nearby portals via the extension 'Portals by Roger Carbol'."

	Include Portals by Roger Carbol.

	Understand "* [text]" as a mistake ("[run paragraph on]").

	Chapter 1 - The Rooms

	Ground Zero is a room.  "Let's start here.  One step north is Immediately Adjacent to Ground Zero."

	There is a room called Immediately Adjacent to Ground Zero.   "Ground Zero is south; Two Moves Away is north."  Immediately Adjacent to Ground Zero is north of Ground Zero.

	There is a room called Two Moves Away.  "Immediately Adjacent to Ground Zero is south; Three Moves Away is north."  Two Moves Away is north of Immediately Adjacent to Ground Zero.

	There is a room called Three Moves Away.  "Two Moves Away is south; Four Moves Away is north."  Three Moves Away is north of Two Moves Away.

	There is a room called Four Moves Away.  "Three Moves Away is south; Five Moves Away is north."  Four Moves Away is north of Three Moves Away.

	There is a room called Five Moves Away.  "Four Moves Away is south; Many Moves Away is unconnected but accessible to the north."  Five Moves Away is north of Four Moves Away.

	There is a room called Many Moves Away.  "Five Moves Away is unconnected from here bu accessible to the south; you've reached the end of the line."  

	Instead of going north in Five Moves Away, move the player to Many Moves Away.
	Instead of going south in Many Moves Away, move the player to Five Moves Away.

	Chapter 2 - The Portals

	The red mirror is a portal in Ground Zero.
	The orange mirror is a portal in Immediately Adjacent to Ground Zero.
	The yellow mirror is a portal in Two Moves Away.
	The green mirror is a portal in Three Moves Away.
	The blue mirror is a portal in Four Moves Away.
	The indigo mirror is a portal in Five Moves Away.
	The violet mirror is a portal in Many Moves Away.

	Chapter 3 - The Detector

	The detector is a fake portal.  The description of the detector is "You can wave this detector around to sense nearby portals.  It also has a dial so that you can set its portal insensitivity (with >SET DETECTOR TO 3 and such) that is currently set to [the portal insensitivity of the detector]."  The detector is carried by the player.

	The examine portals rule does nothing when the noun is the detector.

	Dialling it to is an action applying to one thing and one number.

	Understand "set [something] to [number]" as dialling it to.
		
	Carry out dialling the detector to:
		now the portal insensitivity of the detector is the number understood.
			
	Report dialling the detector to:
		say " You set the detector's portal insensitivity to [the portal insensitivity of the detector]."

	test detector with "x detector / wave detector / set detector to -1 / wave detector / set detector to 1 / wave detector / set detector to 2 / wave detector / set detector to 3 / wave detector / set detector to -50 / wave detector / * Even now we cannot sense the violet mirror in the unconnected Many Moves Away room "

	Chapter 4 - The Amulet

	The amulet is a thing worn by the player.  The description of the amulet is "This magical amulet can change your own personal portal insensitivity.  It has a dial that you can set  (with >SET AMULET TO 3 and such) that is currently set to [the portal insensitivity of the player]."

	Carry out dialling the amulet to:
		now the portal insensitivity of the player is the number understood.
			
	Report dialling the amulet to:
		say " You set the amulet (and your own portal insensitivity) to [the portal insensitivity of the player]."
		
	test amulet with "x amulet / search portals / set amulet to 0 / search portals / set amulet to 2 / search portals / set amulet to 3 / search portals / set amulet to 4 / search portals / * Cannot detect the detector because we've set it to 'fake' / set amulet to 1 "

	Chapter 5 - the Wand

	The wand is a thing carried by the player.  The description of the wand is "WAVE the wand AT a portal to discover its current strength; SET the wand TO some number and then ZAP the wand AT a portal to set that portal's strength to the wand's setting.  The wand is currently set to [the setting of the wand]."  The setting of the wand is initially 3.

	Waving it at is an action applying to one thing and one thing.

	Understand "wave [something] at [something]" as waving it at.

	After deciding the scope of the player: 
		repeat with item running through nonfake portals:		
			place the item in scope. 

	Report an actor waving the wand at a portal (this is the report waving the wand rule):
		say "You wave the wand at [the second noun] (which is over in [the location of the second noun]) and find its strength is currently [the strength of the second noun].";
		stop the action.

	Carry out dialling the wand to:
		now the setting of the wand is the number understood.
			
	Report dialling the wand to:
		say " You set the wand to [the setting of the wand], ready to zap something."
		
	Zapping it at is an action applying to one thing and one thing.

	Understand "zap [something] at [something]" as zapping it at.
	Understand "zap [something] with [something]" as zapping it at (with nouns reversed).

	Carry out zapping the wand at:
		now the strength of the second noun is the setting of the wand.
			
	Report zapping the wand at:
		say " You zap the wand, set to [the setting of the wand], at [the second noun]; now the strength of [the second noun] is [the strength of the second noun]."
		
	Test wand with "x wand / search portals / wave wand at yellow mirror / set wand to 2 / zap wand at yellow mirror / search portals / wave wand at green mirror / set wand to 4 / zap green mirror with wand / search portals "	


	Test all with "test detector / test amulet / test wand "
	
Example: * Extra Medium - Demonstrates the various sizes -- small, medium, and large -- of portals.

	*: "Extra Medium" by Roger Carbol

	The story headline is "An Interactive Demonstration".
	The story genre is "Example".
	The story description is "An Interactive Demonstration of portal sizing via the extension 'Portals by Roger Carbol'."

	Include Portals by Roger Carbol.

	Understand "* [text]" as a mistake ("[run paragraph on]").

	Chapter 1 - The Rooms

	The Medium-Sized Room is a room.  "This room is a medium-sized room, as far as rooms go.  To the west is a large room; to the east, a small room.  And north is an empty room."

	There is a room called the Large Room.  The Large Room is west of the Medium-Sized Room.  "This room is quite large.  To the east is a not-quite-as-large room." 

	There is a room called the Small Room.  The Small Room is east of the Medium-Sized Room.  "This room is quite small.  To the west is a not-quite-as-small room."

	There is a room called the Empty Room.  The Empty Room is north of the Medium-Sized Room.  "This room is quite empty.  To the south is a not-quite-as-empty room."

	Chapter 2 - The Portals

	The average mirror is a portal in the Medium-Sized Room.  The description of the average mirror is "This medium-sized mirror is pretty average in every way."  The average mirror is medium.

	The standard mirror is a portal in the Medium-Sized Room.  The description of the standard mirror is "This medium-sized mirror is pretty standard in every way."  The standard mirror is medium.

	The huge mirror is a portal.  The huge mirror is in the Large Room.  The description of the huge mirror is "This mirror is really quite huge."  The huge mirror is large.

	The big mirror is a portal.  The big mirror is in the Large Room.  The description of the big mirror is "This mirror is really quite big."  The big mirror is large.

	The tiny mirror is a portal.  The tiny mirror is in the Small Room.  The description of the tiny mirror is "This mirror is really quite tiny."  The tiny mirror is small.

	The minute mirror is a portal.  The minute mirror is in the Small Room.  The description of the minute mirror is "This mirror is really quite minute."  The minute mirror is small.

	Chapter 3 - Tossables

	The cricket ball is carried by the player.  The description of the cricket ball is "Pretty naff, innit."

	Chapter 4 - Connecting the Mirrors

	[Using a loop out of laziness.]

	When play begins:
		repeat with item running through nonfake portals:
			repeat with target running through nonfake portals:
				if the item is not the target:
					if the item connects to the target:
						do nothing;
					otherwise:
						now the item connects to the target.

	Chapter 5 - Tests

	Section 1 - Large to Large

	test L-L-look with "W / take huge mirror / E / direct huge mirror to big mirror / look in huge mirror / W / drop huge mirror / undirect huge mirror / E / * Should pass. "

	test L-L-throw with "W / take huge mirror / E / direct huge mirror to big mirror / throw ball through huge mirror / W / drop huge mirror / undirect huge mirror / take ball / E / * Should pass. "

	test L-L-reach with "W / take huge mirror / E / direct huge mirror to big mirror / throw ball through huge mirror / x huge mirror / take ball / W / drop huge mirror / undirect huge mirror /  E / * Should pass. "

	test L-L-enter with "W / take huge mirror / E / direct huge mirror to big mirror / enter huge mirror / drop huge mirror / undirect huge mirror / E / * Should pass. "

	test Large-Large with "test L-L-look / test L-L-throw / test L-L-reach / test L-L-enter "

	Section 2 - Medium to Medium

	test M-M-look with "direct average mirror to standard mirror / look in standard mirror / undirect average mirror / * Should pass. "

	test M-M-throw with "direct average mirror to standard mirror / take average mirror / W / throw ball at average mirror / E / drop average mirror / undirect average mirror / take ball / * Should pass. "

	test M-M-reach with "direct average mirror to standard mirror / take average mirror / W / put ball in average mirror / x average mirror / take ball / E / drop average mirror / undirect average mirror / * Should pass. "

	test M-M-enter with "direct average mirror to standard mirror / take average mirror / W / enter average mirror / * Should fail here. / E / drop average mirror / undirect average mirror / * Should have failed. "

	test Medium-Medium with "test M-M-look / test M-M-throw / test M-M-reach / test M-M-enter "

	Section 3 - Small to Small

	test S-S-look with "E / direct tiny mirror to minute mirror / look in tiny mirror / undirect tiny mirror / W / * Should pass. "

	test S-S-throw with "E / direct tiny mirror to minute mirror / take tiny mirror / W / throw ball at tiny mirror / * Should fail here. / take ball / put ball into tiny mirror / * Should fail here too.  / E / drop tiny mirror / undirect tiny mirror / W / * Should have failed twice. "

	test S-S-reach with "E / direct tiny mirror to minute mirror / take tiny mirror / drop ball / W / N / x tiny mirror / x ball / * Should pass here. / take ball  / * Should fail here. / S / E / drop tiny mirror / undirect tiny mirror / take ball / W / * Should have passed once, failed once. "

	test S-S-bug with "E / direct tiny mirror to minute mirror / take tiny mirror / drop ball / W / x tiny mirror / x ball / * Should pass here. / take ball  / * Should fail here but it doesn't due to the other portals. /  E / drop tiny mirror / undirect tiny mirror / W / * This is a known issue of unknown severity and impact. "

	test S-S-enter with "E / direct tiny mirror to minute mirror / take tiny mirror / W / go into tiny mirror / * Should fail here. / E / drop tiny mirror / undirect tiny mirror / W / * Should have failed. "

	test Small-Small with "test S-S-look / test S-S-throw / test S-S-reach / test S-S-bug / test S-S-enter "

	Section 4 - Large to Medium

	test L-M-look with "W /  direct huge mirror to average mirror / look in huge mirror / E / look average mirror / undirect average mirror /  * Should pass. "

	test L-M-throw with "W /  direct huge mirror to average mirror / throw ball through huge mirror / E / put ball in average mirror / W / take ball / undirect huge mirror / E / * Should pass. "

	test L-M-reach with "drop ball / W / direct average mirror to huge mirror / take ball / drop ball / E / take ball / direct average mirror to average mirror / * Should pass. "

	test L-M-enter with "touch average / direct average mirror to huge mirror / enter average mirror / * Should fail here.  / W / go into huge mirror / * Should fail here too.  / undirect huge mirror / E / * Should fail twice. "

	test Large-Medium with "test L-M-look / test L-M-throw / test L-M-reach / test L-M-enter "

	Section 4 - Large to Small

	test L-S-look with "W / touch huge / direct huge mirror to tiny mirror / look in huge mirror / E / E / look tiny mirror / undirect tiny mirror / W / * Should pass. "

	test L-S-throw with "W / squeeze huge / direct huge mirror to tiny mirror / throw ball at huge mirror / * Should fail here. / take ball / E / E / put ball in tiny mirror / * Should fail here too. / undirect tiny mirror / W / * Should have failed twice."

	test L-S-reach with "W / drop ball / E / E / take tiny mirror / W / N / direct tiny mirror to huge mirror / take ball / * Should fail here. / S / W / take ball / E / N / drop ball / drop tiny mirror / S / W / take ball / * Should fail here too. / E / N / take all / S / E / undirect tiny / drop it / W / * Should have failed twice but note reach bug. "

	test L-S-enter with "W / rub huge mirror / direct tiny mirror to huge mirror / enter huge mirror / * Should fail here.  / E / E / go into tiny mirror / * Should fail here too.  / undirect tiny mirror / W / * Should fail twice. "

	test Large-Small with "test L-S-look / test L-S-throw / test L-S-reach / test L-S-enter "

	Section 5 - Medium to Small

	test M-S-look with "touch average / direct average mirror to tiny mirror / look in average mirror / E / look tiny mirror / undirect tiny mirror / W / * Should pass. "

	test M-S-throw with "squeeze average / direct average mirror to tiny mirror / throw ball at average mirror / * Should fail here. / take ball / E / put ball in tiny mirror / * Should fail here too. / undirect tiny mirror / W / * Should have failed twice."

	test M-S-reach with "drop ball / E / take tiny mirror / W / N / direct tiny mirror to average mirror / take ball / * Should fail here. / S / take ball / N / drop ball / drop tiny mirror / S / take ball / * Should fail here too. /  N / take all / S / E / undirect tiny / drop it / W / * Should have failed twice but note reach bug. "

	test M-S-enter with "rub average mirror / direct tiny mirror to average mirror / enter average mirror / * Should fail here.  / E / go into tiny mirror / * Should fail here too.  / undirect tiny mirror / W / * Should fail twice. "

	test Medium-Small with "test M-S-look / test M-S-throw / test M-S-reach / test M-S-enter "

	test all with "test Large-Large / test Medium-Medium / test Small-Small / test Large-Medium / test Large-Small / test Medium-Small "	

Example: * Through a Glass, Darkly - A worked example of this extension.

	*: "Through a Glass, Darkly" by Roger Carbol

	The story headline is "An Interactive Example of the extension Portals". 
	The story genre is "Example". 
	The story description is "A worked example of using the extension 'Portals by Roger Carbol'." 

	Include Portals by Roger Carbol.

	Use scoring.

	Understand "* [text]" as a mistake ("[run paragraph on]").

	Chapter 1 - The Player

	Section 1 - Our Hero

	The description of the player is "You should be good-looking, given the amount of time you spend looking into mirrors."

	Section 2 - The Things He Carries

	The briefcase mirror is a portal.  The description of the briefcase mirror is "You think of this as your 'briefcase mirror', as it's a sheet of polished aluminum about the width and breadth of a briefcase, with a briefcase-like handle mounted to the side."  The briefcase mirror is carried by the player.

	The briefcase mirror connects to the puddle of mercury.
	The briefcase mirror connects to the ceiling mirror.

	The briefcase mirror directs to the ceiling mirror.

	The ring is a portal.  The description of the ring is "A large gold ring, a bit like a Superbowl ring, with a tiny mirror mounted where the main jewel would go.  It's rather exquisitely-tuned for the detection of mirrors."  The ring is darkly.  The ring is reach-disabled.  The ring is worn by the player.   The portal insensitivity of the ring is -1.  

	The ring connects to the ceiling mirror.
	The ring connects to the rear-view mirror.
	The ring connects to the broken LaserDisc.

	The tennis ball is a thing.  The description of the tennis ball is "You know, one of those balls people use to play tennis."  The tennis ball is carried by the player.

	Section 3 - Scoring

	The maximum score is 6. 

	When play begins: 
		now the score is 1;
		silently try switching score notification on.

	This is the initial scoring description rule: 
		say "[bracket]Your score has just gone up by one point.[close bracket][paragraph break]".

	The initial scoring description rule is listed after the initial room description rule in the startup rulebook.

	Section 4 - Unicode Stuff

	Toggling unicode is an action out of world. Understand "unicode" as toggling unicode. 

	Unicode-enabled is initially true. 

	Carry out toggling unicode:
		if unicode-enabled is true:
			now unicode-enabled is false; 
		otherwise:
			now unicode-enabled is true;
		say "Unicode usage has been toggled; it is now [unicode-enabled]."

	To say emdash:
		if unicode-enabled is true:
			say "[unicode 8212]"; 
		otherwise:
			say "--".

	To say e-acute:
		if unicode-enabled is true:
			say "[unicode 233]"; 
		otherwise:
			say "e".

	To say o-macron:
		if unicode-enabled is true:
			say "[unicode 333]"; 
		otherwise:
			say "o".

	Chapter 1 - The Empress Theatre

	When play begins, say "Years of following vague rumours, spurious scuttlebutt, and the unintelligible ramblings of the half-insane have led you, finally, to Montr[e-acute]al, and the once-grand, now-derelict Empress Theatre.

	The padlocked doors and boarded-up windows did nothing to keep you out, of course.  Especially not now, when you're so close to rediscovering the long-lost Infernal Resonator of Nitocris.

	[paragraph break]"

	The Theatre is a region.  The dust is a backdrop.  The dust is in the Theatre.
	The balcony is a backdrop.  The balcony is in the Theatre.

	Section 1 - The Foyer

	The Foyer is a room.  "Dim, but not dark; just enough sunlight enters through the high, shuttered windows and filters down through the dusty air to illuminate the room [emdash] or what's left of it, at any rate.

	Across from the entrance, the concession stand sits forlornly against the north wall.  Left of the counter is a doorway to the theatre proper.  A wide staircase to the east leads up to the balcony seats; to the west is a[if janitorial closet door is closed] closed[otherwise]n open[end if] door."

	The Foyer is in the Theatre.

	The concession stand is scenery.  "Employees once stood behind the counter of the concession stand and sold candy and drinks to patrons, but it's obvious that hasn't happened for some time."  It is in the Foyer.

	Understand "look behind [something]" as searching.

	The concession counter is scenery and a supporter.  "[if nothing is on the counter]Covered in dust.[otherwise][run paragraph on][end if]".  It is in the Foyer.  The carrying capacity of the concession counter is 1.

	Instead of putting something on the concession stand, try putting the noun on the concession counter.

	The theatre doorway is an open unopenable scenery door.  The theatre doorway is north of the Foyer and south of the Theatre Seating.

	The theatre staircase is an open unopenable scenery door.  The theatre staircase is east of the Foyer and down from the Balcony Seating.

	Instead of going up in the Foyer, try going east instead.

	Instead of going east in the Foyer, say "The first stair creaks alarmingly under your weight, and you decide against proceeding.";

	The theatre entrance is a locked scenery door.  The theatre entrance is south of the Foyer.  The description of the theatre entrance is "Those doors are locked [emdash] forever, most likely."

	Instead of going south in the Foyer, say "Those doors are locked [emdash] forever, most likely."

	Section 2 - The Janitorial Closet

	The Janitorial Closet is a room.  "This tiny room was apparently once the janitorial closet; it has long since been cleaned out of anything related to that task.  A grimy mirror hangs above an equally-grimy sink."

	The Janitorial Closet is in the Theatre.

	The janitorial closet door is a closed door and scenery.   The description of the janitorial closet door is "[if location is the Foyer]A sign on the door reads 'Employees Only'.[otherwise]A nondescript door, as befits the room.[end if]  It is [if open]open[otherwise]closed[end if]."  It is west of the Foyer and east of the Janitorial Closet. 

	Carry out closing the janitorial closet door:
		now the janitorial closet is dark;
		follow the light lamps rule;
		move the hook to the janitorial closet;
		continue the action.
		
	[Note -- after manually changing lighting, it's a good idea to 'follow the light lamps rule' to get everything updated.  It might be common enough to make it worthwhile to offer handler functions in the extension, but maybe not.]	
		
	A thing can be known or unknown.  A thing is usually unknown.	

	After writing a paragraph about the hook, now the hook is known.

	Report closing the janitorial door (this is the reveal hook rule):
		if the location is the janitorial closet and the player is visible:
			say "You close the janitorial door, revealing a small hook installed on the wall behind the door.";
			now the hook is known;
			rule succeeds.

	Carry out opening the janitorial closet door:
		now the janitorial closet is lighted;
		follow the light lamps rule;	
		now the hook is nowhere;
		continue the action.
		
	Report opening the janitorial door (this is the obscure hook rule):
		if the location is the janitorial closet and the player is visible:
			say "You open the janitorial door[if the hook is known], which blocks your access to the small hook[end if].";
			rule succeeds.	

	After deciding the scope of the player while in darkness: 
		if the location is the Janitorial Closet:
			place the janitorial closet door in scope.
			
	The grimy mirror is a portal in the Janitorial Closet.  "The quality of janitorial service may have well been a contributing factor to the closing of this theatre, if the cleanliness of this mirror is any indication.  It is bolted to the wall above an equally-filthy sink."  

	The grimy mirror is scenery.  The grimy mirror directs to the grimy mirror. 

	The small hook is a supporter.   "[if nothing is on the small hook]A small hook has been installed near the door[otherwise]Hanging from a small hook near the door you can see [a list of things on the small hook][end if]."  The description of the small hook is "A small hook, suitable for a small item."  The small hook is nowhere.  The carrying capacity of the small hook is 1.

	The brass key is a thing.  The description of the brass key is "It must fit something around here."  The brass key is on the hook.

	After taking the brass key when the brass key is not handled: 
		increase the score by 2.

	A thing can be unhangable or hangable.  A thing is usually unhangable.
	The brass key is hangable.
	The ring is hangable.

	Check putting something (called the item) on the small hook(this is the only hook hangables rule):
		if the noun is unhangable:
			if the actor is the player:
				say "There's no good way to hang [the noun] from the small hook." (A);
			stop the action.

	The sink is an open unopenable container.  The description of the sink is "This sink is mounted below the equally-grimy mirror."  The sink is scenery.  The sink is in the janitorial closet.

	A rule for reaching inside the janitorial closet: 	
		if the noun is the sink or the noun is in the sink:
			allow access; 
		otherwise: 
			say "You can't quite reach [the noun] through the grimy mirror."; 
			deny access. 
			
	A rule for reaching inside the janitorial closet while directing: 	
		allow access.
	[This patches over a strangeness around directing a mirror to the grimy mirror when it is absent through its connections.]	

	Report an actor going (this is the describe the grimy mirror departure experience rule):
		if the player is the actor and the noun is a portal:
			if the action is not silent:
				if the noun is the grimy mirror:
					say "You step awkwardly over and around the sink, finally feeling a familiar tingling sensation, and find yourself elsewhere...";
				continue the action.

	Report an actor going (this is the describe the grimy mirror arrival experience rule):
		if the player is the actor and the noun is a portal:
			if the action is not silent:
				if the noun directs to the grimy mirror:
					say "You feel a familiar tingling sensation, and find yourself stepping awkwardly over and around a sink to arrive in...";
				continue the action.
			
	The describe the portal experience rule does nothing when the noun is the grimy mirror.
	The describe the portal experience rule does nothing when the noun directs to the grimy mirror.

	The describe the grimy mirror departure experience rule is listed before the describe the portal experience rule in the report going rulebook.
	The describe the grimy mirror arrival experience rule is listed before the describe the portal experience rule in the report going rulebook.

	Section 3 - Theatre Seating

	Theatre Seating is a room.  "Hardly any light at all manages to make it this far into the building [emdash] good for theatrical purposes, you suppose, but not so good for your current endeavours.

	Much of the seating has been removed, with entire rows missing.  The scattered chairs that remain are evidently not worth hauling away.  They uniformly face north, away from the foyer and toward the stage.  There appears to be some balcony seating as well, but you can barely see it from here."

	Theatre Seating is in the Theatre.  Theatre Seating is dark.

	The seats are scenery.  Understand "rows" and "chairs" and "seating" and "seat" and "row" and "chair" as the seats.  The seats are plural-named.  The description of the seats is "It's no wonder they were just abandoned here."  The seats are in Theatre Seating.

	Instead of searching the seats, try looking under the seats.

	Instead of looking under the seats for the first time:
		say "You'd be very surprised if there was anything of value tucked away here after all this time, but you dutifully search around anyways... and you are indeed surprised, for under one of the decrepit seats in a corner you find an old flashlight.  You pick it up to take a closer look.";
		now the player carries the old flashlight;
		increase the score by 1.

	Instead of looking under the seats more than one time:
		say "You find nothing further of interest."

	The old flashlight is a device.  The description of the old flashlight is "You suspect this old flashlight once belonged to an usher[if switched on].  A remarkably-powerful beam of light issues forth from it[end if]."

	The examine devices rule does nothing when the noun is the old flashlight.

	Carry out switching on the old flashlight:
		now the old flashlight is switched on;
		now the old flashlight is lit.
		
	Report an actor switching on the old flashlight for the first time:
		say "You turn on the old flashlight with low expectations, but, gobsmackingly, a brilliant beam of light issues forth.  You won't need to go hunting for fresh batteries after all.  You can scarcely-believe it.";
		increase the score by 1;
		rule succeeds.

	Carry out switching off the old flashlight:
		now the old flashlight is switched off;
		now the old flashlight is unlit.	

	Section 4 - The Stage

	The Stage is north of Theatre Seating.  "If all the world's a stage, hopefully it's better off than this one, which has certainly seen better days.

	There seems to be access to the backstage area to both the northwest and the northeast."

	The Stage is in the Theatre.  The Stage is dark.  The portal preposition of the Stage is "on".

	Understand "exit [direction]" as going.
	Understand "stage right" as northwest.
	Understand "house left" as northwest.
	Understand "stage left" as northeast.
	Understand "house right" as northeast.

	Section 5 - Stage Properties

	Stage Properties is northwest of the Stage.  "So many boxes and crates; it staggers the mind."  Stage Properties is dark.

	The fake rock is an open unopenable container.  "[if Stage Properties is unvisited]Distracted by all the boxes and crates, you accidentally step on an apparently-fake rock, punching a hole in one side of it.[end if]". The fake rock is in Stage Properties.  The description of the fake rock is "About the size of a football, this prop makes a pretty convincing rock.  Except from the one side that has a big hole kicked in it, from where some clumsy oaf stepped on it."  The fake rock has a carrying capacity 1.

	Rule for printing the name of the fake rock while not taking inventory: 
		say "fake rock";
		omit contents in listing. 

	The boxes are scenery in Stage Properties.  Understand "box" as the boxes.  "There are so many boxes and crates and props in here that you'd never be able to search it all."

	Instead of searching boxes, say "There are so many boxes and crates and props in here that you'd never be able to search it all."

	The silver book is a closed openable container in Stage Properties.  The description of the silver book is "This could easily be mistaken for a large book bound in silver, but you see that it's actually a shallow box made to resemble a book, about the size of a large phonebook."  The silver book is undescribed.  The silver book has a carrying capacity 1.

	The silver book has a number called the shielding. The silver book has shielding 3.

	The silver book can be openish.

	Carry out closing the silver book (this is the silver book closing rule):
		if a portal (called the item) is in the book:
			decrease the strength of the item by the shielding of the book;
		now the silver book is not openish;
		now the noun is closed.

	Carry out opening the silver book (this is the silver book opening rule):
		if a portal (called the item) is in the book:
			increase the strength of the item by the shielding of the book;
		now the silver book is openish;
		now the noun is open.

	A thing can be unbookable or bookable.  A thing is usually unbookable.
	The ring is bookable.

	Check inserting something (called the item) into the silver book (this is the only book bookables rule):
		if the noun is unbookable:
			if the actor is the player:
				say "[It] [won't] fit." (A);
			stop the action.

	The only book bookables rule is listed last in the check inserting it into rulebook.

	[the long-lost Infernal Resonator of Nitocris.]
	The Resonator is a portal.  [It's not really a portal, but it can be detected as one by waving, so this is sort of the easier way to do it.]
	The description of the Resonator is "Unmistakable [emdash] this is the Infernal Resonator of Nitocris.  Smaller than you were expecting [emdash] only about as long as your hand.  It sort of resembles a tuning fork, except the tines of the fork are of unequal length, and it's made out of some sort of glowing green metal that you don't recognize.  Legend has it that, if struck, the Resonator would initiate a series of vibrations that would destroy every mirror in the world.  You hope to never find out if the legends are true."

	The Resonator is in the silver book.
	The strength of the Resonator is 0.  [already decremented by the book shielding.]
	The Resonator is not enterable.
	The Resonator is reach-disabled. 
	The Resonator is darkly.
	The Resonator is hard.
		
	Before waving a portal (this is the light up the silver book rule):
		if the silver book is closed:
			now the silver book is open;
		continue the action.
			
	Every turn:
		if the silver book is not openish:
			now the silver book is closed;
		continue the action.		
		
	[All this nonsense with openish and opening and closing the book while waving is so that we can get a mention of the silver book instead of merely 'darkness'.]	
		
	[various de-portalizations]
	The examine portals rule does nothing when the noun is the resonator.	
	The report touching portals rule does nothing when the noun is the resonator.	
	The report waving portals rule does nothing when the noun is the resonator.

	Check an actor inserting something into the Resonator (this is the don't insert into Resonator rule):
		say "[regarding the second noun][Those] [can't contain] things." (A);
		stop the action.

	Check an actor directing something to (this is the can't direct the Resonator rule):
		if the noun is the Resonator or the second noun is the Resonator:
			say "The Resonator cannot be directed.";
			stop the action.
			
	Check an actor throwing something at the Resonator (this is the convert throwing things at Resonator rule):
		now the noun is a projectile;
		convert to request of the actor to perform smashing it with action upon the second noun and the noun.
		
	Check an actor throwing the Resonator at (this is the convert throwing the Resonator at things rule):
		if the second noun is a directed portal:
			convert to request of the actor to perform inserting it into action with the noun and the second noun;
		otherwise:	
			now the noun is a projectile;
			convert to request of the actor to perform smashing it with action upon the second noun and the noun.	

	The block attacking rule does nothing when the noun is the Resonator.
	The block attacking portals bare-handed rule does nothing when the noun is the Resonator.

	Check an actor smashing the Resonator with (this is the convert smashing Resonator to attacking rule):
			if the noun is the Resonator, convert to the attacking action on the noun.	

	Check an actor smashing something with the Resonator (this is the convert smashing with Resonator to attacking rule):
			if the second noun is the Resonator, convert to the attacking action on the second noun.	

	Carry out attacking the Resonator:
		repeat with item running through nonfake portals:
			now the item is broken;
			now the item directs to nothing.  [overkill, but still fun.]

	Report attacking the Resonator:
		say "The impact sets the Resonator vibrating, and you immediately feel something is horribly wrong.
		
		The awful sound of it grows louder and louder, until it is unbearable.  Finally there is a tremendous sforzando of breaking glass, and then all is silent.
		
		The age of your kind is at an end.";
		end the story.

	Section 6 - Long Hallway

	Long Hallway is northeast of the Stage.  "It goes on and on, until it doesn't.  The stage is back to the southwest, and to the west there seems to be some sort of green room."   Long Hallway is dark.

	The iron pipe is in Long Hallway.  The description of the iron pipe is "A watermain or something."  The iron pipe is hard.  The iron pipe is fixed in place.

	Section 7 - Green Room

	Green Room is west of Long Hallway.  "This particular green room really is a green room, but that's just mold.  The south wall is essentially one big mirror [emdash] possibly that made costuming easier."  Green Room is dark.

	The wall mirror is a portal.  The description of the wall mirror is "It forms the entire south wall."  Understand "south" as the wall mirror.  The wall mirror is in Green Room.   The wall mirror is scenery.

	The wall mirror connects to the reflector. 
	The wall mirror connects to the broken mirror of contemplation.
	The wall mirror connects to the solar collector.
	 
	[NOTE:  If you drop the article here -- 'The wall mirror connects to reflector' -- you'll also lose it in the list of connections.  So there's that.]

	Instead of going south in Green Room, try entering the wall mirror.

	After smashing the wall mirror with something:
		say "And that takes care of that [emdash] no one will be walking this particular path to Mars.";
		if Mars encloses the Resonator: 
			say "[line break]The dread Infernal Resonator of Nitocris is finally beyond the reach of mortal hands, at least for the foreseeable future.";
		otherwise:
			say "[line break]You spend the remainder of your days terrified that the dread Infernal Resonator of Nitocris will fall into the wrong hands [emdash] or hands even more wrong than yours, at any rate.";
		end the story.

	Chapter 2 - Elsewhere

	Section 1 - Your Bedroom

	Your Bedroom is a room. "[if the player is the ceiling mirror]You look down directly at your rarely-used bed.  [otherwise]Your rarely-used bed is situated beneath a tacky full-length ceiling mirror.  [end if]A few items of furniture are strewn about.  It seems oddly [if unbeheld]unfamiliar[otherwise]familiar[end if]."
	The portal article of Your Bedroom is "in ".
	The portal preposition of Your Bedroom is "".

	The ceiling mirror is a portal.  The ceiling mirror is in Your Bedroom.  The ceiling mirror is scenery.  The description of the ceiling mirror is "Bolting a mirror to the ceiling above your bed seemed like such a good idea at the time."

	The candlestick is a hard thing in Your Bedroom.  [If you know what I mean]  The description of the candlestick is "Some cheap faux-Art-Nouveau piece, all angular metal and sharp edges."

	After taking the candlestick when the candlestick is not handled: 
		increase the score by 1.

	Section 2 - Mars

	Mars is a room.  "You think for a moment that perhaps this is some far-flung terrestrial desert strewn with rocks and boulders, but no; the pink skies tip you off.  It is the red planet."
	Mars is portal proper-named.
	The portal article of Mars is "".
	The portal preposition of Mars is "on ".

	The solar collector is a portal.  The solar collector is on Spirit.  The solar collector is reach-disabled

	Spirit is a supporter.  Spirit is in Mars.  The portal preposition of Spirit is "aboard ".

	Instead of entering a directed portal (called doom) when the terminus of doom is solar collector, say "You're tougher than most, but even you wouldn't survive more than a moment on the surface of Mars.  Perhaps someday it'll be a fun place to leave your remains as you shrug off the mortal coil, but not today."

	After inserting something (called the trash) into a portal (called doom) when the terminus of doom is solar collector:
		if the trash is on Spirit:
			now the trash is in Mars;
			continue the action;	
		continue the action.

	Report an actor inserting something into a portal (called doom) when the terminus of doom is solar collector:
		let the endpoint be the terminus of the second noun;
		let the destination be the holder of the endpoint;
		if the destination is Spirit, now the destination is Mars;
		say "[The actor] [if the noun is a projectile][toss][otherwise][put][end if] [the noun] into [the second noun], and [regarding the actor][see] [regarding the noun][it] arrive [run paragraph on]" ;
		if the destination is the player:
			say 	"in [regarding the actor][our] inventory.[line break]";	
		otherwise:
			if the destination is portal proper-named:
				say "[portal preposition of the destination][portal article of the destination][destination].[line break]" ;
			otherwise:
				say "[portal preposition of the destination][portal article of the destination][destination].[line break]"  in lower case;	
		if the noun is the Resonator or the noun encloses the Resonator:
			say "[line break]That seems like a good start, but you feel vaguely uneasy that someone might still suit up and go looking, at least theoretically.";
		now the noun is not a projectile.
		
	After inserting something (called the trash) into a portal (called doom) when the terminus of doom is solar collector:
		if the trash is not the fake rock:
			decrease the score by 1;  [for littering]
			continue the action;	
		continue the action.	
		
	The standard report inserting into portal rule does nothing when the second noun is a directed portal and the terminus of the second noun is solar collector.

	Section 3 - Lighthouse

	Lighthouse is a room.  "This might not be much of a lighthouse any more, but it still offers a spectacular view of the waves crashing against the cliffs.  Most of the beacon is long gone, but, lucky for you, the parabolic reflector remains."

	The  reflector is a portal.  The reflector is in Lighthouse.  The printed name of the reflector is "parabolic reflector".  The description of the reflector is "Not many have the skill to work with non-flat mirrors, but you still have the touch."  The reflector is scenery.

	Instead of going nowhere in Lighthouse, say "There's no survivable exit out of here, save the way you came."

	Section 4 - The 57 Chevy Bel Air

	Chevy Bel Air is a room.  The printed name of Chevy Bel Air is "[']57 Chevy Bel Air".  The Chevy Bel Air is portal proper-named.

	The rear-view mirror is a portal.  The rear-view mirror is in Chevy Bel Air.  The rear-view mirror is broken.  

	Section 5 - The Koraku-en Garden

	Garden is a room.  The printed name of Garden is "K[o-macron]raku-en Garden".  Garden is portal proper-named.

	The puddle of mercury is a portal.  The puddle of mercury is in the birdbath.  The puddle of mercury is broken.

	The birdbath is container.  The birdbath is in Garden.

	Section 6 - The Tomb of Shah Jamal 

	The Tomb is a room.  the printed name of The Tomb is "tomb of Shah Jamal".  The Tomb is portal proper-named.

	The broken mirror of contemplation is a portal.  The broken mirror of contemplation is in a sarcophagus.  The broken mirror of contemplation is broken.

	A sarcophagus is in The Tomb.  The portal article of a sarcophagus is "a ".

	Section 7 - The Library

	The Library is a room.  The broken LaserDisc is a portal.  The broken LaserDisc is in The Library.  The broken LaserDisc is broken.

	Chapter 3 - Testing

	Test unicode with "unicode / l / * If the Unicode characters are problematic, you can shut them off. / unicode".

	Test init-mirror with "x briefcase / touch briefcase / x ring / * Portals can have initial connections and can be initially-directed."

	Test detect1 with "wave mirror / * Lists the 'nearby' portals -- even ones we've not yet encountered."

	Test detect2 with "search for nearby portals / * The wave-less listing of the 'nearby' portals."

	Test light with "w / i / close door / i / * The briefcase mirror is directed to a lit location, so it provides light / * if it is the only source of light."

	Test direct1 with "gonear stand / x ring / direct ring to mirror / x ring / * Sort of a strange situation / * with two portals directed to each other both in your inventory / * but this is how it works."

	Test direct2 with "gonear stand / direct ring to mirror / drop mirror / w / x ring / x stand / x briefcase / * You may notice that the briefcase mirror is not listed in the remotely-viewed room / * nor is it even in scope -- this is intentional and not a bug.  / * The briefcase mirror is our window into the remote room / * and like a television camera it does not provide a view of itself."

	Test direct3 with "gonear stand / purloin briefcase / w / direct briefcase to grimy / * We are able to do this by virtue of having both mirrors in the same location."

	Test direct4 with "gonear stand / purloin briefcase / w / touch grimy / direct briefcase to grimy / touch grimy / touch briefcase / direct briefcase to ring / e / close door / direct briefcase to grimy / x briefcase / * With the connection established, we can now re-direct to it at our leisure."

	Test enter1 with "gonear stand / purloin briefcase / w / direct briefcase to grimy / e /  close door / x briefcase / enter mirror / * Note the sequence of darkness arriving. / * Also note that we can enter portals we are carrying and we bring them along with us / * these laws could be changed if the story required it."

	Test enter2 with  "gonear stand / purloin briefcase / w / direct briefcase to grimy / e /  put briefcase on counter / w / x grimy / enter grimy / * Besides just issues of carrying capacity also take care with / * making containers and supporters enterable if desired."

	Test paradox with "gonear sink / open door/  purloin briefcase / direct briefcase to grimy / enter briefcase / enter grimy  / * We don't allow the player to move into his own inventory / * for technical as well as philosophical reasons.  / * A more catastrophic event might be called for."

	Test reach1 with  "gonear sink / open door/  purloin briefcase / direct briefcase to grimy / touch ring / direct ring to ceiling / e / put briefcase on stand / drop ball / drop ring / w / x grimy / x ball / take ball / x ring / i / * The default reaching through portals rules mostly let us act as though / * we were standing in the remotely-viewed room(s)."

	Test reach2 with "gonear sink / open door/  purloin briefcase / direct briefcase to grimy / put ball in sink / e / close door / x briefcase / x key / take key / x ball / take ball / i / * Here I have changed up the rules to only allow reaching into things that are somewhat close / * to the fixed-in-place mirror which seems nice."

	Test dark1 with "purloin briefcase / undirect briefcase / gonear stand / w / close door / touch grimy / touch briefcase / direct briefcase to grimy / direct briefcase to ceiling / undirect briefcase / drop briefcase / direct briefcase to ceiling / open door / direct briefcase to grimy / e / * Like most other objects portals can't generally be manipulated very much in darkness / * (unless in inventory) but that could be changed. "

	Test dark2 with "purloin briefcase / gonear stand / w / direct briefcase to grimy / e / n / i / search row /  turn on flashlight / i / * Again portals are lit only if needed." 

	Test detect3 with  "purloin briefcase / purloin ring / purloin flashlight / turn on flashlight / gonear stand / wave briefcase / wave ring / n / wave briefcase / wave ring / * The ring has a lower portal insensitivity so it is more effective." 

	Test detect4 with  "purloin briefcase / purloin ring / purloin flashlight / turn on flashlight / gonear stand / n / n / nw / wave briefcase / wave ring / open book / wave briefcase / * The book makes portals inside it harder to detect, when closed." 

	Test smash1 with "purloin candlestick / purloin briefcase / gonear stand / w / direct briefcase to grimy / smash grimy / smash grimy with candlestick / undirect grimy / smash grimy with candlestick / x grimy / touch grimy / direct grimy to briefcase / * Mirrors are meant to be broken."

	Test smash2 with "purloin candlestick / purloin briefcase / gonear stand / w / direct briefcase to ceiling / purloin flashlight / turn on flashlight / gonear pipe / throw briefcase at pipe / undirect briefcase / throw briefcase at pipe / * A different way to smash."

	Test all with "test unicode / test init-mirror / test detect1 / test detect2 / test light / test direct1 / test direct2 / test direct3 / test direct4 / test enter1 / test enter2 / test paradox / test reach1 / test reach2 / test dark1 / test dark2 / test detect3 / test detect4 / test smash1 / test smash2"

	Test story with "* A walkthough of the game of this worked example / x me / i / search for nearby portals / x briefcase / take candlestick / w / direct briefcase to grimy / e / close door / x briefcase / drop briefcase / enter briefcase / take key / enter grimy / take briefcase / open door / s / e / n / search row / turn on flashlight / n / exit stage right / x rock / take rock / wave briefcase / search boxes / wave ring / take book / x book / open book / x resonator / close book / put book in rock / se / ne / w / x wall mirror / touch wall mirror / direct wall mirror to solar collector / x wall mirror / s / throw rock at wall mirror / x wall mirror / direct wall mirror to wall mirror / smash wall mirror with candlestick"
