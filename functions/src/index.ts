import {database, config} from 'firebase-functions';
import {initializeApp} from 'firebase-admin';
import CharacterHandlers from './modules/character';
import LocationHandlers from './modules/locations';
import StorageHandlers from './modules/storage';
import UniverseHandler from './modules/universe';

let firebase = initializeApp(config().firebase);

let character = new CharacterHandlers(firebase.database());
let locations = new LocationHandlers(firebase.database());
let universe = new UniverseHandler(firebase.database());
let storage = new StorageHandlers(firebase.storage());

export const onAllianceUpdate = database.ref('characters/{userId}/allianceId')
    .onUpdate(locations.onAffiliationsUpdate);
export const onCorpUpdate = database.ref('characters/{userId}/corpId')
    .onUpdate(locations.onAffiliationsUpdate);
export const onCharacterCreate = database.ref('characters/{characterId}')
    .onCreate(character.onNewCharacter);
export const onCharacterLogin = database.ref('characters/{characterId}/sso')
    .onCreate(character.onCharacterLogin);
