import { Change, EventContext } from 'firebase-functions/v1';
import { error } from 'firebase-functions/logger';

import { Character } from 'node-esi-stackdriver';
import { Signature } from '../../../models/Signature';
import { DataSnapshot } from 'firebase-functions/lib/common/providers/database';
import { getTable } from '../lib/BigQuery';

export const signatureCreated = async (snapshot: DataSnapshot, context: EventContext) => {
  const signature: Signature = snapshot.val();

  if (signature.name && signature.group && signature.group !== 'combat' && signature.group !== 'ore') {
    const table = await getTable('analytics', 'signature_events');

    const authUser = await global.firebase.ref(`characters/${context.auth.uid}`).once('value');
    const character: Character = authUser.val();

    const row = {
      event_id: context.eventId,
      event_type: context.eventType,
      timestamp: context.timestamp,
      key: context.params.sigId,
      signature: {
        classId: signature.classId ? +signature.classId : null,
        group: signature.group,
        id: signature.id,
        name: signature.name,
        wormholeName: signature.wormholeName,
      },
      user: {
        id: +context.auth.uid,
        name: character.name,
        corpId: character.corpId,
        allianceId: character.allianceId,
      },
      parent_id: +context.params.systemId,
      owner_id: +context.params.ownerId,
    };

    await table.insert([row])
      .catch(err => error(err));
  }
};

export const signatureUpdated = async (change: Change<DataSnapshot>, context: EventContext) => {
  const old: Signature = change.before.val();
  const current: Signature = change.after.val();

  if (!old.name && current.name && current.group && current.group !== 'combat' && current.group !== 'ore') {
    const table = await getTable('analytics', 'signature_events');
    const authUser = await global.firebase.ref(`characters/${context.auth.uid}`).once('value');
    const character: Character = authUser.val();

    const row = {
      event_id: context.eventId,
      event_type: context.eventType,
      timestamp: context.timestamp,
      key: context.params.sigId,
      signature: {
        classId: current.classId ? +current.classId : null,
        group: current.group,
        id: current.id,
        name: current.name,
        wormholeName: current.wormholeName,
      },
      user: {
        id: +context.auth.uid,
        name: character.name,
        corpId: character.corpId,
        allianceId: character.allianceId,
      },
      parent_id: +context.params.systemId,
      owner_id: +context.params.ownerId,
    };

    await table.insert([row])
      .catch(err => error(err));
  }
};

export const signatureDeleted = async (snapshot: DataSnapshot, context: EventContext) => {
  const signature: Signature = snapshot.val();

  if (signature.name && signature.group && signature.group === 'wormhole') {
    const table = await getTable('analytics', 'signature_events');

    const authUser = await global.firebase.ref(`characters/${context.auth.uid}`).once('value');
    const character: Character = authUser.val();

    const row = {
      event_id: context.eventId,
      event_type: context.eventType,
      timestamp: context.timestamp,
      key: context.params.sigId,
      signature: {
        classId: signature.classId ? +signature.classId : null,
        group: signature.group,
        id: signature.id,
        name: signature.name,
        wormholeName: signature.wormholeName,
      },
      user: {
        id: +context.auth.uid,
        name: character.name,
        corpId: character.corpId,
        allianceId: character.allianceId,
      },
      parent_id: +context.params.systemId,
      owner_id: +context.params.ownerId,
    };

    await table.insert([row])
      .catch(err => error(err));
  }
};
