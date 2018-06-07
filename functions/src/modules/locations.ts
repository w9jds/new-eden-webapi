import {database, Change, EventContext} from 'firebase-functions';
import * as admin from 'firebase-admin';

export default class LocationHandlers {
    constructor(private firebase: admin.database.Database) { }

    public onAffiliationsUpdate = (change: Change<database.DataSnapshot>, context?: EventContext) => {
        return this.firebase.ref(`locations/${change.before.val()}/${context.params.userId}`)
            .transaction(current => null);
    };
}
