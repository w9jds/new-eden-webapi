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

    private populateCharacterInfo = (characterId: string, accessToken: string, ref: admin.database.Reference) => {
        return Promise.all([
            getCharacter(characterId),
            getRoles(characterId, accessToken),
            getTitles(characterId, accessToken)
        ]).then(responses => {
            return ref.update({
                corpId: responses[0].corporation_id,
                allianceId: responses[0].alliance_id || null,
                roles: responses[1] ? responses[1].roles || null : null,
                titles: responses[2].reduce((result, current) => {
                    result[current.title_id] = current.name;
                    return result;
                }, {})
            });
        });
    }

}
