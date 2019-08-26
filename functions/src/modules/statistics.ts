import { database, EventContext, config } from 'firebase-functions';

import { Action } from '../../../models/Action';
import { Logger, Severity } from 'node-esi-stackdriver';

export default class StatisticsHandlers {

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
        const map = await firebase.ref(`maps/${context.params.mapId}/`).once('value');
        const username = await firebase.ref(`characters/${context.auth.uid}/name`).once('value');
        
        if (!isNaN(Number(snapshot.key))) {
            return this.logFirebaseEvent('system', username.val(), context, {
                system: snapshot.val(),
                map: {
                    id: context.params.mapId,
                    name: map.child('name').val(),
                    owner: map.child('owner').val(),
                    type: map.child('type').val(),
                }
            });
        }
    }

    public onMapEvent = async(snapshot: database.DataSnapshot, context?: EventContext) => {
        const username = await firebase.ref(`characters/${context.auth.uid}/name`).once('value');

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
