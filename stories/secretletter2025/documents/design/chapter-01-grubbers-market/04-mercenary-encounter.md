# Chapter I - Mercenary Encounter System

## 6. NPC: Mercenary (encountered in Grubber's Market locations)

**Programmer's Note:** 
[Although the descriptions give the sense of several mercenaries searching through the market, there should be only one game entity "Mercenary". He should either wander randomly through the Grubber's Market rooms (though not into the Alley or inside the Silk Stand), or he can simply be out of play until the player lingers in one location for too long (10-15 turns), and then "appear" in the player's location.]

[If the player and the mercenary are still in the same location after three turns, the mercenary spots the player. If the player does not immediately move to a different location, the mercenary will grab the player. Three turns after that, the mercenary captain arrives and the game ends. If you attack the mercenary before the captain arrives, he lets go, but he will grab you again one turn later. This cycle continues until the player runs elsewhere or is finally captures.]

[Once the player moves to a different location, the mercenary "resets".]

### Appearance States

**Initial Appearance:** 
One of the mercenaries is nearby, scanning the crowds.

**Initial Appearance [after the mercenary spots you but before he grabs you]:** 
The mercenary is heading straight for you, arms spread to block your escape.

**Initial Appearance [after the mercenary has grabbed you]:** 
The mercenary has one huge, hammy fist firmly clamped around your arm, and is shouting for the others to come.

### Description
Rough and ugly, with dirty clothes and a mean, scarred face. A serious-looking sword hangs at his hip, and a long knife is buckled at the small of his back.

### Idle Behavior
(1 in 5 chance each turn, but only if he hasn't noticed you yet)
- The mercenary peers around aimlessly. He hasn't seen you yet.
- The mercenary looks bored and spits on the ground.
- The mercenary scratches his head and scowls.
- The mercenary scowls at a passing shopper.
- The mercenary bumps into a passing shopper, and angrily shoves him out of his way.

### Player Commands and Events

**Command [stealing the mercenary's knife before he sees you]:** 
You tiptoe up behind the oblivious mercenary. Your heart is pounding, but the trick to successful nicking is not to dither about it. With one smooth, practiced movement you slip the knife from its sheath, then dart off in the opposite direction, hiding your new prize under your cloak.

**Command [doing anything to a mercenary when he hasn't noticed you yet]:** 
You resist the foolish impulse, reminding yourself that what you want is for them to *not* catch you.

**Event [after remaining in the same location with the mercenary for 3 turns]:** 
Suddenly the mercenary does a double-take. "Hey, you there!" he yells, and starts shoving his way towards you.

**Command [going to another location after the mercenary has spotted you]:** 
You dash away into the crowd, weaving between strolling customers and pushing your way through the thickest knots of people. The mercenary pounds after you, yelling and shoving people out of his way, but he's too big and too slow, and you quickly manage to lose him.

**Event [one turn after the mercenary notices you, if you don't run]:** 
A rock-hard fist closes around your upper arm. "Gotcha!" the mercenary sneers.

**Command [talking to the mercenary after the mercenary has noticed and/or grabbed you]:** 
The mercenary ignores your pleas.

### Capture Sequence

**Event [three turns after the mercenary grabs you, if you don't break free]:** 
The leader of the mercenaries soon arrives, followed by two more of his men. They take your other arm as their leader smiles. "Good work, dims. Got ourselves a nice little commission with this one." And before you can react, he takes a sack of black cloth from his belt and jerks it down over your head.

Everything goes dark. You can't breathe. You struggle, but you can no more break the iron grip on your arms than you could uproot a tree. The men holding you curse. Dimly, you hear shouts from the crowd -- someone protesting this rough treatment of a child.

"Don't worry, m'lady," laughs the mercenary leader. "We'll treat her nice an gentle. Like this, see?"

Something huge and heavy crashes into your head, and the rest of your senses are ripped away.

### Escape Options

**Command [trying to leave the location after the mercenary grabs you]:** 
You pull and struggle, beat on the mercenary's arms with your fists, claw his skin with your fingernails, but the man is just too strong.

**Command [attacking the mercenary after he grabs you]:** 
Thinking quickly, [one of] you kick the mercenary in the shin. [or] you elbow the mercenary as hard as you can, aiming below the belt. [or] you spit at the mercenary's face, and a gob of spittle lands right in his eye. [or] you scream your head off. People from two stalls away stop what they're doing to see what the commotion is, and when the mercenary clamps his hand over your mouth, you bite down hard. [at random] "Argh! Dammit, you miserable runt---" the mercenary's grip on your arm loosens, and you twist away. You're free!

**Command [stealing the knife after the mercenary grabs you]:** 
Desperately, you start grabbing and pulling at the mercenary's clothes, hoping to get free by getting in close. Your hand grasps something smooth and heavy on the mercenary's back. With a jerk, it pulls free.

"Dammit, he's got my knife!" shouts the mercenary.

**Command [stealing a knife when you've already got one]:** 
You've already got one knife -- don't press your luck.

**Command [attacking the mercenary with the knife]:** 
You jab the point of the blade into the mercenary's enormous bicep. It's a clumsy attack, but it does the trick -- the mercenary instantly lets go and steps back, pressing his hand against the wound.

### Object: Mercenary's Knife
- **Description:** Not some decorated dandy's blade, this. The steel is dull and tarnished, and honed to a wicked edge. An eight-inch-long, deadly practical tool for stabbing people.
