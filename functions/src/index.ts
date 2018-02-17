import * as functions from 'firebase-functions';
import {initializeApp} from 'firebase-admin';
import CharacterHandlers from './modules/character';
import LocationHandlers from './modules/locations';
import StorageHandlers from './modules/storage';

let firebase = initializeApp(functions.config().firebase);

let character = new CharacterHandlers(firebase.database());
let locations = new LocationHandlers(firebase.database());
let storage = new StorageHandlers(firebase.storage());

export const onAllianceUpdate = locations.onAllianceUpdate;
export const onCorpUpdate = locations.onCorpUpdate;
export const onCharacterCreate = character.onNewCharacter;
