import { database, Change, EventContext } from 'firebase-functions';
import {KillMail} from '../../../models/KillMails';
import { compareAsc } from 'date-fns';

export const onNewKillAdded = async (change: Change<database.DataSnapshot>, context?: EventContext) => {
  if (change.after.numChildren() > 6) {
    const kills: Record<number, KillMail> = change.after.val();
    const old = [];

    const latest = Object.keys(kills).sort((a, b) => {
      const killA = Date.parse(kills[a].killmail_time);
      const killB = Date.parse(kills[b].killmail_time);

      return compareAsc(killA, killB);
    });

    for (const id of latest.slice(0, -6)) {
      old.push(`${id}`);
    }

    console.log(`Removing ${JSON.stringify(old)} from ${context.params.systemId}`);

    Promise.all(old.map(
      id => change.after.child(id).ref.remove()
    ));
  }
};
