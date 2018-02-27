import {database, Event} from 'firebase-functions';
import * as admin from 'firebase-admin';

export default class LocationHandlers {

    constructor(private firebase: admin.database.Database) { }

    public onAffiliationsUpdate = (event: Event<database.DeltaSnapshot>) => {
        return this.firebase.ref(`locations/${event.data.previous.val()}/${event.params.userId}`)
            .transaction(current => null);
    };

}
