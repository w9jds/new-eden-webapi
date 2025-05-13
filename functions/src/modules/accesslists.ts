import { Map } from '../../../models/Map';
import { AccessListChange, AccessChangeTypes } from '../../../models/Tasks';

import { Esi } from 'node-esi-stackdriver';
import { Change } from 'firebase-functions';
import { DatabaseEvent, DataSnapshot } from 'firebase-functions/database';
import { UserAgent } from '../config/constants';

export default class AccessLists {
  private esi: Esi;

  constructor() {
    this.esi = new Esi(UserAgent, {
      projectId: 'new-eden-storage-a5c23',
    });
  }

  public onMapDeleted = async (event: DatabaseEvent<DataSnapshot, { mapId: string }>) => {
    const map: Map = event.data.val();

    for (const groupId in map.accessList) {
      return global.firebase.ref(`access_lists/${groupId}/${event.data.key}`).remove();
    }
  };

  public onMapCreated = async (event: DatabaseEvent<DataSnapshot, { mapId: string }>) => {
    const map: Map = event.data.val();

    for (const groupId in map.accessList) {
      return global.firebase.ref(`access_lists/${groupId}/${event.data.key}`).set({
        read: map.accessList[groupId].read,
        write: map.accessList[groupId].write,
      });
    }
  };

  public onAccessGroupCreated = async (event: DatabaseEvent<DataSnapshot, { mapId: string, groupId: string }>) => {
    if (!event.data.hasChild('name') || !event.data.hasChild('type')) {
      const references = await this.esi.getNames([event.params.groupId]);

      if (references instanceof Array) {
        await event.data.ref.update({
          name: references[0].name,
          type: references[0].category,
        });
      }
    }

    return global.firebase.ref(`access_lists/${event.params.groupId}/${event.params.mapId}`).set({
      read: event.data.child('read').val(),
      write: event.data.child('write').val(),
    });
  };

  public onAccessGroupDeleted = (event: DatabaseEvent<DataSnapshot, { mapId: string, groupId: string }>) => {
    return global.firebase
      .ref(`access_lists/${event.params.groupId}/${event.params.mapId}`)
      .remove();
  };

  public onAccessGroupUpdated = async (event: DatabaseEvent<Change<DataSnapshot>, { mapId: string, groupId: string }>) => {
    if (event.data.before.val() !== event.data.after.val()) {
      return global.firebase
        .ref(`access_lists/${event.params.groupId}/${event.params.mapId}/write`)
        .set(event.data.after.val());
    }
  };

  public onChangeRequest = async (event: DatabaseEvent<DataSnapshot, { userId: string, taskId: string }>) => {
    const payload: AccessListChange = event.data.val();

    if (payload.type === AccessChangeTypes.LEAVE) {
      return Promise.all([
        global.firebase
          .ref(`maps/${payload.mapId}/accesslist/${event.params.userId}`)
          .remove(),
        event.data.ref.remove(),
      ]);
    }

    return Promise.resolve();
  };
}
