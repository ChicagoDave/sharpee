engine.on('channel:manifest', (cmgt) => renderer.applyCmgt(cmgt));
engine.on('channel:packet',  (packet) => renderer.applyTurnPacket(packet));
