/**
 * NPC definitions for The Alderman.
 *
 * Six suspects, each built with the CharacterBuilder/ConversationBuilder API
 * to demonstrate different ADR-141/142/144/145/146 features.
 *
 * | NPC              | Primary ADR Features Demonstrated                    |
 * |------------------|------------------------------------------------------|
 * | Ross Bielack     | Conversation constraints, mood triggers, influence    |
 * | Viola Wainright  | Skilled lies, propagation (selective/dramatic)        |
 * | John Barber      | Passive influence aura, goal pursuit (destroy evidence)|
 * | Catherine Shelby | Propagation hub (chatty), rich conversation tree      |
 * | Jack Margolin    | Active intimidation influence, brash refusals         |
 * | Chelsea Sumner   | Omission responses, goal pursuit (seek information)   |
 *
 * Public interface: createNpcs(), NpcIds
 * Owner: thealderman story
 */

import {
  WorldModel,
  EntityType,
  IdentityTrait,
  ActorTrait,
  NpcTrait,
} from '@sharpee/world-model';
import { ConversationBuilder } from '@sharpee/character';
import { RoomIds } from '../rooms';
import { MSG } from '../messages';

/** NPC entity IDs, set during creation. */
export const NpcIds = {
  ross: '',
  viola: '',
  john: '',
  catherine: '',
  jack: '',
  chelsea: '',
};

/**
 * Creates all six suspect NPCs with full character model definitions.
 *
 * @param world - The world model to populate
 */
export function createNpcs(world: WorldModel): void {
  createRoss(world);
  createViola(world);
  createJohn(world);
  createCatherine(world);
  createJack(world);
  createChelsea(world);
}

// ---------------------------------------------------------------------------
// Ross Bielack — Temperamental baseball player
// ADR features: Conversation constraints, mood triggers, influence
// ---------------------------------------------------------------------------

