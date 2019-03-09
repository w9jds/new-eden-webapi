import { database, EventContext } from 'firebase-functions';
import * as admin from 'firebase-admin';

import { Action } from '../../../models/Action';
import { Logger, Severity } from 'node-esi-stackdriver';

// enum EventTypes {
//     CREATE = 'providers/google.firebase.database/eventTypes/ref.create',
//     DELETE = 'providers/google.firebase.database/eventTypes/ref.delete'
// }

export default class StatisticsHandlers {

    constructor(private firebase: admin.database.Database) { }

    public onNewAction = (snapshot: database.DataSnapshot, context?: EventContext) => {
        const logging = new Logger('functions', { projectId: 'new-eden-storage-a5c23' });
        const action = snapshot.val() as Action;

        return logging.log(Severity.INFO, {}, action).then(() => {
            return snapshot.ref.remove();
        });
    };

    private logFirebaseEvent = async (type: string, username: string, context: EventContext, action) => {
        const logging = new Logger('realtime-database-events', {
            projectId: 'new-eden-storage-a5c23',
        })

        return await logging.log(Severity.INFO, {}, {
            type,
            action: context.eventType,
            user: {
                id: context.auth.uid,
                name: username
            },
            ...action
        });
    }

    public onSystemEvent = async (snapshot: database.DataSnapshot, context?: EventContext) => {
        const map = await this.firebase.ref(`maps/${context.params.mapId}/`).once('value');
        const username = await this.firebase.ref(`characters/${context.auth.uid}/name`).once('value');
        
        return this.logFirebaseEvent('system', username.val(), context, {
            system: snapshot.val(),
            map: {
                id: context.params.mapId,
                name: map.child('name').val(),
                owner: map.child('owner').val(),
                type: map.child('type').val(),
            }
        })
    }

    public onMapEvent = async(snapshot: database.DataSnapshot, context?: EventContext) => {
        const username = await this.firebase.ref(`characters/${context.auth.uid}/name`).once('value');

        return this.logFirebaseEvent('map', username.val(), context, {
            map: {
                id: snapshot.key,
                name: snapshot.child('name').val(),
                owner: snapshot.child('owner').val(),
                type: snapshot.child('type').val()
            }
        });
    }

}
