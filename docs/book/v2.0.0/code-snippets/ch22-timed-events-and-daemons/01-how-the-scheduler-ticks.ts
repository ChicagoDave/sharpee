import { SchedulerPlugin } from '@sharpee/plugin-scheduler';
import type {
  Daemon, Fuse, SchedulerContext,
} from '@sharpee/plugin-scheduler';
import { ISemanticEvent } from '@sharpee/core';
import { IdentityTrait } from '@sharpee/world-model';

onEngineReady(engine: GameEngine): void {
  // … the NPC plugin registration from Chapter 20 stays here …

  const schedulerPlugin = new SchedulerPlugin();
  engine.getPluginRegistry().register(schedulerPlugin);
  const scheduler = schedulerPlugin.getScheduler();

  scheduler.registerDaemon(createPAAnnouncementDaemon());
  scheduler.setFuse(createFeedingTimeFuse());
  scheduler.registerDaemon(createGoatBleatingDaemon());
}