function createRoss(world: WorldModel): void {
  const entity = world.createEntity('Ross Bielack', EntityType.ACTOR);
  entity.add(new IdentityTrait({
    name: 'Ross Bielack',
    description: 'A broad-shouldered man in his late twenties with calloused hands and an uneasy smile. He smells faintly of whiskey.',
    aliases: ['ross', 'bielack', 'baseball player', 'ballplayer'],
    properName: true,
    article: '',
  }));
  entity.add(new ActorTrait({ isPlayer: false }));
  entity.add(new NpcTrait({ behaviorId: 'alderman.npc.ross' }));
  NpcIds.ross = entity.id;
  world.moveEntity(entity.id, RoomIds.bar);

  // Character definition using ConversationBuilder
  new ConversationBuilder('ross')
    // Personality and state
    .personality('very impulsive', 'defensive', 'slightly honest')
    .mood('anxious')
    .threat('wary')
    .cognitiveProfile('stable')

    // Relationships
    .loyalTo('stephanie')
    .dislikes('jack')
    .distrusts('john')

    // Knowledge
    .knows('stephanie-death', { witnessed: false, confidence: 'certain' })
    .knows('gambling-debts', { witnessed: true, confidence: 'certain' })
    .knows('stephanie-lover', { witnessed: true, confidence: 'certain' })
    .believes('jack-shady', { strength: 'suspects' })

    // Conversation topics
    .topic('stephanie', {
      keywords: ['stephanie', 'bordeau', 'victim', 'murder', 'death', 'killed'],
      related: ['relationship', 'last-night'],
    })
    .topic('relationship', {
      keywords: ['lover', 'relationship', 'together', 'romance', 'love'],
      related: ['stephanie', 'gambling'],
    })
    .topic('gambling', {
      keywords: ['gambling', 'debts', 'money', 'owe', 'cards', 'betting'],
      related: ['relationship'],
    })
    .topic('alibi', {
      keywords: ['alibi', 'last night', 'where were you', 'evening', 'whereabouts'],
      related: ['bar', 'catherine'],
    })
    .topic('jack', {
      keywords: ['jack', 'margolin', 'mogul', 'real estate'],
      related: ['stephanie'],
    })

    // Response chains — demonstrates constraint evaluation
    .when('asked about stephanie')
      .if('not threatened')
        .tell(MSG.ROSS_STEPHANIE_SAD)
        .setsContext('grieving', { intent: 'reluctant', strength: 'passive' })
      .if('threatened')
        .becomes('angry')
        .refuse(MSG.ROSS_STEPHANIE_ANGRY)
      .otherwise()
        .deflect(MSG.ROSS_STEPHANIE_DEFLECT)

    .when('asked about relationship')
      .if('not threatened')
        .tell(MSG.ROSS_RELATIONSHIP_ADMITS)
      .otherwise()
        .deflect(MSG.ROSS_RELATIONSHIP_DEFLECT)

    .when('asked about gambling')
      .if('not threatened', 'trusts player')
        .tell(MSG.ROSS_GAMBLING_TRUTH)
      .if('not threatened')
        .lie(MSG.ROSS_GAMBLING_DENIES)
      .otherwise()
        .refuse(MSG.ROSS_GAMBLING_REFUSE)

    .when('asked about alibi')
      .tell(MSG.ROSS_ALIBI_BAR)

    .when('asked about jack')
      .tell(MSG.ROSS_JACK_OPINION)
    .done()

    // Mood triggers
    .on('player accuses')
      .becomes('furious')
      .shift('threat', 'critical')
    .on('player sympathizes')
      .becomes('melancholy')
      .feelsAbout('player', 'trusts')

    // Influence — Ross can intimidate when cornered (ADR-146)
    .influence('intimidation')
      .mode('active')
      .range('proximity')
      .effect({ mood: 'nervous', threat: 'wary' })
      .duration('momentary')
      .witnessed(MSG.ROSS_INTIMIDATES)
      .resisted(MSG.ROSS_INTIMIDATION_RESISTED)
      .schedule({ when: ['mood is furious'] })
      .done()

    // Goal pursuit — paces between bar and room (ADR-145)
    .goal('restless-pacing')
      .activatesWhen('mood is anxious')
      .priority('low')
      .mode('sequential')
      .pursues([
        { type: 'moveTo', target: RoomIds.bar, witnessed: MSG.ROSS_MOVES_TO_BAR },
        { type: 'waitFor', conditions: ['3 turns elapsed'], witnessed: MSG.ROSS_DRINKS },
        { type: 'moveTo', target: RoomIds.foyer, witnessed: MSG.ROSS_PACES_FOYER },
        { type: 'moveTo', target: RoomIds.staircase },
      ])
      .done()

    // Propagation — Ross talks when drunk, but only about surface topics
    .propagation({
      tendency: 'chatty',
      audience: 'anyone',
      withholds: ['gambling', 'relationship'],
      pace: 'eager',
      coloring: 'dramatic',
    })

    .compile();
}

// ---------------------------------------------------------------------------
// Viola Wainright — Actress and hidden half-sister
// ADR features: Skilled lies, propagation (selective/dramatic), lifecycle
// ---------------------------------------------------------------------------

