import { database, EventContext } from 'firebase-functions';

import { Action } from '../../../models/Action';
import { Logger, Severity } from 'node-esi-stackdriver';

export default class StatisticsHandlers {
    public onNewAction = (snapshot: database.DataSnapshot, context?: EventContext) => {
        const logging = new Logger('functions', { projectId: 'new-eden-storage-a5c23' });
        const action = snapshot.val() as Action;

        console.info(JSON.stringify(action));

        return logging.log(Severity.INFO, {}, action).then(() => {
            return snapshot.ref.remove();
        });
    };
}
