import { database } from 'firebase-admin';
import { EventContext, Change } from 'firebase-functions';
import { UserAgent } from '../config/constants';
import { Esi } from 'node-esi-stackdriver';
import { Map } from '../../../models/Map';

export default class AccessLists {

    private esi: Esi;

    constructor(private firebase: database.Database) {
        this.esi = new Esi(UserAgent,{
            projectId: 'new-eden-storage-a5c23'
        });
    }
    
    public onMapDeleted = async (snapshot: database.DataSnapshot, context?: EventContext) => {
        const map: Map = snapshot.val();

        for (const groupId in map.accessList) {
            return this.firebase.ref(`access_lists/${groupId}/${snapshot.key}`).remove();
        }
    }

    public onMapCreated = async (snapshot: database.DataSnapshot, context?: EventContext) => {
        const map: Map = snapshot.val();

        for (const groupId in map.accessList) {
            return this.firebase.ref(`access_lists/${groupId}/${snapshot.key}`).set({
                read: map.accessList[groupId].read,
                write: map.accessList[groupId].write
            });
        }
    }
    
    public onAccessGroupCreated = async (snapshot: database.DataSnapshot, context?: EventContext) => {
        if (!snapshot.hasChild('name') || !snapshot.hasChild('type')) {
            const references = await this.esi.getNames([context.params.groupId])
            if (references instanceof Array) {
                await snapshot.ref.update({
                    name: references[0].name,
                    type: references[0].category
                });
            }
        }

        return this.firebase.ref(`access_lists/${context.params.groupId}/${context.params.mapId}`).set({
            read: snapshot.child('read').val(),
            write: snapshot.child('write').val()
        });
    }

    public onAccessGroupDeleted = (snapshot: database.DataSnapshot, context?: EventContext) => {
        return this.firebase
            .ref(`access_lists/${context.params.groupId}/${context.params.mapId}`)
            .remove();
    }

    public onAccessGroupUpdated = async (change: Change<database.DataSnapshot>, context?: EventContext) => {
        if (change.before.val() !== change.after.val()) {
            return this.firebase
                .ref(`access_lists/${context.params.groupId}/${context.params.mapId}/write`)
                .set(change.after.val());
        }
    }
}