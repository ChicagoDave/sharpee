# Chapter I - Market Locations (Perimeter)

## 7. Northwest Junction

**Description**: 
This is the northwest corner of Grubber's Market. You can skirt around the edge of the market to the northeast or south, or head into the center of the market to the southeast. A wide, paved road leads north, towards Lord's Keep. You can also duck back into the alley to the northwest.

**Command [going north from Northwest Junction while mercenaries are present]:** 
You can't get out that way -- two of the mercenaries are loitering near the gate that leads out to Lord's Road. They haven't seen you yet, but you'd never get by without their noticing.

## 8. Fruit Stall

**Description**: 
Bins heaped high with bright-colored fruit lend a pleasant fragrance to this end of the market (though by afternoon it will have become a cloying reek that attracts more flies than customers). Aisles between the stalls lead southwest and southeast.

### Object: Bins/Fruit
**Description**: 
Mostly domestic, apples and pears from the city orchards, or brambleberries from the northern counties. A few of the baskets contain more exotic fare: oranges, limes, and kello fruit -- even a bushel of bananas from the Kozar Delta.

### Fruit Descriptions: 
[each of these should be a separate object]

- **Kello Fruit:** Normally you'd *kill* for a slice of kello, but these look a bit too green. Not quite in season.
- **Bananas:** You rarely see bananas this far north. These look just about perfect -- plump, bright yellow with just a sprinkling of brown freckles.
- **Apples:** You already sampled one this morning, and they're not half bad.
- **Brambleberries:** The thumb-sized clusters are shiny and bluish-black. Your mouth waters at the thought of how tart they must be.
- **Oranges:** The oranges look pale and disappointingly small.
- **Limes:** The dark green limes look refreshing.

**Command [smelling the fruit]:** It all smells delicious.

## 9. Miscellaneous Food

**Description**: 
Baskets bristling with loaves of bread; yellow pyramids of cheese; spiced jerky hanging in bundles overhead -- a typical grocer's stall. You can continue along the market's outer ring to the northwest or south.

### Object: Baskets/Food/Bread/Cheese/Jerky
**Description:** The food looks tasty enough, but you don't really have time for a meal right now.

## 10. Eastern Junction

**Description**: 
You're near the eastern edge of Grubber's Market. Commerce Street lies to the east. You can travel along the outer ring of stalls to the north or south, or head towards the market's central hub to the west.

### Exit Conditions

**Command [going east from Eastern Junction while mercenaries are present, without disguise]:** 
The ideal escape would be to head east, to Commerce Street, and lose yourself in the maze of the city. But a pair of mercenaries have planted themselves by the entrance to the square, and are eyeballing everyone who passes through. You'll need a disguise or a distraction -- preferably both -- to get past them.

**Command [going east from Eastern Junction with disguise, but without sliding down wires]:** 
You try to keep your head down and not walk to fast, but the mercenaries are being thorough. One of them points at you and says, "Check that one!"

The other one steps into your path. Before you can react, he bends down and stares into your face, then rips the bonnet off your head. "It's the boy!" he shouts, grabbing your arm. [**Programmer's Note:** This should start the three-turn countdown before the mercenary captain arrives, just as though the player had been grabbed as described above. The player should be able to escape by attacking the mercenary and/or stealing his dagger, as above.]

**Command [going east from Eastern Junction after escaping from Mercenary]:** 
There's too many of them in that direction; you've no choice but to dive back into the market!

**Event [leaving Eastern Junction after escaping from Mercenary]:** 
That was close -- *too* close. The mercenaries are paying too much attention for you to just slip by, even in disguise. You'll need to create some kind of distraction.

**Command [going east from Eastern Junction with disguise, after sliding down wires]:** 
You keep your head down and walk at a steady pace -- not too fast, not too slow. The mercenaries posted at the market's entrance aren't paying attention: they're looking over your head at the market, trying to see what the big commotion is under the awnings.

You hold your breath as you walk past, close enough to touch one of them. No one stops you. Five more steps...four...three...

And then you are past them, out of Grubber's Market and into Commerce Street and the inner city.

## 26. Eastern Edge

**Description**: 
Grubber's market is to the west, along with the searching mercenaries. Commerce Street beckons to the east.

## 28. Grubber's Market (Night Scenes)

**Programming Note:** 
[During night scenes, this single location represents the entire Grubber's Market. You can go north to Lord's Road, northwest to the Alley, or east to Merchant Street.]

**Description:** 
At night, the normally crowded marketplace becomes an empty maze of shadows, abandoned stalls and rolled-up canvas. The Lord's Road lies north, your little alley lies northwest, and Merchant Street lies back east.
