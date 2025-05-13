import { Change } from 'firebase-functions/v2';
import { DatabaseEvent, DataSnapshot } from 'firebase-functions/database';

export const onAffiliationsUpdate = (event: DatabaseEvent<Change<DataSnapshot>, { userId: string }>) => {
  return global.firebase.ref(`locations/${event.data.before.val()}/${event.params.userId}`).transaction(() => null);
};
