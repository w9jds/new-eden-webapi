import {database, config} from 'firebase-functions';
import {initializeApp} from 'firebase-admin';
import CharacterHandlers from './modules/character';
import LocationHandlers from './modules/locations';
import StorageHandlers from './modules/storage';
import UniverseHandler from './modules/universe';
import StatisticsHandlers from './modules/statistics';

let firebase = initializeApp();

let character = new CharacterHandlers(firebase.database());
let locations = new LocationHandlers(firebase.database());
let universe = new UniverseHandler(firebase.database());
let statistics = new StatisticsHandlers(firebase.database());

export const onAllianceUpdate = database.ref('characters/{userId}/allianceId')
    .onUpdate(locations.onAffiliationsUpdate);
export const onCorpUpdate = database.ref('characters/{userId}/corpId')
    .onUpdate(locations.onAffiliationsUpdate);
export const onCharacterCreate = database.ref('characters/{characterId}')
    .onCreate(character.onNewCharacter);
export const onCharacterLogin = database.ref('characters/{characterId}/sso')
    .onCreate(character.onCharacterLogin);
export const onStatisticCreate = database.ref('statistics/{eventId}')
    .onCreate(statistics.)
