import {database, Event} from 'firebase-functions';
import * as admin from 'firebase-admin';

export default class LocationHandlers {

    constructor(private firebase: admin.database.Database) { }

    public onAllianceUpdate = database.ref('characters/{userId}/allianceId').onUpdate((event: Event<database.DeltaSnapshot>) => {
        this.removeOldLocation(event.data.previous.val(), event.params.userId);
    });

    public onCorpUpdate = database.ref('characters/{userId}/corpId').onUpdate((event: Event<database.DeltaSnapshot>) => {
        this.removeOldLocation(event.data.previous.val(), event.params.userId);
    });

    private removeOldLocation = (previous, userId) => {
        return this.firebase.ref(`locations/${previous}/${userId}`).transaction(current => null);
    }

}
