During unit testing, something funny shook out. One of the things rarely thought about in IF platforms is the object-oriented concept of encapsulation. The author can set any property on any object at any time and if there are negative consequences, so be it. Some hackery will ensue to make it all work “right”.

I designed Sharpee to adhere to some basic principles, specifically being loosely-coupled. In Sharpee, data is stored in an event source and a spatial index. These are only accessible through world model interfaces, like world.moveEntity(from, to). The moveEntity() function will validate what it’s doing before acting and fail if rules are broken.

So one of the integration tests is a closed medicine cabinet with medicine within. It should be simple enough to create an entity for an openable container that’s closed and another entity for medicine and place it inside the container.

But moveEntity won’t let you put anything in the closed medicine cabinet. The unit test would have to open the cabinet, move the medicine within, and close it, then run the test. This leads to other obvious setup and authorial configurations or world model state changes that should skip the normal rules. We don’t necessarily need the initial state of the game to be recorded in the event source. Or do we?

The proposed solution is to have two interfaces to the shared data storage. One is the current world.{behavior} that follows all rules and the new one would be author.{behavior} that skips the rules and does not fire events.

This seems, on the surface, like it would solve all of the problems, but this is an important decision and I wanted to see if anyone had thoughts.

Maybe the current behavior IS the correct behavior and any interaction with the world should follow all rules of physics at all times. Then we run into using magic, which has its own rules of physics, which would have to be accommodated within the Traits we have now. Or we’d need to make new Traits like MagicContainerTrait that allowed certain entities with the MagicTransportTrait to move into such a container.

I could easily punt this with the author interface. But it’s an interesting problem.