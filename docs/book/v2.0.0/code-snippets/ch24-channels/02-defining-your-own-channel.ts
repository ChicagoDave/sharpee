// A mood line per room; rooms not listed clear the line.
const AMBIENCE_BY_ROOM: Record<string, string> = {
  'Aviary':
    'The air is alive with birdsong and the rustle of ' +
    'wings.',
  'Nocturnal Animals Exhibit':
    'Your eyes strain against the warm red dark.',
};

registerChannels(registry: IChannelRegistry): void {
  registry.add({
    id: 'zoo.ambience',
    contentType: 'text',
    mode: 'replace',
    // only re-emit when the value changes
    emit: 'sparse',
    produce: (ctx: ChannelProduceContext) => {
      const world = ctx.world as WorldModel;
      const room = world.getEntity(
        world.getLocation(world.getPlayer()!.id)!);
      // a mood line for the current room, or '' to clear the line
      return room ? AMBIENCE_BY_ROOM[room.name] ?? '' : '';
    },
  });
}
