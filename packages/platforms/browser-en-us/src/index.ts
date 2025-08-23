import { 
  GameEngine, 
  type Story,
  type WorldModel, 
  type IFEntity,
  EnglishParser,
  EnglishLanguageProvider
} from '@sharpee/sharpee';
import { StandardTextService } from '@sharpee/text-services';
import { BrowserPlatform } from './browser-platform';

export interface BrowserPlatformOptions {
  story: Story;
  world: WorldModel;
  player: IFEntity;
}

export function createBrowserPlatform(options: BrowserPlatformOptions): BrowserPlatform {
  const language = new EnglishLanguageProvider();
  const parser = new EnglishParser(language);
  
  // Use the standard text service (translation layer)
  const textService = new StandardTextService();
  
  // Extend parser and language with story-specific vocabulary
  if (options.story.extendParser) {
    options.story.extendParser(parser);
  }
  
  if (options.story.extendLanguage) {
    options.story.extendLanguage(language);
  }
  
  const engine = new GameEngine({
    world: options.world,
    player: options.player,
    parser,
    language,
    textService
  });
  
  const platform = new BrowserPlatform(engine);
  platform.initialize();
  
  return platform;
}

export { BrowserPlatform } from './browser-platform';
export { BrowserClient } from './browser-client';