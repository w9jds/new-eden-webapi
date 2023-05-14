import { TheraConnection } from './../../../models/EveScout';
import fetch from 'node-fetch';

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

export const updateTheraConnections = async () => {
  const response = await fetch('http://www.eve-scout.com/api/wormholes');

  if (response.status === 200) {
    const payload: TheraConnection[] = await response.json();
    const updates = payload.reduce((current, connection) => {
      current[connection.destinationSolarSystem.id] = {
        name: connection.destinationSolarSystem.name,
        wormholeName: connection.destinationWormholeType.name,
        sigId: connection.wormholeDestinationSignatureId,
        estimatedEol: Date.parse(connection.wormholeEstimatedEol),
        eol: connection.wormholeEol === 'stable',
        type: connection.wormholeMass,
        source: {
          wormholeName: connection.sourceWormholeType.name,
          sigId: connection.signatureId,
        },
        created: {
          id: connection.createdById,
          name: connection.createdBy,
          time: Date.parse(connection.createdAt),
        },
      };

      return current;
    }, {});

    return global.firebase.ref('universe/thera').update(updates);
  }
};
