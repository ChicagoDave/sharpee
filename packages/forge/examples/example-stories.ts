/**
 * Example story using the Forge fluent API
 * This demonstrates how authors would create IF stories using Sharpee
 */

import { forge, US_EN } from '../src';

/**
 * Create "The Mysterious Key" - a simple example story
 */
export function createMysteriousKeyStory() {
  return forge()
    .languageSet(US_EN)
    .title("The Mysterious Key")
    .startIn("library")
    
    // Create the library room
    .room("library")
      .name("Old Library")
      .description("A dusty old library with towering bookshelves reaching up to a vaulted ceiling. Shafts of sunlight stream through tall windows, illuminating dancing dust motes. The air smells of old paper and leather bindings.")
      .item("brass-key")
        .name("brass key")
        .description("A small, ornate brass key with intricate engravings. It looks old but well-maintained.")
        .adjectives("small", "brass", "ornate")
        .takeable()
        .done()
      .item("reading-table")
        .name("reading table")
        .description("A heavy oak table with several books open upon it.")
        .surface()
        .fixed()
        .done()
      .exit("north", "hallway")
      .done()
    
    // Create the hallway
    .room("hallway")
      .name("Long Hallway")  
      .description("A long corridor stretches before you, its walls lined with oil paintings of stern-faced ancestors. A worn carpet runner extends down the center of the polished wooden floor.")
      .exit("south", "library")
      .exit("east", "study")
      .done()
    
    // Create the study
    .room("study")
      .name("Private Study")
      .description("A cozy study with a fireplace crackling warmly. Comfortable chairs are arranged around a small table. Bookshelves line the walls, filled with leather-bound volumes.")
      .item("locked-desk")
        .name("mahogany desk")
        .description("An elegant mahogany desk with several drawers. One drawer appears to be locked.")
        .container(false, true) // closed, but openable
        .fixed()
        .done()
      .exit("west", "hallway")
      .done()
      
    .build();
}

/**
 * Create a simple test story for unit testing
 */
export function createTestStory() {
  return forge()
    .languageSet(US_EN)
    .title("Test Story")
    .startIn("start")
    
    .room("start")
      .description("A simple test room.")
      .item("test-item")
        .description("A test item.")
        .takeable()
        .done()
      .done()
      
    .build();
}

/**
 * Example of a more complex story with NPCs and conversations
 */
export function createLibrarianStory() {
  return forge()
    .languageSet(US_EN)
    .title("The Helpful Librarian")
    .startIn("library-entrance")
    
    .room("library-entrance")
      .name("Library Entrance")
      .description("You stand in the entrance hall of a grand library. Marble columns support a high ceiling, and the sound of whispered conversations echoes softly.")
      .character("librarian")
        .name("Ms. Chen")
        .description("A kind-looking librarian with silver hair and wire-rimmed glasses. She wears a cardigan and has a name tag that reads 'Ms. Chen - Head Librarian'.")
        .friendly()
        .greeting("Welcome to the library! How may I help you today?")
        .canTalkAbout("books", "We have over 100,000 books in our collection. What subject interests you?")
        .canTalkAbout("hours", "We're open from 9 AM to 9 PM, Monday through Saturday.")
        .canTalkAbout("key", "Oh, that old brass key? I believe it opens something in the archives downstairs.")
        .done()
      .exit("north", "main-hall")
      .exit("down", "archives")
      .done()
      
    .room("main-hall")
      .name("Main Hall")
      .description("The main hall of the library is vast, with reading tables scattered throughout and tall windows providing natural light.")
      .exit("south", "library-entrance")
      .done()
      
    .room("archives")
      .name("Archives")
      .description("The basement archives are dimly lit and filled with old documents and rare books. A mysterious cabinet stands in the corner.")
      .item("old-cabinet")
        .name("oak cabinet")
        .description("An old oak cabinet with an ornate lock. It looks like it might need a special key.")
        .container(false, true)
        .fixed()
        .done()
      .exit("up", "library-entrance")
      .done()
      
    .build();
}
