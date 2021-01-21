import { database } from 'firebase-admin';
import { compareAsc } from 'date-fns';
import { KillMail } from '../../../models/KillMails';


export const clearOldKillMails = async () => {
  const oldRefs = [];
  const snapshot = await firebase.ref('kills').once('value');

  snapshot.forEach((system: database.DataSnapshot) => {
    if (system.numChildren() > 6) {
      const kills: Record<number, KillMail> = system.val();

      const latest = Object.keys(kills).sort((a, b) => {
        const killA = Date.parse(kills[a].killmail_time);
        const killB = Date.parse(kills[b].killmail_time);
  
        return compareAsc(killA, killB);
      });
      
      for (const id of latest.slice(0, -6)) {
        oldRefs.push(`kills/${system.key}/${id}`);
      }
    }
  });

  return Promise.all(oldRefs.map(
    ref => firebase.ref(ref).remove()
  ));
}