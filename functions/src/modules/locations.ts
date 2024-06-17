import { database, Change, EventContext } from 'firebase-functions';

export default class LocationHandlers {
  public onAffiliationsUpdate = (change: Change<database.DataSnapshot>, context?: EventContext) => {
    return global.firebase.ref(`locations/${change.before.val()}/${context.params.userId}`)
      .transaction(() => null);
  };
}
