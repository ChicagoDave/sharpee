import { GameEngine } from '@sharpee/engine';
import { WorldModel, Entity } from '@sharpee/world-model';
import { Parser } from '@sharpee/parser-en-us';
import { LanguageProvider } from '@sharpee/lang-en-us';
import { TextService } from '@sharpee/text-services';
import { Story } from '@sharpee/engine';
import { CLIPlatform } from './cli-platform';

export interface CLIPlatformOptions {
  story: Story;
  world: WorldModel;
  player: Entity;
}

export function createCLIPlatform(options: CLIPlatformOptions): GameEngine {
  const parser = new Parser();
  const language = new LanguageProvider();
  const textService = new TextService(language);
  
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