function createViola(world: WorldModel): void {
  const entity = world.createEntity('Viola Wainright', EntityType.ACTOR);
  entity.add(new IdentityTrait({
    name: 'Viola Wainright',
    description: 'A striking woman in her mid-thirties with dark eyes and an actress\'s poise. Every gesture seems rehearsed.',
    aliases: ['viola', 'wainright', 'actress'],
    properName: true,
    article: '',
  }));
  entity.add(new ActorTrait({ isPlayer: false }));
  entity.add(new NpcTrait({ behaviorId: 'alderman.npc.viola' }));
  NpcIds.viola = entity.id;
  world.moveEntity(entity.id, RoomIds.ballroom);

  new ConversationBuilder('viola')
    .personality('very deceptive', 'charming', 'bitter')
    .mood('composed')
    .threat('safe')
    .cognitiveProfile('stable')

    .loyalTo('viola') // loyal to herself
    .dislikes('stephanie')
    .distrusts('catherine')

    .knows('stephanie-death', { confidence: 'certain' })
    .knows('half-sister', { witnessed: true, confidence: 'certain' })
    .knows('inheritance-cut-out', { witnessed: true, confidence: 'certain' })
    .believes('catherine-knows-secret', { strength: 'suspects' })

    .topic('stephanie', {
      keywords: ['stephanie', 'bordeau', 'victim', 'murder', 'death'],
      related: ['family', 'hotel'],
    })
    .topic('family', {
      keywords: ['family', 'sister', 'father', 'mother', 'relative', 'blood'],
      related: ['stephanie', 'inheritance'],
    })
    .topic('inheritance', {
      keywords: ['inheritance', 'will', 'money', 'estate', 'fortune'],
      related: ['family', 'stephanie'],
    })
    .topic('alibi', {
      keywords: ['alibi', 'last night', 'where were you', 'evening', 'rehearsal', 'theatre'],
      related: ['theatre'],
    })
    .topic('theatre', {
      keywords: ['theatre', 'mcvicker', 'play', 'acting', 'performance', 'rehearsal'],
    })

    // Viola is a skilled liar — demonstrates varied response actions
    .when('asked about stephanie')
      .if('not cornered')
        .lie(MSG.VIOLA_STEPHANIE_LIES)
        .setsContext('performing', { intent: 'neutral', strength: 'assertive' })
      .if('cornered')
        .deflect(MSG.VIOLA_STEPHANIE_DEFLECTS)
      .otherwise()
        .omit(MSG.VIOLA_STEPHANIE_OMITS)

    .when('asked about family')
      .if('not cornered', 'not threatened')
        .lie(MSG.VIOLA_FAMILY_DENIES)
      .if('cornered')
        .confess(MSG.VIOLA_FAMILY_CONFESSES)
        .updatesState({ mood: 'bitter' })
      .otherwise()
        .deflect(MSG.VIOLA_FAMILY_DEFLECTS)

    .when('asked about alibi')
      .lie(MSG.VIOLA_ALIBI_REHEARSAL)

    .when('asked about theatre')
      .tell(MSG.VIOLA_THEATRE_TRUTH)

    .when('asked about inheritance')
      .if('not cornered')
        .refuse(MSG.VIOLA_INHERITANCE_REFUSES)
      .otherwise()
        .confess(MSG.VIOLA_INHERITANCE_BITTER)
    .done()

    .on('confronted with program')
      .becomes('cornered')
      .shift('threat', 'wary')
    .on('player flatters')
      .becomes('amused')
      .feelsAbout('player', 'likes')

    // Propagation — selective, dramatic coloring (ADR-144)
    .propagation({
      tendency: 'selective',
      audience: 'trusted',
      spreads: ['stephanie-death', 'hotel-gossip'],
      pace: 'gradual',
      coloring: 'dramatic',
    })

    // Goal — rehearse in ballroom, then socialize (ADR-145)
    .goal('daily-routine')
      .activatesWhen('always')
      .priority('medium')
      .mode('sequential')
      .pursues([
        { type: 'moveTo', target: RoomIds.ballroom, witnessed: MSG.VIOLA_REHEARSING },
        { type: 'waitFor', conditions: ['3 turns elapsed'] },
        { type: 'moveTo', target: RoomIds.restaurant, witnessed: MSG.VIOLA_DINING },
        { type: 'waitFor', conditions: ['2 turns elapsed'] },
        { type: 'moveTo', target: RoomIds.foyer },
      ])
      .done()

    // Conversation lifecycle — assertive, holds the floor (ADR-142)
    .initiates(['player enters ballroom'], MSG.VIOLA_GREETS_PLAYER)

    .compile();
}

// ---------------------------------------------------------------------------
// John Barber — Gang enforcer
// ADR features: Passive influence aura, goal pursuit, terse conversation
// ---------------------------------------------------------------------------

