import { 
  GameEngine, 
  type Story,
  type WorldModel, 
  type IFEntity,
  EnglishParser,
  EnglishLanguageProvider,
  TextService
} from '@sharpee/sharpee';
import { CLIPlatform } from './cli-platform';

export interface CLIPlatformOptions {
  story: Story;
  world: WorldModel;
  player: IFEntity;
}

export function createCLIPlatform(options: CLIPlatformOptions): GameEngine {
  const language = new EnglishLanguageProvider();
  const parser = new EnglishParser(language);
  const textService = new TextService();
  
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
  
  const platform = new CLIPlatform(engine);
  platform.initialize();
  
  return engine;
}

export { CLIPlatform } from './cli-platform';
export { CLIInput } from './cli-input';
export { CLIOutput } from './cli-output';
export { CLIQuery } from './cli-query';