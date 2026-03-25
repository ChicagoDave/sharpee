/**
 * Family Zoo — Language / Prose
 *
 * All player-facing text, organized by feature. This is where an author
 * spends most of their time — tweaking wording, tone, and personality.
 *
 * Public interface: registerMessages(language)
 * Owner: familyzoo tutorial, v17
 */

import type { LanguageProvider } from '@sharpee/lang-en-us';
import { TimedMessages, AfterHoursMessages } from './events';
import { ScoreMessages } from './scoring';


// ============================================================================
// MESSAGE IDS (for actions defined in this story)
// ============================================================================

export const FeedMessages = {
  NO_FEED: 'zoo.feeding.no_feed',
  NOT_AN_ANIMAL: 'zoo.feeding.not_animal',
  ALREADY_FED: 'zoo.feeding.already_fed',
  FED_GOATS: 'zoo.feeding.fed_goats',
  FED_RABBITS: 'zoo.feeding.fed_rabbits',
  FED_GENERIC: 'zoo.feeding.fed_generic',
} as const;

export const PhotoMessages = {
  NO_CAMERA: 'zoo.photo.no_camera',
  TOOK_PHOTO: 'zoo.photo.took_photo',
} as const;

export const PetMessages = {
  PET_GOATS: 'zoo.petting.goats',
  PET_RABBITS: 'zoo.petting.rabbits',
  PET_PARROT: 'zoo.petting.parrot',
  PET_SNAKE: 'zoo.petting.snake_glass',
  CANT_PET: 'zoo.petting.cant_pet',
} as const;


// ============================================================================
// REGISTER ALL MESSAGES
// ============================================================================

export function registerMessages(language: LanguageProvider): void {

  // --- Feeding ---
  language.addMessage(FeedMessages.NO_FEED, "You don't have any animal feed.");
  language.addMessage(FeedMessages.NOT_AN_ANIMAL, "That's not something you can feed.");
  language.addMessage(FeedMessages.ALREADY_FED, "You've already fed them. They look contentedly full.");
  language.addMessage(FeedMessages.FED_GOATS, 'You scatter some feed on the ground. The pygmy goats rush over, bleating excitedly, and devour the corn and pellets in seconds. The smallest goat looks up at you with big grateful eyes.');
  language.addMessage(FeedMessages.FED_RABBITS, 'You sprinkle some pellets near the rabbits. Biscuit and Marmalade hop over cautiously, then munch away happily.');
  language.addMessage(FeedMessages.FED_GENERIC, 'You offer some feed. The animal eats it gratefully.');

  // --- Photography ---
  language.addMessage(PhotoMessages.NO_CAMERA, "You don't have a camera. There's one in the gift shop.");
  language.addMessage(PhotoMessages.TOOK_PHOTO, 'Click! You snap a photo of {target}. That one\'s going on the fridge.');

  // --- Petting ---
  language.addMessage(PetMessages.PET_GOATS, 'You reach down and pet the nearest goat. It leans into your hand and bleats happily. The others crowd around, demanding equal attention.');
  language.addMessage(PetMessages.PET_RABBITS, 'You gently stroke one of the rabbits. Its fur is incredibly soft. It twitches its nose at you contentedly.');
  language.addMessage(PetMessages.PET_PARROT, 'You reach toward the parrot. CHOMP! It nips your finger with its beak. "NO TOUCHING!" it squawks indignantly.');
  language.addMessage(PetMessages.CANT_PET, "You can't pet that.");

  // --- PA announcements ---
  language.addMessage(TimedMessages.PA_CLOSING_3, '*DING DONG* "Attention visitors! The Willowbrook Family Zoo will be closing in three hours. Please make sure to visit all exhibits before closing time!"');
  language.addMessage(TimedMessages.PA_CLOSING_2, '*DING DONG* "Attention visitors! Two hours until closing. Don\'t forget to stop by the gift shop for souvenirs!"');
  language.addMessage(TimedMessages.PA_CLOSING_1, '*DING DONG* "Attention visitors! One hour until closing. Please begin making your way toward the exit."');
  language.addMessage(TimedMessages.PA_CLOSED, '*DING DONG* "The Willowbrook Family Zoo is now closed. Thank you for visiting! We hope to see you again soon!"');
  language.addMessage(TimedMessages.FEEDING_TIME, '*DING DONG* "It\'s FEEDING TIME at the Petting Zoo! Come watch our pygmy goats and rabbits enjoy their favorite snacks!"');
  language.addMessage(TimedMessages.GOATS_BLEATING, 'The pygmy goats are bleating loudly and headbutting the fence. They seem very hungry!');

  // --- Victory ---
  language.addMessage(ScoreMessages.VICTORY,
    'Congratulations! You\'ve earned your MASTER ZOOKEEPER badge! You\'ve visited every exhibit, befriended the animals, collected souvenirs, and even stayed after hours to hear what the animals really think. The Willowbrook Family Zoo will never forget you!\n\n*** You have won ***');

  // --- After-hours (NEW IN V17) ---
  language.addMessage(AfterHoursMessages.KEEPER_LEAVES,
    'The zookeeper glances at the clock, unclips the walkie-talkie from his belt, and stretches. "Well, that\'s me done for the day. Zoo\'s all yours, I guess!" He gives you a friendly wave and ambles off toward the staff parking lot. A moment later, you hear an engine start and fade into the distance.');

  language.addMessage(AfterHoursMessages.GOATS_CANDID,
    'Now that the keeper is gone, the goats exchange glances. The largest one turns to you and bleats in a very deliberate pattern. You could swear it sounds like: "Finally. Do you have any idea what it\'s like being called \'cute\' six hundred times a day? We are MAJESTIC."');

  language.addMessage(AfterHoursMessages.RABBITS_CANDID,
    'The rabbits stop mid-hop and look at each other. Biscuit twitches her nose disapprovingly. Marmalade thumps his foot twice. You get the distinct impression they\'re critiquing the quality of today\'s pellets. "Barely adequate," the thumping seems to say. "Last Tuesday\'s batch was far superior."');

  language.addMessage(AfterHoursMessages.PARROT_CANDID,
    'The parrot clears its throat — actually clears its throat — and fixes you with a knowing look. "Right then. Now that the performative squawking is over, let me tell you something: that toucan? Complete fraud. Can\'t even crack a nut properly. And don\'t get me started on the gift shop markup."');

  language.addMessage(AfterHoursMessages.SNAKE_CANDID,
    'A soft, sibilant voice drifts from behind the glass of the snake enclosure. "Ssso... you\'re the one who stayed. Good. Do you know what it\'s like in here? They keep the lights on \'dim\' and call it \'nocturnal.\' I haven\'t seen actual moonlight in three years. Three. Years."');
}
