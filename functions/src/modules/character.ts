import {database, Event} from 'firebase-functions';
import * as admin from 'firebase-admin';
import {getCharacter, getRoles, getTitles} from '../../../lib/esi';

export default class CharacterHandlers {

    constructor(private firebase: admin.database.Database) { }

    public onNewCharacter = database.ref('characters/{characterId}').onCreate((event: Event<database.DeltaSnapshot>) => {
        return Promise.all([
            getCharacter(event.params.characterId),
            getRoles(event.params.characterId, event.data.current.child('sso/accessToken').val()),
            getTitles(event.params.characterId, event.data.current.child('sso/accessToken').val())
        ]).then(responses => {
            return event.data.ref.update({
                corpId: responses[0].corporation_id,
                allianceId: responses[0].alliance_id || null,
                roles: responses[1] ? responses[1].roles || null : null,
                titles: responses[2].reduce((result, current) => {
                    result[current.title_id] = current.name;
                    return result;
                }, {})
            });
        });
    });

}



