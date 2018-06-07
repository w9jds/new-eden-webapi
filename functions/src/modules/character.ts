import {database, EventContext} from 'firebase-functions';
import * as admin from 'firebase-admin';

import {UserAgent} from '../config/config';
import {Esi, Title, Roles, Titles} from 'node-esi-stackdriver';

export default class CharacterHandlers {

    private esi: Esi;

    constructor(private firebase: admin.database.Database) {
        this.esi = new Esi(UserAgent,{
            projectId: 'new-eden-storage-a5c23'
        });
    }

    public onNewCharacter = (snapshot: database.DataSnapshot, context?: EventContext) => {
        return this.populateCharacterInfo(context.params.characterId, snapshot.child('sso/accessToken').val(), snapshot.ref);
    }

    public onCharacterLogin = (snapshot: database.DataSnapshot, context?: EventContext) => {
        return this.populateCharacterInfo(context.params.characterId, snapshot.child('accessToken').val(), snapshot.ref.parent);
    }

    private populateCharacterInfo = async (characterId: string, accessToken: string, ref: admin.database.Reference) => {
        let responses = await Promise.all([
            this.esi.getCharacter(characterId),
            this.esi.getCharacterRoles(characterId, accessToken),
            this.esi.getCharacterTitles(parseInt(characterId), accessToken)
        ]);

        if ('corporation_id' in responses[0]) {
            await ref.update({
                corpId: responses[0].corporation_id,
                allianceId: responses[0].alliance_id || null
            });
        }

        if ('roles' in responses[1]) {
            let roles = responses[1] as Roles;

            await ref.update({
                roles: roles.roles || null
            });
        }

        if ('titles' in responses[2]) {
            let titles = responses[2] as Titles;

            await ref.update({
                titles: titles.titles.map((title: Title) => title.name) || []
            });
        }

        await ref.child('expired_scopes').remove();
        let accountId: admin.database.DataSnapshot = await ref.child('accountId').once('value');
        return await this.updateFlags(accountId.val());
    }

    private updateFlags = async (accountId: string) => {
        let hasError = false;
        let characters = await this.firebase.ref('characters')
            .orderByChild('accountId')
            .equalTo(accountId)
            .once('value');

        for (let character of characters) {
            let error = !character.hasChild('sso');

            if (error === true) {
                hasError = true;
            }
        }

        if (hasError === false) {
            return this.firebase.ref(`users/${accountId}`).update({
                errors: false
            });
        }

        return;
    }
}
