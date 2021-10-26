

export const updateSystemStatistics = async () => {
  const updates = {};
  const stats = await Promise.all([
    global.esi.getSystemKills(),
    global.esi.getSystemJumps(),
  ]);

  for (const statistic of stats) {
    for (const content of statistic) {
      if (!updates[content.system_id]) {
        updates[content.system_id] = {
          statistics: {},
        };
      }

      if ('npc_kills' in content) {
        updates[content.system_id].statistics.kills = {
          podKills: content.pod_kills || 0,
          shipKills: content.ship_kills || 0,
          npcKills: content.npm_kills || 0,
        };
      }
      if ('ship_jumps' in content) {
        updates[content.system_id].statistics.jumps = content.ship_jumps || 0;
      }
    }
  }

  return Promise.all(Object.keys(updates).map(
    id => global.firebase.ref(`universe/systems/k_space/${id}`).update(updates[id])
  ));
};