function createJohn(world: WorldModel): void {
  const entity = world.createEntity('John Barber', EntityType.ACTOR);
  entity.add(new IdentityTrait({
    name: 'John Barber',
    description: 'A lean man in a perfectly tailored suit. He watches everything with flat, appraising eyes.',
    aliases: ['john', 'barber', 'gangster', 'gang member'],
    properName: true,
    article: '',
  }));
  entity.add(new ActorTrait({ isPlayer: false }));
  entity.add(new NpcTrait({ behaviorId: 'alderman.npc.john' }));
  NpcIds.john = entity.id;
  world.moveEntity(entity.id, RoomIds.bar);

  new ConversationBuilder('john')
    .personality('very guarded', 'cold', 'intelligent')
    .mood('calm')
    .threat('safe')
    .cognitiveProfile('stable')

    .distrusts('player')
    .dislikes('jack')
    .loyalTo('stephanie')

    .knows('stephanie-death', { confidence: 'certain' })
    .knows('business-arrangement', { witnessed: true, confidence: 'certain' })
    .knows('enforcement-work', { witnessed: true, confidence: 'certain' })

    .topic('stephanie', {
      keywords: ['stephanie', 'bordeau', 'victim', 'murder', 'death'],
      related: ['business', 'dinner'],
    })
    .topic('business', {
      keywords: ['business', 'arrangement', 'work', 'job', 'enforce', 'collect'],
      related: ['stephanie'],
    })
    .topic('dinner', {
      keywords: ['dinner', 'dining', 'seen together', 'restaurant'],
      related: ['stephanie', 'business'],
    })
    .topic('alibi', {
      keywords: ['alibi', 'last night', 'where were you', 'evening', 'docks'],
    })

    // John is terse — refuses easily, gives minimal information
    .when('asked about stephanie')
      .refuse(MSG.JOHN_STEPHANIE_TERSE)

    .when('asked about business')
      .if('trusts player')
        .tell(MSG.JOHN_BUSINESS_VAGUE)
      .otherwise()
        .refuse(MSG.JOHN_BUSINESS_REFUSES)

    .when('asked about dinner')
      .deflect(MSG.JOHN_DINNER_DEFLECTS)

    .when('asked about alibi')
      .tell(MSG.JOHN_ALIBI_DOCKS)
    .done()

    .on('player threatens')
      .becomes('cold')
    .on('player shows respect')
      .feelsAbout('player', 'tolerates')

    // Passive influence — his presence makes people nervous (ADR-146)
    .influence('menace')
      .mode('passive')
      .range('room')
      .effect({ mood: 'nervous', threat: 'wary' })
      .duration('while present')
      .witnessed(MSG.JOHN_MENACE_NOTICED)
      .done()

    // Goal — destroy evidence of business arrangement (ADR-145)
    .goal('destroy-evidence')
      .activatesWhen('mood is not calm')
      .priority('high')
      .mode('opportunistic')
      .pursues([
        { type: 'moveTo', target: RoomIds.room302 },
        { type: 'act', messageId: MSG.JOHN_SEARCHES_ROOM },
      ])
      .interruptedBy('player present')
      .onInterrupt(MSG.JOHN_CAUGHT_SEARCHING)
      .done()

    // Goal — patrol bar and foyer
    .goal('patrol')
      .activatesWhen('always')
      .priority('low')
      .mode('sequential')
      .pursues([
        { type: 'moveTo', target: RoomIds.bar },
        { type: 'waitFor', conditions: ['2 turns elapsed'] },
        { type: 'moveTo', target: RoomIds.foyer },
        { type: 'waitFor', conditions: ['2 turns elapsed'] },
      ])
      .done()

    // Propagation — mute, says nothing to anyone (ADR-144)
    .propagation({
      tendency: 'mute',
    })

    .compile();
}

// ---------------------------------------------------------------------------
// Catherine Shelby — Restaurant hostess, information hub
// ADR features: Propagation hub (chatty), rich conversation tree
// ---------------------------------------------------------------------------

