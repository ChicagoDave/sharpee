# Chapter I - The Escape System

## 22. Backdrop Object: Support Post
Seen in Fruit, Weapon, Gem, and Herb Stalls, and East Junction

**Initial Appearance**: 
Nearby stands a thick wooden post.

**Description**: 
It's one of several posts that support the large canvas awnings stretched above the market square. You can see one of the main support wires running from the top of this post to the top of the high post rising up from the center of the market.

**Command [climb post]:** 
You could shimmy up there easily enough, but it would attract too much attention.

## 23. Backdrop Object: Center Post
Seen in Rope, Silk, and Pottery stalls

**Initial Appearance**: 
Rising up behind the stall is a tall wooden post.

**Description**: 
The central post that holds up the system of canvas awnings stretched over the market square. It rises up from the midst of a cluster of stalls in the middle of the market, to a height of about twenty feet. Thick, taut support wires stretch from the top of the post to the four cardinal directions.

**Command [trying to do anything with the post when not next to it]:** 
The stalls surrounding the center post are backed up tightly against it. You'll have to find a way behind them to get to the post.

## 25. Top of Center Post

**Description:** 
Perched atop the high central post, you can look out over the whole market square. To the north, Lord's Road heads out of the city towards Lord's Keep, a mile or so from the city. To the east are rolling pastures; to the west, broken ground and scrub. In every other direction the city is surrounded by rolling meadows and farmlands.

Four anchor cables stretch away in the four cardinal directions, attached to the smaller support posts at the perimeter of the market.

### Object: Anchor Cable 
[four total; north, east, south, and west]

**Description:** 
The cable is made of thick, braided wire. One end is attached to the top of the pole that you are currently balancing on; the other end is attached to a shorter support post at the [north/south/east/west] end of the market, far below.

### Wire Sliding Mechanics

**Programmer's Note:** 
[The syntax for sliding down the wires needs to be forgiving. The default correct syntax is SLIDE ON/ALONG/DOWN WIRE WITH (something), where (something) equals the rope or the belt. HANG/LOOP (something) AROUND/ON/OVER WIRE should also work (this is considered identical to sliding -- you can't hang something on the wire and *not* slide down). SLIDE ON/ALONG/DOWN WIRE, without naming a second noun, implies sliding down with bare hands, and generates the response detailed below, as does CLIMB WIRE, CLIMB DOWN/ON WIRE, or STAND ON/GET ON/ENTER wire. Simply typing NORTH, SOUTH, EAST, or WEST is synonymous with sliding down the wire with bare hands.]

[If the player successfully slides down a cable, she is moved to the room containing the corresponding support post.]

### Commands and Results

**Command [sliding down wire with bare hands]:** 
The cable is too steep for you to climb down, and the rough cable would tear up your hands. But if you had something you could loop over the cable, you might be able to slide down the cable while hanging underneath.

**Command [sliding down wire with something other than the rope or the belt]:** 
You can't loop [whatever] around the cable.

**Command [sliding down wire while wearing disguise]:** 
You should take off your cloak and put your hat on first. People are going to see you when you slide down -- your disguise won't do you much good if everyone recognizes you as the crazy girl on the support cables.

**Command [slide down wire with rope]:** 
You loop the rope over the cable and push off from the support post. Almost immediately, you realize it isn't going to work: the rope is too thick, too stiff and hard to hold. Halfway down your grip fails, and you land with a crash in the middle of the [room where player ends up]. Stallkeepers and shoppers alike are yelling and pointing at you. By the time you get to your feet, the mercenaries are already closing in you! 

[**Programmer's Note:** move the Mercenary to the player's location, with the Mercenary already aware of the player and moving to grab her in one turn.]

**Command [slide down wire with belt]:** 
You wrap one end of the belt around your hand and sling the supple leather over the anchor cable. Then, after giving it one more good yank to test your grip, you push off.

The wind is exhilarating as you zip down the line to the ground below. Several people look up, including the mercenaries. Shouts ring out and fingers point. You hit the support post with your feet, let go of the belt, and drop to the ground next to the [room where player ends up], slightly breathless. Not everyone saw where you landed -- most people are still staring up at the wires. You've only got a few moments while the guards' chins are still in the air. Better make the most of them.

[**Programmer's Note:** Move the Mercenary to the player's location in three turns, with the Mercenary *unaware* of the player.]
