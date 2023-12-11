import { ScoutSignature } from './../../../models/EveScout';
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
  const response = await fetch('https://api.eve-scout.com/v2/public/signatures');

  if (response.status === 200) {
    const payload: ScoutSignature[] = await response.json();
    const signatures: Record<string, Record<number, object>> = payload
      .reduce((current, connection) => {
        current[connection.out_system_name][connection.in_system_id] = {
          name: connection.in_system_name,
          wormholeName: connection.wh_exits_outward ? 'K162' : connection.wh_type,
          sigId: connection.in_signature,
          estimatedEol: Date.parse(connection.expires_at),
          eol: connection.remaining_hours <= 4,
          shipSize: connection.max_ship_size,
          source: {
            wormholeName: connection.wh_exits_outward ? connection.wh_type : 'K162',
            sigId: connection.out_signature,
          },
          created: {
            id: connection.created_by_id,
            name: connection.created_by_name,
            time: Date.parse(connection.created_at),
          },
        };

        return current;
      }, { Thera: {}, Turnur: {} });

    return Promise.all([
      global.firebase.ref('universe/thera').set(signatures.Thera),
      global.firebase.ref('universe/turnur').set(signatures.Turnur),
    ]);
  }

  return null;
};
