import { Change } from 'firebase-functions';
import { DatabaseEvent, DataSnapshot } from 'firebase-functions/database';
import { error } from 'firebase-functions/logger';
import { compareAsc } from 'date-fns';
import fetch from 'node-fetch';

import { ScoutSignature } from './../../../models/EveScout';
import { createRedisClient } from './redis';

export type SystemStatistics = {
  processed_at: number;
  kills: {
    podKills: number;
    shipKills: number;
    npcKills: number;
  };
  jumps: number;
}

export const updateSystemStatistics = async () => {
  const redis = createRedisClient();
  const pipeline = redis.multi();

  const updates: Record<string, SystemStatistics> = {};
  const stats = await Promise.all([
    global.esi.getSystemKills(),
    global.esi.getSystemJumps(),
  ]);

  for (const statistic of stats) {
    for (const content of statistic) {
      if (!updates[content.system_id]) {
        updates[content.system_id] = {
          processed_at: new Date().getTime(),
          kills: {
            podKills: 0,
            shipKills: 0,
            npcKills: 0,
          },
          jumps: 0,
        };
      }

      if ('error' in content) {
        error(content);
      }

      if ('npc_kills' in content) {
        updates[content.system_id].kills = {
          podKills: content.pod_kills || 0,
          shipKills: content.ship_kills || 0,
          npcKills: content.npc_kills || 0,
        };
      }

      if ('ship_jumps' in content) {
        updates[content.system_id].jumps = content.ship_jumps || 0;
      }
    }
  }

  const hour = new Date();
  hour.setMinutes(0, 0, 0);

  const operations = Object.keys(updates).map(
    id => {
      pipeline.set(`universe:statistics:${id}:${hour.getTime()}`, JSON.stringify(updates[id]), { EX: 604800 });
      return global.firebase.ref(`universe/systems/k_space/${id}/statistics`).push(updates[id]);
    }
  );

  operations.push(pipeline.exec());
  await Promise.all(operations);
};


export const onNewStatisticAdded = async (event: DatabaseEvent<Change<DataSnapshot>, { systemId: string; }>) => {
  if (event.data.after.hasChild('kills')) {
    event.data.after.child('kills').ref.remove();
  }

  if (event.data.after.hasChild('jumps')) {
    event.data.after.child('jumps').ref.remove();
  }

  if (event.data.after.numChildren() > 24) {
    const statistics: Record<string, SystemStatistics> = event.data.after.val();
    const old = [];

    const latest = Object.keys(statistics).sort((a, b) => {
      const statA = new Date(statistics[a].processed_at);
      const statB = new Date(statistics[b].processed_at);

      return compareAsc(statA, statB);
    });

    for (const id of latest.slice(0, -24)) {
      old.push(`${id}`);
    }

    Promise.all(old.map(
      id => event.data.after.child(id).ref.remove()
    ));
  }
};

export const updateHubConnections = async () => {
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

    Promise.all([
      global.firebase.ref('universe/thera').set(signatures.Thera),
      global.firebase.ref('universe/turnur').set(signatures.Turnur),
    ]);
  }
};
