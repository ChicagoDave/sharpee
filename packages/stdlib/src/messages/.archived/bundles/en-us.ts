/**
 * English (US) message bundle for Sharpee
 */

import { MessageBundleBuilder } from '../message-resolver';
import { ActionMessages, SystemMessages } from '../message-keys';

export const enUSBundle = new MessageBundleBuilder('en-US')
  // Taking actions
  .add(ActionMessages.CANT_TAKE_THAT, "You can't take that.")
  .add(ActionMessages.ALREADY_CARRYING, "You're already carrying that.")
  .add(ActionMessages.TAKEN, "Taken.")
  .add(ActionMessages.NOT_A_CONTAINER, "That's not something you can take things from.")
  
  // Dropping actions
  .add(ActionMessages.NOT_CARRYING, "You're not carrying that.")
  .add(ActionMessages.DROPPED, "Dropped.")
  
  // Examining actions
  .add(ActionMessages.NOTHING_SPECIAL, "You see nothing special about {target}.")
  .add(ActionMessages.CANT_SEE_THAT, "You can't see any such thing.")
  
  // Opening actions
  .add(ActionMessages.ALREADY_OPEN, "That's already open.")
  .add(ActionMessages.CANT_OPEN_THAT, "That's not something you can open.")
  .add(ActionMessages.OPENED, "Opened.")
  .add(ActionMessages.ITS_LOCKED, "It's locked.")
  
  // Going actions
  .add(ActionMessages.CANT_GO_THAT_WAY, "You can't go that way.")
  .add(ActionMessages.MOVED_TO, "You go {direction}.")
  
  // System messages
  .add(SystemMessages.UNKNOWN_COMMAND, "I didn't understand that command.")
  .add(SystemMessages.AMBIGUOUS_COMMAND, "I'm not sure what you're referring to.")
  .add(SystemMessages.NOTHING_HERE, "You can't see anything here.")
  .add(SystemMessages.SAVE_SUCCESSFUL, "Game saved.")
  .add(SystemMessages.LOAD_SUCCESSFUL, "Game loaded.")
  
  .build();

// Register the bundle on import
import { messageResolver } from '../message-resolver';
messageResolver.registerBundle(enUSBundle);
