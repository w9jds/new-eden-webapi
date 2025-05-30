import { ErrorResponse, WarfareSystem } from 'node-esi-stackdriver';
import { error } from 'firebase-functions/logger';
import { onlyUnique } from '../utils';
import { createRedisClient } from './redis';

export const updateWarfareSystems = async () => {
  const redis = createRedisClient();
  const pipeline = redis.multi();

  const fw: WarfareSystem[] | ErrorResponse = await global.esi.getFwSystems();
  if ('error' in fw) {
    error(fw);
    throw new Error('Failed to fetch faction warfare systems');
  }

  const ids = fw.flatMap(warfare => {
    pipeline.set(`universe:faction_warfare:${warfare.solar_system_id}`, JSON.stringify(warfare), { EX: 2700 });
    return [warfare.owner_faction_id, warfare.occupier_faction_id];
  });

  pipeline.exec();
  const references = await global.esi.getNames(ids.filter(onlyUnique));
  if ('error' in references) {
    error(references);
    throw new Error('Failed to resolve id names');
  }

  const names = references.reduce((acc, ref) => {
    acc[ref.id] = ref;
    return acc;
  }, {});

  Promise.all(fw.map(details =>
    global.firebase.ref(`universe/systems/k_space/${details.solar_system_id}/factionWarfare`).set({
      contested: details.contested,
      occupierFactionId: details.occupier_faction_id,
      occupierFaction: names[details.occupier_faction_id]?.name,
      ownerFactionId: details.owner_faction_id,
      ownerFaction: names[details.owner_faction_id]?.name,
      victoryPoints: details.victory_points,
      victoryPointsThreshold: details.victory_points_threshold,
    })
  ));
};
