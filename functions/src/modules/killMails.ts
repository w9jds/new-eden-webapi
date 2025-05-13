import { KillMail } from '../../../models/KillMails';
import { Change } from 'firebase-functions';
import { compareAsc } from 'date-fns';
import { DatabaseEvent, DataSnapshot } from 'firebase-functions/database';

export const onNewKillAdded = async (event: DatabaseEvent<Change<DataSnapshot>, { systemId: string; }>) => {
  if (event.data.after.numChildren() > 6) {
    const kills: Record<number, KillMail> = event.data.after.val();
    const old = [];

    const latest = Object.keys(kills).sort((a, b) => {
      const killA = Date.parse(kills[a].killmail_time);
      const killB = Date.parse(kills[b].killmail_time);

      return compareAsc(killA, killB);
    });

    for (const id of latest.slice(0, -6)) {
      old.push(`${id}`);
    }

    Promise.all(old.map(
      id => event.data.after.child(id).ref.remove()
    ));
  }
};
