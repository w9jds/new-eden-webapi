import { database as db } from 'firebase-admin';
import { database, EventContext } from 'firebase-functions';

import { UserAgent } from '../config/constants';
import { Esi, Title } from 'node-esi-stackdriver';

export default class CharacterHandlers {
  private esi: Esi;

  constructor() {
    this.esi = new Esi(UserAgent, {
      projectId: 'new-eden-storage-a5c23',
    });
  }

  public onNewCharacter = async (snapshot: database.DataSnapshot, context?: EventContext) => {
    await snapshot.child('createdAt').ref.set(Date.now());
    return this.populateCharacterInfo(context.params.characterId, snapshot.child('sso/accessToken').val(), snapshot.ref);
  };

  public onCharacterLogin = (snapshot: database.DataSnapshot, context?: EventContext) => {
    return this.populateCharacterInfo(context.params.characterId, snapshot.child('accessToken').val(), snapshot.ref.parent);
  };

  public onCharacterDeleted = (snapshot: database.DataSnapshot, context?: EventContext) => {
    return global.firebase.ref(`locations/${context.params.characterId}`).remove();
  };

  private populateCharacterInfo = async (characterId: string, accessToken: string, ref: db.Reference) => {
    const responses = await Promise.all([
      this.esi.getCharacter(characterId),
      this.esi.getCharacterRoles(characterId, accessToken),
      this.esi.getCharacterTitles(parseInt(characterId), accessToken),
    ]);

    for (const response of responses) {
      if ('corporation_id' in response) {
        await ref.update({
          corpId: response.corporation_id,
          allianceId: response.alliance_id || null,
        });
      }

      if ('roles' in response) {
        const roles = response;

        await ref.update({
          roles: roles.roles || null,
        });
      }

      if ('titles' in response) {
        const titles = response as Title[];

        await ref.update({
          titles: titles.reduce((current, title) => {
            current[title.title_id] = title.name;
            return current;
          }, {}),
        });
      }
    }

    await ref.child('expired_scopes').remove();
    const accountId: db.DataSnapshot = await ref.child('accountId').once('value');
    await this.updateFlags(accountId.val());
  };

  private updateFlags = async (accountId: string) => {
    let hasError = false;
    const characters = await global.firebase.ref('characters')
      .orderByChild('accountId')
      .equalTo(accountId)
      .once('value');

    characters.forEach(character => {
      const error = !character.hasChild('sso');

      if (error === true) {
        hasError = true;
      }

      return false;
    });

    if (hasError === false) {
      return global.firebase.ref(`users/${accountId}`).update({
        errors: false,
      });
    }
  };
}
