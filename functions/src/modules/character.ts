import {database, Event} from 'firebase-functions';
import * as admin from 'firebase-admin';
import {getCharacter, getRoles, getTitles} from '../../../lib/esi';

export default class CharacterHandlers {

    constructor(private firebase: admin.database.Database) { }

    public onNewCharacter = (event: Event<database.DeltaSnapshot>) => {
        return this.populateCharacterInfo(event.params.characterId, event.data.current.child('sso/accessToken').val(), event.data.current.ref);
    };

    public onCharacterLogin = (event: Event<database.DeltaSnapshot>) => {
        return this.populateCharacterInfo(event.params.characterId, event.data.current.child('accessToken').val(), event.data.current.ref.parent);
    }

    private populateCharacterInfo = async (characterId: string, accessToken: string, ref: admin.database.Reference) => {
        let responses = await Promise.all([
            getCharacter(characterId),
            getRoles(characterId, accessToken),
            getTitles(characterId, accessToken)
        ]);

        await ref.update({
            corpId: responses[0].corporation_id,
            allianceId: responses[0].alliance_id || null,
            roles: responses[1] ? responses[1].roles || null : null,
            titles: responses[2].reduce((result, current) => {
                result[current.title_id] = current.name;
                return result;
            }, {})
        });

        ref.child('expired_scopes').remove();
        let accountId: admin.database.DataSnapshot = await ref.child('accountId').once('value');
        return await this.updateFlags(accountId.val());
    }

    private updateFlags = async (accountId: string) => {
        let hasError = false;
        let characters = await this.firebase.ref('characters')
            .orderByChild('accountId').equalTo(accountId).once('value');

        characters.forEach((character: admin.database.DataSnapshot) => {
            let error = !character.hasChild('sso');

            if (error === true) {
                hasError = true;
            }
        });

        if (hasError === false) {
            return this.firebase.ref(`users/${accountId}`).update({
                errors: false
            });
        }

        return;
    }
}
