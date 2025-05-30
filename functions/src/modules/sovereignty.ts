import { error } from 'firebase-functions/logger';
import { ErrorResponse, SovereigntySystem } from 'node-esi-stackdriver';
import { createRedisClient } from './redis';
import { onlyUnique } from '../utils';

export const updateSovSystems = async () => {
  const redis = createRedisClient();
  const sov: SovereigntySystem[] | ErrorResponse = await global.esi.getSovMap();

  if ('error' in sov) {
    error(sov);
    throw new Error('Failed to fetch sov map');
  }

  const pipeline = redis.multi();
  const ids = sov.flatMap(system => {
    const ids = [];

    if (system.alliance_id) {
      ids.push(system.alliance_id);
    }

    if (system.corporation_id) {
      ids.push(system.corporation_id);
    }

    pipeline.set(`universe:sovereignty:${system.system_id}`, JSON.stringify(system), { EX: 4500 });
    return ids;
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

  const updaters = sov.flatMap(system => {
    const owner: Record<string, string|number> = {};
    if (!system.corporation_id && !system.alliance_id) {
      return [];
    }

    if (system.corporation_id) {
      owner.allianceId = system?.alliance_id;
      owner.allianceName = names[system.alliance_id]?.name;
    }

    if (system.alliance_id) {
      owner.corporationId = system?.corporation_id;
      owner.corporationName = names[system.corporation_id]?.name;
    }

    return [
      global.firebase.ref(`universe/systems/k_space/${system.system_id}/sovereignty`).set(owner),
    ];
  });

  Promise.all(updaters);
};
