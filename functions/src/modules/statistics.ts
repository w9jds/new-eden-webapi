

export const updateSystemStatistics = async () => {
  let updates = {};
  let stats = await Promise.all([
    esi.getSystemKills(), 
    esi.getSystemJumps()
  ]);

  for (let statistic of stats) {
    for (let content of statistic) {
      if (!updates[content.system_id]) {
        updates[content.system_id] = {
          statistics: {}
        }
      }

      if ('npc_kills' in content) {
        updates[content.system_id].statistics.kills = {
          podKills: content.pod_kills || 0,
          shipKills: content.ship_kills || 0,
          npcKills: content.npm_kills || 0
        };
      }
      if ('ship_jumps' in content) {
        updates[content.system_id].statistics.jumps = content.ship_jumps || 0;
      }
    }
  }

  return Promise.all(Object.keys(updates).map(
    id => firebase.ref(`universe/systems/k_space/${id}`).update(updates[id])
  ));
}