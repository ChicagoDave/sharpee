import { GameEngine } from '@sharpee/engine';
import { WorldModel, IFEntity } from '@sharpee/world-model';
import { Parser } from '@sharpee/parser-en-us';
import { LanguageProvider } from '@sharpee/lang-en-us';
import { TextService } from '@sharpee/text-services';
import { Story } from '@sharpee/engine';

export interface TestPlatformOptions {
  story?: Story;
  world: WorldModel;
  player: IFEntity;
  parser?: Parser;
  language?: LanguageProvider;
  textService?: TextService;
}

export function createTestEngine(options: TestPlatformOptions): GameEngine {
  const language = options.language || new LanguageProvider();
  const parser = options.parser || new Parser(language);
  const textService = options.textService || new TextService();
  
  if (options.story?.extendParser) {
    options.story.extendParser(parser);
  }
  
  if (options.story?.extendLanguage) {
    options.story.extendLanguage(language);
  }
  
  const engine = new GameEngine({
    world: options.world,
    player: options.player,
    parser,
    language,
    textService
  });
  
  return engine;
}

export class TestPlatform {
  public output: string[] = [];
  public queries: Array<{ prompt: string; response?: string }> = [];
  public events: Array<{ event: string; data: any }> = [];
  
  constructor(private engine: GameEngine) {
    this.initialize();
  }
  
  private initialize(): void {
    (this.engine as any).events.on('output', (data: any) => {
      this.output.push(data.text);
    });
    
    (this.engine as any).events.on('text.output', (data: any) => {
      this.output.push(data.text);
    });
    
    (this.engine as any).events.on('client.query', (data: any) => {
      const query = { prompt: data.prompt };
      this.queries.push(query);
      
      if (data.autoResponse) {
        (this.engine as any).events.emit('client.queryResponse', {
          queryId: data.queryId,
          response: data.autoResponse
        });
      }
    });
    
    (this.engine as any).events.on('platform.quit', () => {
      this.events.push({ event: 'platform.quit', data: {} });
    });
    
    (this.engine as any).events.on('platform.save', (data: any) => {
      this.events.push({ event: 'platform.save', data });
    });
    
    (this.engine as any).events.on('platform.restore', (data: any) => {
      this.events.push({ event: 'platform.restore', data });
    });
    
    (this.engine as any).events.on('platform.restart', () => {
      this.events.push({ event: 'platform.restart', data: {} });
    });
  }
  
  respondToQuery(response: string, queryIndex: number = -1): void {
    const index = queryIndex < 0 ? this.queries.length + queryIndex : queryIndex;
    const query = this.queries[index];
    if (query) {
      query.response = response;
      (this.engine as any).events.emit('client.queryResponse', {
        queryId: `test-query-${index}`,
        response
      });
    }
  }
  
  clear(): void {
    this.output = [];
    this.queries = [];
    this.events = [];
  }
}