function createCatherine(world: WorldModel): void {
  const entity = world.createEntity('Catherine Shelby', EntityType.ACTOR);
  entity.add(new IdentityTrait({
    name: 'Catherine Shelby',
    description: 'A handsome woman in her fifties with sharp eyes behind wire-rimmed spectacles. She moves through the restaurant like she owns it.',
    aliases: ['catherine', 'shelby', 'hostess', 'mrs shelby'],
    properName: true,
    article: '',
  }));
  entity.add(new ActorTrait({ isPlayer: false }));
  entity.add(new NpcTrait({ behaviorId: 'alderman.npc.catherine' }));
  NpcIds.catherine = entity.id;
  world.moveEntity(entity.id, RoomIds.restaurant);

  new ConversationBuilder('catherine')
    .personality('very observant', 'honest', 'protective', 'warm')
    .mood('concerned')
    .threat('safe')
    .cognitiveProfile('stable')

    .loyalTo('stephanie')
    .likes('chelsea')
    .likes('player')
    .distrusts('jack')
    .distrusts('john')

    .knows('stephanie-death', { confidence: 'certain' })
    .knows('executor-of-will', { witnessed: true, confidence: 'certain' })
    .knows('viola-half-sister', { witnessed: true, confidence: 'certain' })
    .knows('ross-at-bar', { witnessed: true, confidence: 'certain' })
    .knows('jack-debts', { witnessed: false, confidence: 'suspects' })
    .knows('chelsea-locket', { witnessed: true, confidence: 'suspects' })
    .knows('john-business', { witnessed: false, confidence: 'suspects' })

    .topic('stephanie', {
      keywords: ['stephanie', 'bordeau', 'victim', 'murder', 'death'],
      related: ['will', 'family', 'guests'],
    })
    .topic('will', {
      keywords: ['will', 'executor', 'estate', 'inheritance', 'legal'],
      related: ['stephanie', 'family'],
    })
    .topic('family', {
      keywords: ['family', 'sister', 'daughter', 'relative', 'blood'],
      related: ['viola', 'chelsea', 'stephanie'],
    })
    .topic('ross', {
      keywords: ['ross', 'bielack', 'baseball'],
      related: ['alibi', 'bar'],
    })
    .topic('viola', {
      keywords: ['viola', 'wainright', 'actress'],
      related: ['family', 'theatre'],
    })
    .topic('john', {
      keywords: ['john', 'barber', 'gangster', 'gang'],
      related: ['stephanie', 'business'],
    })
    .topic('jack', {
      keywords: ['jack', 'margolin', 'real estate', 'mogul'],
      related: ['debts', 'stephanie'],
    })
    .topic('chelsea', {
      keywords: ['chelsea', 'sumner', 'cigarette girl'],
      related: ['family', 'locket'],
    })
    .topic('alibi', {
      keywords: ['alibi', 'last night', 'where were you', 'evening'],
      related: ['restaurant', 'ross'],
    })
    .topic('guests', {
      keywords: ['guests', 'regulars', 'who was here', 'visitors'],
      related: ['ross', 'viola', 'john', 'jack'],
    })

    // Catherine has the richest conversation tree — she knows everything
    .when('asked about stephanie')
      .tell(MSG.CATHERINE_STEPHANIE_FRIEND)
      .setsContext('remembering', { intent: 'eager', strength: 'assertive' })
      .betweenTurns(2, MSG.CATHERINE_STEPHANIE_DETAIL)

    .when('asked about will')
      .if('trusts player')
        .tell(MSG.CATHERINE_WILL_EXECUTOR)
      .otherwise()
        .omit(MSG.CATHERINE_WILL_VAGUE)

    .when('asked about family')
      .if('trusts player', 'not protective of viola')
        .tell(MSG.CATHERINE_FAMILY_HINT)
      .otherwise()
        .deflect(MSG.CATHERINE_FAMILY_DEFLECTS)

    .when('asked about ross')
      .tell(MSG.CATHERINE_ROSS_AT_BAR)

    .when('asked about viola')
      .if('not protective of viola')
        .tell(MSG.CATHERINE_VIOLA_OBSERVATION)
      .otherwise()
        .omit(MSG.CATHERINE_VIOLA_CAREFUL)

    .when('asked about john')
      .tell(MSG.CATHERINE_JOHN_WARNING)

    .when('asked about jack')
      .tell(MSG.CATHERINE_JACK_TROUBLE)

    .when('asked about chelsea')
      .tell(MSG.CATHERINE_CHELSEA_SYMPATHY)

    .when('asked about alibi')
      .tell(MSG.CATHERINE_ALIBI_RESTAURANT)

    .when('asked about guests')
      .tell(MSG.CATHERINE_GUESTS_OVERVIEW)
    .done()

    .on('player shares evidence')
      .becomes('worried')
    .on('player threatens')
      .becomes('defiant')
      .feelsAbout('player', 'distrusts')

    // Propagation — chatty, the hotel's information hub (ADR-144)
    .propagation({
      tendency: 'chatty',
      audience: 'anyone',
      withholds: ['viola-half-sister', 'executor-of-will'],
      pace: 'eager',
      coloring: 'neutral',
    })

    // Goal — work the restaurant (ADR-145)
    .goal('restaurant-shift')
      .activatesWhen('always')
      .priority('medium')
      .mode('sequential')
      .pursues([
        { type: 'moveTo', target: RoomIds.restaurant },
        { type: 'waitFor', conditions: ['3 turns elapsed'] },
        { type: 'moveTo', target: RoomIds.kitchen, witnessed: MSG.CATHERINE_CHECKS_KITCHEN },
        { type: 'waitFor', conditions: ['2 turns elapsed'] },
      ])
      .done()

    // NPC-to-NPC scene — Catherine and Chelsea (ADR-142 witnessed)
    .witnessed({
      npcA: 'catherine',
      npcB: 'chelsea',
      conditions: ['chelsea in restaurant'],
      dialogue: [
        { speaker: 'catherine', messageId: MSG.SCENE_CATHERINE_CHELSEA_1 },
        { speaker: 'chelsea', messageId: MSG.SCENE_CATHERINE_CHELSEA_2 },
        { speaker: 'catherine', messageId: MSG.SCENE_CATHERINE_CHELSEA_3 },
      ],
      mutations: {},
      playerLearns: { 'catherine-protective-of-chelsea': { source: 'overheard' } },
    })

    .compile();
}

