import { Esi } from 'node-esi-stackdriver';
import { error } from 'firebase-functions/logger';

import { UserAgent, ProjectId } from '../config/constants';
import { onlyUnique } from '../utils';

export const updateSovSystems = async () => {
  const esi = new Esi(UserAgent, { projectId: ProjectId });
  const sov = await esi.getSovMap();

  if ('error' in sov) {
    error(sov);
    throw new Error('Failed to fetch sov map');
  }

  const ids = sov.flatMap(system => {
    const ids = [];

    if (system.alliance_id) {
      ids.push(system.alliance_id);
    }

    if (system.corporation_id) {
      ids.push(system.corporation_id);
    }

    return ids;
  });

  const references = await esi.getNames(ids.filter(onlyUnique));
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
