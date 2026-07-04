// Engine side, in Story.registerChannels:
import { createAmbientChannel } from '@sharpee/stdlib';

registry.add(createAmbientChannel('environment'));

// Browser side, in the browser entry:
import {
  createAmbientChannelRenderer,
} from '@sharpee/platform-browser';

client.getChannelRenderer().registerRenderer(
  'ambient:environment',
  createAmbientChannelRenderer(
    client.getAudioManager(),
    'environment',
  ),
);