// ---------------------------------------------------------------------------
// Jack Margolin — Real estate mogul
// ADR features: Active intimidation, brash refusals, NPC-to-NPC influence
// ---------------------------------------------------------------------------

function createJack(world: WorldModel): void {
  const entity = world.createEntity('Jack Margolin', EntityType.ACTOR);
  entity.add(new IdentityTrait({
    name: 'Jack Margolin',
    description: 'A heavyset man with a red face and a diamond stickpin. He fills every room he enters with sheer volume.',
    aliases: ['jack', 'margolin', 'mogul', 'real estate'],
    properName: true,
    article: '',
  }));
  entity.add(new ActorTrait({ isPlayer: false }));
  entity.add(new NpcTrait({ behaviorId: 'alderman.npc.jack' }));
  NpcIds.jack = entity.id;
  world.moveEntity(entity.id, RoomIds.room308);

  new ConversationBuilder('jack')
    .personality('very aggressive', 'dishonest', 'cowardly')
    .mood('agitated')
    .threat('wary')
    .cognitiveProfile('stable')

    .dislikes('player')
    .dislikes('john')
    .distrusts('stephanie')

    .knows('stephanie-death', { confidence: 'certain' })
    .knows('property-debt', { witnessed: true, confidence: 'certain' })
    .knows('hotel-deed', { witnessed: true, confidence: 'certain' })

    .topic('stephanie', {
      keywords: ['stephanie', 'bordeau', 'victim', 'murder', 'death'],
      related: ['property', 'hotel'],
    })
    .topic('property', {
      keywords: ['property', 'debt', 'deed', 'real estate', 'mortgage', 'owe'],
      related: ['stephanie', 'hotel'],
    })
    .topic('hotel', {
      keywords: ['hotel', 'alderman', 'ownership', 'building'],
      related: ['property', 'stephanie'],
    })
    .topic('alibi', {
      keywords: ['alibi', 'last night', 'where were you', 'evening', 'room service'],
    })

    // Jack blusters and refuses — demonstrates blocking conversation
    .when('asked about stephanie')
      .refuse(MSG.JACK_STEPHANIE_BLUSTER)
      .setsContext('defensive', { intent: 'hostile', strength: 'blocking' })
      .onLeaveAttempt(MSG.JACK_BLOCKS_EXIT)

    .when('asked about property')
      .if('not cornered')
        .lie(MSG.JACK_PROPERTY_DENIES)
      .if('cornered')
        .becomes('terrified')
        .confess(MSG.JACK_PROPERTY_CONFESSES)
      .otherwise()
        .refuse(MSG.JACK_PROPERTY_REFUSES)

    .when('asked about alibi')
      .tell(MSG.JACK_ALIBI_ROOM_SERVICE)

    .when('asked about hotel')
      .deflect(MSG.JACK_HOTEL_DEFLECTS)
    .done()

    .on('confronted with letter')
      .becomes('cornered')
      .shift('threat', 'critical')
    .on('player backs down')
      .becomes('smug')

    // Active intimidation — Jack threatens and blusters (ADR-146)
    .influence('bullying')
      .mode('active')
      .range('targeted')
      .effect({ mood: 'nervous', disposition: { target: 'player', word: 'fears' } })
      .duration('momentary')
      .witnessed(MSG.JACK_BULLIES)
      .resisted(MSG.JACK_BULLYING_RESISTED)
      .schedule({ when: ['mood is agitated', 'player present'] })
      .done()

    // Jack also tries to influence other NPCs to stay quiet
    .influence('hush-money')
      .mode('active')
      .range('targeted')
      .effect({ propagation: 'mute' })
      .duration('lingering')
      .witnessed(MSG.JACK_OFFERS_HUSH_MONEY)
      .resisted(MSG.JACK_HUSH_RESISTED)
      .schedule({ when: ['target knows property-debt'] })
      .done()

    // Goal — pace between room and bar, make deals (ADR-145)
    .goal('deal-making')
      .activatesWhen('always')
      .priority('medium')
      .mode('sequential')
      .pursues([
        { type: 'moveTo', target: RoomIds.bar, witnessed: MSG.JACK_ENTERS_BAR },
        { type: 'waitFor', conditions: ['2 turns elapsed'] },
        { type: 'moveTo', target: RoomIds.foyer, witnessed: MSG.JACK_LOBBY_DEALS },
        { type: 'moveTo', target: RoomIds.staircase },
      ])
      .done()

    // Propagation — selective, only shares what benefits him (ADR-144)
    .propagation({
      tendency: 'selective',
      audience: 'anyone',
      spreads: ['stephanie-death'],
      pace: 'eager',
      coloring: 'conspiratorial',
    })

    .compile();
}

