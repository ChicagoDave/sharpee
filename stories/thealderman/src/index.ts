/**
 * The Alderman — A Murder at the Hotel
 *
 * A murder mystery reference implementation exercising the full Sharpee
 * NPC behavior chain: Conversation (ADR-142), Information Propagation
 * (ADR-144), Goal Pursuit (ADR-145), and Influence (ADR-146).
 *
 * Public interface: story (default export)
 * Owner: thealderman story
 */

import { Story, StoryConfig, GameEngine } from '@sharpee/engine';
import type { Parser } from '@sharpee/parser-en-us';
import type { LanguageProvider } from '@sharpee/lang-en-us';
import {
  WorldModel,
  IFEntity,
  EntityType,
  IdentityTrait,
  ActorTrait,
  ContainerTrait,
} from '@sharpee/world-model';
import { Action } from '@sharpee/stdlib';
import { NpcPlugin } from '@sharpee/plugin-npc';
import { SchedulerPlugin } from '@sharpee/plugin-scheduler';

import { createRooms, RoomIds } from './rooms';
import { createObjects } from './objects';
import { createNpcs } from './npcs';
import { customActions, ACCUSE_ACTION_ID } from './actions';
import { randomizeSolution } from './randomization';
import { MSG } from './messages';
import { STORY_VERSION } from './version';

const config: StoryConfig = {
  id: 'thealderman',
  title: 'The Alderman',
  author: 'David Cornelson',
  version: STORY_VERSION,
  description: 'A murder mystery in a grand 1870s Chicago hotel.',
};

class AldermanStory implements Story {
  config = config;

  createPlayer(world: WorldModel): IFEntity {
    const player = world.createEntity('yourself', EntityType.ACTOR);
    player.add(new IdentityTrait({
      name: 'yourself',
      description: 'An up-and-coming architect riding the post-fire reconstruction boom.',
      aliases: ['self', 'myself', 'me'],
      properName: true,
      article: '',
    }));
    player.add(new ActorTrait({ isPlayer: true }));
    player.add(new ContainerTrait({ capacity: { maxItems: 10 } }));
    return player;
  }

  initializeWorld(world: WorldModel): void {
    createRooms(world);
    createObjects(world);
    createNpcs(world);

    // Randomize the solution
    const solution = randomizeSolution(world);

    // Store solution for debugging
    world.setStateValue('alderman.solution.killer', solution.killerName);
    world.setStateValue('alderman.solution.weapon', solution.weaponName);
    world.setStateValue('alderman.solution.location', solution.locationName);
    world.setStateValue('alderman.accusation.count', 0);

    // Place player in their room (morning after arrival)
    const player = world.getPlayer()!;
    world.moveEntity(player.id, RoomIds.room310);
  }

  getCustomActions(): Action[] {
    return customActions;
  }

  extendParser(parser: Parser): void {
    const grammar = parser.getStoryGrammar();

    // ACCUSE [suspect] WITH [weapon]
    grammar
      .define('accuse :target with :instrument')
      .mapsTo(ACCUSE_ACTION_ID)
      .withPriority(150)
      .build();

    grammar
      .define('accuse :target')
      .mapsTo(ACCUSE_ACTION_ID)
      .withPriority(140)
      .build();

    // CONFRONT [npc] — alias for TALK TO with aggressive intent
    grammar
      .define('confront :target')
      .mapsTo('if.action.talking')
      .withPriority(150)
      .build();

    // SEARCH [thing] — use stdlib searching action
    grammar
      .forAction('if.action.searching')
      .verbs(['search', 'investigate', 'inspect'])
      .pattern(':target')
      .build();

    // TALK TO [npc]
    grammar
      .define('talk to :target')
      .mapsTo('if.action.talking')
      .withPriority(95)
      .build();

    grammar
      .define('question :target')
      .mapsTo('if.action.talking')
      .withPriority(95)
      .build();

    grammar
      .define('interrogate :target')
      .mapsTo('if.action.talking')
      .withPriority(95)
      .build();

    // ASK [npc] ABOUT [topic]
    grammar
      .define('ask :target about :topic')
      .mapsTo('if.action.talking')
      .withPriority(100)
      .build();

    // SHOW [item] TO [npc]
    grammar
      .define('show :item to :target')
      .mapsTo('if.action.showing')
      .withPriority(95)
      .build();
  }

