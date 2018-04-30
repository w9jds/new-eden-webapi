import {database, EventContext} from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as bigquery from '@google-cloud/bigquery';

import {Action} from '../models/Action';
import {Logger, Severity} from 'node-esi-stackdriver';

export default class StatisticsHandlers {
    constructor(private firebase: admin.database.Database) {}

    public onNewAction = (snapshot: database.DataSnapshot, context?: EventContext) => {
        const logging = new Logger('functions', { projectId: 'new-eden-storage-a5c23' });
        const action = snapshot.val() as Action;

        return logging.log(Severity.INFO, {}, action).then(() => {
            return snapshot.ref.remove();
        });
    };
}
