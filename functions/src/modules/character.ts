import { Change } from 'firebase-functions';
import { database as db } from 'firebase-admin';
import { createClient } from 'redis';
import { DataSnapshot, DatabaseEvent } from 'firebase-functions/v2/database';

import { UserAgent } from '../config/constants';
import { Character, Esi, Title } from 'node-esi-stackdriver';

export default class CharacterHandlers {
  private redis: ReturnType<typeof createClient>;
  private esi: Esi;

  constructor() {
    this.esi = new Esi(UserAgent, {
      projectId: 'new-eden-storage-a5c23',
    });

    const redis = createClient({
      socket: {
        host: '10.61.16.195',
        port: 6379,
      },
    });

    redis.on('error', err => console.error('ERR:REDIS:', err));
    redis.connect();

    this.redis = redis;
  }

  public onNewCharacter = async (event: DatabaseEvent<DataSnapshot, { characterId: string; }>) => {
    await event.data.child('createdAt').ref.set(Date.now());
    return this.populateCharacterInfo(event.params.characterId, event.data.child('sso/accessToken').val(), event.data.ref);
  };

  public onCharacterLogin = async (event: DatabaseEvent<DataSnapshot, { characterId: string; }>) => {
    return this.populateCharacterInfo(event.params.characterId, event.data.child('accessToken').val(), event.data.ref.parent);
  };

  public onCharacterDeleted = async (event: DatabaseEvent<DataSnapshot, { characterId: string; }>) => {
    this.redis.del(`characters:${event.params.characterId}`);

    return global.firebase.ref(`locations/${event.params.characterId}`).remove();
  };

  public onCharacterUpdate = async (event: DatabaseEvent<Change<DataSnapshot>, { characterId: string; }>) => {
    const character: Character = event.data.after.val();

    if (!character.sso) {
      return this.redis.del(`characters:${event.params.characterId}`);
    }

    const details = {
      name: character.name,
      id: +event.params.characterId,
      accountId: character.accountId,
      allianceId: character.allianceId,
      corpId: character.corpId,
      sso: character.sso,
    };

    return this.redis.set(`characters:${event.params.characterId}`, JSON.stringify(details));
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
