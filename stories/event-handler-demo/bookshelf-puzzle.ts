/**
 * Bookshelf Puzzle - Event Handler Demo
 * 
 * This story demonstrates entity-level event handlers.
 * Push the right book to open a secret passage.
 */

import { StoryWithEvents, StoryConfig } from '@sharpee/engine';
import { WorldModel, IFEntity } from '@sharpee/world-model';
import { createMessageHandler } from '@sharpee/stdlib';

export class BookshelfPuzzleStory extends StoryWithEvents {
  constructor() {
    super({
      id: 'bookshelf-puzzle',
      title: 'The Secret Bookshelf',
      author: 'Event Handler Demo',
      version: '1.0.0',
      description: 'A simple puzzle demonstrating event handlers'
    });
  }
  
  initializeWorld(world: WorldModel): void {
    // Create the library room
    const library = world.createEntity('library', 'room');
    library.attributes.name = 'Library';
    library.attributes.description = 'A dusty old library with towering bookshelves. One bookshelf in particular catches your eye.';
    
    // Create the bookshelf
    const bookshelf = world.createEntity('bookshelf', 'container');
    bookshelf.attributes.name = 'ornate bookshelf';
    bookshelf.attributes.description = 'An ornate wooden bookshelf filled with ancient tomes.';
    bookshelf.add({
      type: 'OPENABLE',
      isOpen: false
    });
    bookshelf.add({
      type: 'SCENERY'
    });
    world.setLocation(bookshelf.id, library.id);
    
    // Create the secret passage (revealed when bookshelf opens)
    const passage = world.createEntity('passage', 'exit');
    passage.attributes.name = 'secret passage';
    passage.attributes.description = 'A dark passage leading into the unknown.';
    passage.attributes.hidden = true;  // Initially hidden
    passage.add({
      type: 'EXIT',
      direction: 'north',
      destination: 'secret-room'
    });
    world.setLocation(passage.id, library.id);
    
    // Create books
    const redBook = world.createEntity('red-book', 'item');
    redBook.attributes.name = 'red leather book';
    redBook.attributes.description = 'A thick book bound in red leather. The spine reads "Secrets of the Ancients".';
    redBook.add({
      type: 'PUSHABLE',
      pushType: 'button'
    });
    world.setLocation(redBook.id, bookshelf.id);
    
    const blueBook = world.createEntity('blue-book', 'item');
    blueBook.attributes.name = 'blue leather book';
    blueBook.attributes.description = 'A thin book bound in blue leather. The spine reads "Ocean Mysteries".';
    blueBook.add({
      type: 'PUSHABLE',
      pushType: 'button'
    });
    world.setLocation(blueBook.id, bookshelf.id);
    
    const greenBook = world.createEntity('green-book', 'item');
    greenBook.attributes.name = 'green leather book';
    greenBook.attributes.description = 'A worn book bound in green leather. The spine reads "Forest Lore".';
    greenBook.add({
      type: 'PUSHABLE',
      pushType: 'button'
    });
    world.setLocation(greenBook.id, bookshelf.id);
    
    // Set up event handlers
    
    // The red book is the correct one - it opens the bookshelf
    redBook.on = {
      'if.event.pushed': (event) => {
        const openable = bookshelf.get('OPENABLE');
        if (openable && !openable.isOpen) {
          openable.isOpen = true;
          passage.attributes.hidden = false;  // Reveal the passage
          
          return [{
            id: `${Date.now()}-bookshelf-opens`,
            type: 'action.message',
            timestamp: Date.now(),
            data: {
              message: 'As you push the red book deeper into the shelf, you hear a click. The entire bookshelf swings open, revealing a secret passage leading north!'
            },
            entities: {}
          }];
        } else if (openable && openable.isOpen) {
          return [{
            id: `${Date.now()}-already-open`,
            type: 'action.message',
            timestamp: Date.now(),
            data: {
              message: 'The bookshelf is already open.'
            },
            entities: {}
          }];
        }
      }
    };
    
    // The blue book does nothing special
    blueBook.on = {
      'if.event.pushed': createMessageHandler(
        'You push the blue book, but nothing happens. Perhaps it\'s not the right one.'
      )
    };
    
    // The green book gives a hint
    greenBook.on = {
      'if.event.pushed': createMessageHandler(
        'You push the green book. Nothing happens, but you notice the red book seems slightly loose in its position.'
      )
    };
    
    // Create the secret room
    const secretRoom = world.createEntity('secret-room', 'room');
    secretRoom.attributes.name = 'Secret Chamber';
    secretRoom.attributes.description = 'A hidden chamber filled with mysterious artifacts and glowing crystals.';
    
    // Create the treasure in the secret room
    const treasure = world.createEntity('treasure', 'item');
    treasure.attributes.name = 'golden artifact';
    treasure.attributes.description = 'An ancient golden artifact that pulses with mysterious energy.';
    treasure.attributes.value = 1000;
    world.setLocation(treasure.id, secretRoom.id);
    
    // Add handler for taking the treasure (winning condition)
    treasure.on = {
      'if.event.taken': (event) => {
        return [{
          id: `${Date.now()}-victory`,
          type: 'action.message',
          timestamp: Date.now(),
          data: {
            message: '*** Congratulations! You\'ve found the legendary artifact! You win! ***'
          },
          entities: {}
        }];
      }
    };
    
    // Create exit back from secret room
    const exitBack = world.createEntity('exit-back', 'exit');
    exitBack.attributes.name = 'passage south';
    exitBack.add({
      type: 'EXIT',
      direction: 'south',
      destination: library.id
    });
    world.setLocation(exitBack.id, secretRoom.id);
  }
  
  createPlayer(world: WorldModel): IFEntity {
    const player = world.createEntity('player', 'actor');
    player.attributes.name = 'you';
    player.attributes.description = 'A curious adventurer.';
    
    // Start in the library
    const library = world.getEntity('library');
    if (library) {
      world.setLocation(player.id, library.id);
    }
    
    return player;
  }
}