// ---------------------------------------------------------------------------
// Chelsea Sumner — Cigarette girl, possible daughter
// ADR features: Omission responses, goal pursuit (seek information)
// ---------------------------------------------------------------------------

function createChelsea(world: WorldModel): void {
  const entity = world.createEntity('Chelsea Sumner', EntityType.ACTOR);
  entity.add(new IdentityTrait({
    name: 'Chelsea Sumner',
    description: 'A young woman in her early twenties with auburn hair and anxious green eyes. She carries a tray of cigarettes and matches.',
    aliases: ['chelsea', 'sumner', 'cigarette girl'],
    properName: true,
    article: '',
  }));
  entity.add(new ActorTrait({ isPlayer: false }));
  entity.add(new NpcTrait({ behaviorId: 'alderman.npc.chelsea' }));
  NpcIds.chelsea = entity.id;
  world.moveEntity(entity.id, RoomIds.foyer);

  new ConversationBuilder('chelsea')
    .personality('honest', 'very nervous', 'curious')
    .mood('fearful')
    .threat('wary')
    .cognitiveProfile('stable')

    .likes('catherine')
    .distrusts('john')
    .distrusts('jack')

    .knows('stephanie-death', { confidence: 'certain' })
    .knows('locket-photo', { witnessed: true, confidence: 'certain' })
    .knows('possible-daughter', { witnessed: false, confidence: 'suspects' })
    .believes('catherine-knows-truth', { strength: 'suspects' })

    .topic('stephanie', {
      keywords: ['stephanie', 'bordeau', 'victim', 'murder', 'death'],
      related: ['mother', 'locket'],
    })
    .topic('mother', {
      keywords: ['mother', 'daughter', 'family', 'parent', 'born', 'adopted'],
      related: ['stephanie', 'locket'],
    })
    .topic('locket', {
      keywords: ['locket', 'photograph', 'photo', 'necklace', 'silver'],
      related: ['mother', 'stephanie'],
    })
    .topic('alibi', {
      keywords: ['alibi', 'last night', 'where were you', 'evening', 'rounds'],
    })
    .topic('catherine', {
      keywords: ['catherine', 'shelby', 'hostess'],
      related: ['mother'],
    })

    // Chelsea omits and asks back — she's seeking answers too
    .when('asked about stephanie')
      .if('trusts player')
        .tell(MSG.CHELSEA_STEPHANIE_HESITANT)
        .setsContext('opening-up', { intent: 'eager', strength: 'passive' })
      .otherwise()
        .omit(MSG.CHELSEA_STEPHANIE_OMITS)

    .when('asked about mother')
      .if('trusts player')
        .confess(MSG.CHELSEA_MOTHER_CONFESSION)
        .updatesState({ mood: 'tearful' })
      .otherwise()
        .askBack(MSG.CHELSEA_MOTHER_ASKS)

    .when('asked about locket')
      .if('trusts player')
        .tell(MSG.CHELSEA_LOCKET_SHOWS)
      .otherwise()
        .omit(MSG.CHELSEA_LOCKET_HIDES)

    .when('asked about alibi')
      .tell(MSG.CHELSEA_ALIBI_ROUNDS)

    .when('asked about catherine')
      .tell(MSG.CHELSEA_CATHERINE_KIND)
    .done()

    .on('player is kind')
      .becomes('hopeful')
      .feelsAbout('player', 'trusts')
    .on('player threatens')
      .becomes('terrified')
      .shift('threat', 'critical')

    // Goal — seek information about her mother (ADR-145)
    .goal('seek-truth')
      .activatesWhen('always')
      .priority('high')
      .mode('opportunistic')
      .pursues([
        { type: 'seek', target: 'catherine', witnessed: MSG.CHELSEA_SEEKS_CATHERINE },
        { type: 'say', topic: 'mother', to: 'catherine', witnessed: MSG.CHELSEA_ASKS_CATHERINE },
      ])
      .interruptedBy('threatened')
      .onInterrupt(MSG.CHELSEA_FLEES)
      .resumeOnClear(true)
      .done()

    // Goal — cigarette rounds (low priority, gets interrupted by seek-truth)
    .goal('cigarette-rounds')
      .activatesWhen('always')
      .priority('low')
      .mode('sequential')
      .pursues([
        { type: 'moveTo', target: RoomIds.foyer },
        { type: 'waitFor', conditions: ['2 turns elapsed'] },
        { type: 'moveTo', target: RoomIds.bar, witnessed: MSG.CHELSEA_ROUNDS_BAR },
        { type: 'waitFor', conditions: ['2 turns elapsed'] },
        { type: 'moveTo', target: RoomIds.restaurant },
      ])
      .done()

    // Propagation — selective, fearful coloring (ADR-144)
    .propagation({
      tendency: 'selective',
      audience: 'trusted',
      spreads: ['stephanie-death'],
      pace: 'reluctant',
      coloring: 'fearful',
    })

    // Resistance to Jack's intimidation (ADR-146)
    .resistsInfluence('bullying', { except: ['alone with jack'] })

    .compile();
}