  extendLanguage(language: LanguageProvider): void {
    // --- ROSS ---
    language.addMessage(MSG.ROSS_STEPHANIE_SAD, '"She was... she was everything to me." Ross stares into his glass. "I can\'t believe she\'s gone."');
    language.addMessage(MSG.ROSS_STEPHANIE_ANGRY, '"Don\'t you talk about her like that!" Ross slams his fist on the bar. "You didn\'t know her."');
    language.addMessage(MSG.ROSS_STEPHANIE_DEFLECT, 'Ross looks away. "I don\'t want to talk about it."');
    language.addMessage(MSG.ROSS_RELATIONSHIP_ADMITS, '"Yeah, we were together. So what? A man\'s got a right to his private life."');
    language.addMessage(MSG.ROSS_RELATIONSHIP_DEFLECT, 'Ross shrugs uncomfortably. "We were friends. That\'s all you need to know."');
    language.addMessage(MSG.ROSS_GAMBLING_TRUTH, '"Alright, fine. I owed her money. A lot of it. But I was paying it back — I swear on my mother."');
    language.addMessage(MSG.ROSS_GAMBLING_DENIES, '"Gambling? I play cards for fun. Nothing serious." His hand trembles slightly.');
    language.addMessage(MSG.ROSS_GAMBLING_REFUSE, '"That\'s none of your damn business."');
    language.addMessage(MSG.ROSS_ALIBI_BAR, '"I was right here at the bar all night. Ask Catherine — she served me."');
    language.addMessage(MSG.ROSS_JACK_OPINION, '"Margolin? That blowhard. He thinks he owns this town. Wouldn\'t surprise me if he owned the trouble, too."');
    language.addMessage(MSG.ROSS_INTIMIDATES, 'Ross stands up abruptly, fists clenched, jaw tight.');
    language.addMessage(MSG.ROSS_INTIMIDATION_RESISTED, 'You meet Ross\'s gaze steadily. He sits back down.');
    language.addMessage(MSG.ROSS_MOVES_TO_BAR, 'Ross heads to the bar, looking like he needs a drink.');
    language.addMessage(MSG.ROSS_DRINKS, 'Ross signals for another whiskey.');
    language.addMessage(MSG.ROSS_PACES_FOYER, 'Ross paces through the foyer, running a hand through his hair.');

    // --- VIOLA ---
    // AUTHOR REVIEW: These dialogue lines need voice/personality polish
    language.addMessage(MSG.VIOLA_STEPHANIE_LIES, '"Such a tragedy. I barely knew her — we\'d exchanged pleasantries in the lobby, nothing more." She says it perfectly.');
    language.addMessage(MSG.VIOLA_STEPHANIE_DEFLECTS, '"Must we dwell on the morbid? The poor woman deserves to rest in peace."');
    language.addMessage(MSG.VIOLA_STEPHANIE_OMITS, 'Viola sighs delicately. "I\'m afraid I have nothing useful to offer."');
    language.addMessage(MSG.VIOLA_FAMILY_DENIES, '"Family? I have no connections to Miss Bordeau. We simply stayed at the same hotel."');
    language.addMessage(MSG.VIOLA_FAMILY_CONFESSES, '"Fine. She was my half-sister." Viola\'s composure cracks. "Same father, different mothers. She got everything. I got a stage name and an empty purse."');
    language.addMessage(MSG.VIOLA_FAMILY_DEFLECTS, '"What a curious question. Are you writing a society column?"');
    language.addMessage(MSG.VIOLA_ALIBI_REHEARSAL, '"I was at McVicker\'s until quite late — rehearsals for The Heiress. You can check with the stage manager."');
    language.addMessage(MSG.VIOLA_THEATRE_TRUTH, '"The Heiress. A play about a woman denied her inheritance." A bitter smile crosses her lips. "I find the role... relatable."');
    language.addMessage(MSG.VIOLA_INHERITANCE_REFUSES, '"I don\'t see how finances are relevant to a murder investigation."');
    language.addMessage(MSG.VIOLA_INHERITANCE_BITTER, '"She inherited everything from our father. Everything. And I was left to make my own way. Is that a motive? You tell me."');
    language.addMessage(MSG.VIOLA_REHEARSING, 'Viola stands on the stage, mouthing lines to herself with graceful gestures.');
    language.addMessage(MSG.VIOLA_DINING, 'Viola takes a table by the window, ordering with the ease of a regular.');
    language.addMessage(MSG.VIOLA_GREETS_PLAYER, '"Ah, the architect." Viola turns with a practiced smile. "Come to see the scene of the crime, or just the scenery?"');

    // --- JOHN ---
    language.addMessage(MSG.JOHN_STEPHANIE_TERSE, '"Dead is dead." John doesn\'t look up from his drink.');
    language.addMessage(MSG.JOHN_BUSINESS_VAGUE, '"Miss Bordeau and I had an arrangement. Mutually beneficial. That\'s all I\'ll say."');
    language.addMessage(MSG.JOHN_BUSINESS_REFUSES, 'John\'s eyes go flat. "Drop it."');
    language.addMessage(MSG.JOHN_DINNER_DEFLECTS, '"A man can eat dinner with whoever he likes. Last I checked, that wasn\'t a crime."');
    language.addMessage(MSG.JOHN_ALIBI_DOCKS, '"I left early. Had business at the docks." He offers nothing else.');
    language.addMessage(MSG.JOHN_MENACE_NOTICED, 'John Barber is here, watching the room with quiet, predatory attention. The other guests seem to give him a wide berth.');
    language.addMessage(MSG.JOHN_SEARCHES_ROOM, 'John rifles through the writing desk, pocketing something.');
    language.addMessage(MSG.JOHN_CAUGHT_SEARCHING, 'John straightens up smoothly. "Wrong room," he says, walking past you without hurry.');

    // --- CATHERINE ---
    language.addMessage(MSG.CATHERINE_STEPHANIE_FRIEND, '"Stephanie was my dearest friend. Twenty years. I still can\'t..." Catherine presses a handkerchief to her eyes.');
    language.addMessage(MSG.CATHERINE_STEPHANIE_DETAIL, '"She was worried about something these last few weeks. Wouldn\'t say what. But I saw her writing letters late at night."');
    language.addMessage(MSG.CATHERINE_WILL_EXECUTOR, '"I\'m the executor of her estate, yes. She trusted me to see things done properly."');
    language.addMessage(MSG.CATHERINE_WILL_VAGUE, '"Her affairs are... complicated. I\'m not at liberty to discuss the details."');
    language.addMessage(MSG.CATHERINE_FAMILY_HINT, '"Family..." Catherine hesitates. "Stephanie always said she had no family left. But I wonder sometimes if that was entirely true."');
    language.addMessage(MSG.CATHERINE_FAMILY_DEFLECTS, '"Some things are not my secrets to tell."');
    language.addMessage(MSG.CATHERINE_ROSS_AT_BAR, '"Ross was at the bar most of the night. I served him myself. Though I did step away for a bit around nine."');
    language.addMessage(MSG.CATHERINE_VIOLA_OBSERVATION, '"Miss Wainright. She\'s been staying here often lately. More often than an actress between shows would need to."');
    language.addMessage(MSG.CATHERINE_VIOLA_CAREFUL, '"She\'s a lovely woman. I\'m sure she has her reasons for being here."');
    language.addMessage(MSG.CATHERINE_JOHN_WARNING, '"Mr. Barber is not a man to cross. Be careful what you say around him."');
    language.addMessage(MSG.CATHERINE_JACK_TROUBLE, '"Margolin\'s been in a state lately. Louder than usual, and that\'s saying something. Money trouble, if I had to guess."');
    language.addMessage(MSG.CATHERINE_CHELSEA_SYMPATHY, '"That poor girl. She seems lost. I\'ve tried to look after her — she reminds me of someone."');
    language.addMessage(MSG.CATHERINE_ALIBI_RESTAURANT, '"I was closing up the restaurant. Chelsea can tell you — she saw me."');
    language.addMessage(MSG.CATHERINE_GUESTS_OVERVIEW, '"Let me think. Ross was at the bar. Miss Wainright said she was at the theatre. Mr. Barber left early. Margolin was in his room. Chelsea was doing her rounds."');
    language.addMessage(MSG.CATHERINE_CHECKS_KITCHEN, 'Catherine slips into the kitchen to check on the morning preparations.');
    language.addMessage(MSG.SCENE_CATHERINE_CHELSEA_1, '"Are you alright, dear? You look pale."');
    language.addMessage(MSG.SCENE_CATHERINE_CHELSEA_2, '"I\'m fine, Mrs. Shelby. Just... tired."');
    language.addMessage(MSG.SCENE_CATHERINE_CHELSEA_3, '"Hmm." Catherine studies Chelsea\'s face for a moment. "You come find me if you need anything."');

    // --- JACK ---
    language.addMessage(MSG.JACK_STEPHANIE_BLUSTER, '"Terrible business. Terrible! But I don\'t see what it has to do with me." Jack\'s voice fills the room.');
    language.addMessage(MSG.JACK_BLOCKS_EXIT, '"Now hold on — you come in here throwing accusations around, you can damn well stay and explain yourself!"');
    language.addMessage(MSG.JACK_PROPERTY_DENIES, '"I\'m a businessman. I own property. That\'s what I do. No debts worth mentioning."');
    language.addMessage(MSG.JACK_PROPERTY_CONFESSES, 'Jack deflates like a punctured balloon. "She held the deed to the hotel. If she called it in, I\'d lose everything. But I didn\'t kill her — I needed her alive more than anyone!"');
    language.addMessage(MSG.JACK_PROPERTY_REFUSES, '"Get out of my room before I have you thrown out."');
    language.addMessage(MSG.JACK_ALIBI_ROOM_SERVICE, '"I was in my room. Called for room service at nine. You can ask the staff."');
    language.addMessage(MSG.JACK_HOTEL_DEFLECTS, '"The Alderman is a fine establishment. Best in the city. That\'s all that matters."');
    language.addMessage(MSG.JACK_BULLIES, '"You know who I am?" Jack steps closer, jabbing a finger at you. "I\'ve ruined men bigger than you."');
    language.addMessage(MSG.JACK_BULLYING_RESISTED, 'You stand your ground. Jack\'s bluster fades into an uneasy silence.');
    language.addMessage(MSG.JACK_OFFERS_HUSH_MONEY, 'You overhear Jack pressing a folded bill into someone\'s hand. "Keep quiet about the property business."');
    language.addMessage(MSG.JACK_HUSH_RESISTED, '"I don\'t need your money, Mr. Margolin."');
    language.addMessage(MSG.JACK_ENTERS_BAR, 'Jack Margolin strides into the bar like he owns it. Which, technically, he might not for much longer.');
    language.addMessage(MSG.JACK_LOBBY_DEALS, 'Jack is in the foyer, cornering a guest about some real estate proposition.');

    // --- CHELSEA ---
    language.addMessage(MSG.CHELSEA_STEPHANIE_HESITANT, '"Miss Bordeau was... she was kind to me. More than most guests." Chelsea\'s voice is barely above a whisper.');
    language.addMessage(MSG.CHELSEA_STEPHANIE_OMITS, 'Chelsea looks down at her cigarette tray. "I didn\'t know her well." Her hands shake slightly.');
    language.addMessage(MSG.CHELSEA_MOTHER_CONFESSION, '"I think she was my mother." Chelsea\'s eyes fill with tears. "I have a locket — the photograph inside looks just like her. I came here to find out the truth, and now..."');
    language.addMessage(MSG.CHELSEA_MOTHER_ASKS, '"Why do you ask about mothers?" Chelsea looks at you searchingly. "Do you know something?"');
    language.addMessage(MSG.CHELSEA_LOCKET_SHOWS, 'Chelsea opens a tarnished silver locket. Inside is a faded photograph of a young red-haired woman. The resemblance to Stephanie is unmistakable.');
    language.addMessage(MSG.CHELSEA_LOCKET_HIDES, 'Chelsea\'s hand goes to her throat, covering something beneath her collar. "It\'s nothing. Just a keepsake."');
    language.addMessage(MSG.CHELSEA_ALIBI_ROUNDS, '"I was doing my rounds — the foyer, the bar, the restaurant. People saw me. Though there was a while when I was between floors..."');
    language.addMessage(MSG.CHELSEA_CATHERINE_KIND, '"Mrs. Shelby is very kind. She looks after me. Sometimes I think she knows more than she lets on."');
    language.addMessage(MSG.CHELSEA_SEEKS_CATHERINE, 'Chelsea glances around the room, looking for Catherine.');
    language.addMessage(MSG.CHELSEA_ASKS_CATHERINE, 'Chelsea approaches Catherine quietly, clutching her locket.');
    language.addMessage(MSG.CHELSEA_FLEES, 'Chelsea hurries away, eyes wide with fright.');
    language.addMessage(MSG.CHELSEA_ROUNDS_BAR, 'Chelsea moves through the bar offering cigarettes, her smile thin and forced.');

    // --- ACCUSATION ---
    language.addMessage(MSG.ACCUSE_NO_TARGET, 'Accuse whom? You need to specify a suspect.');
    language.addMessage(MSG.ACCUSE_WRONG_HINT, '"That doesn\'t seem right." You reconsider your theory. (The {wrongPart} doesn\'t fit the evidence.)');
    language.addMessage(MSG.ACCUSE_WRONG_FINAL, 'The police arrive before you can make another attempt. The truth comes out in the investigation: it was {killerName}, with the {weaponName}, in {locationName}.');
    language.addMessage(MSG.ACCUSE_CORRECT, '"My God..." The room falls silent as the truth dawns on everyone. The evidence is irrefutable. Justice will be served.');
    language.addMessage(MSG.ACCUSE_TOO_MANY, 'The police have arrived. Your investigation is over.');

    // --- GAME FLOW ---
    language.addMessage(MSG.GAME_INTRO, 'You arrive at The Alderman as the gas lamps are being lit along State Street. A fine hotel — one of the new "fireproof" buildings going up all over the city. You check in and retire to Room 310.');
    language.addMessage(MSG.GAME_MORNING, 'You wake to raised voices and hurried footsteps in the hallway. Something has happened.');
    language.addMessage(MSG.GAME_MANAGER_REQUEST, 'The hotel manager appears at your door, pale-faced. "Sir — there\'s been a death. Miss Bordeau, in... well. The police have been sent for, but it will be hours. You\'re a man of education. Would you be willing to look into things? Discreetly?"');
  }

  onEngineReady(engine: GameEngine): void {
    // Register NPC plugin
    const npcPlugin = new NpcPlugin();
    engine.getPluginRegistry().register(npcPlugin);

    // Register scheduler for NPC routines
    const schedulerPlugin = new SchedulerPlugin();
    engine.getPluginRegistry().register(schedulerPlugin);

    // TODO: Register NPC behaviors with the NPC service
    // TODO: Register character phase handlers for propagation/goals/influence
    // TODO: Register event handlers for game flow (intro sequence, evidence discovery)
  }
}

export const story = new AldermanStory();
export default story;
