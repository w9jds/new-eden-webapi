import * as functions from 'firebase-functions';
import {initializeApp} from 'firebase-admin';
import CharacterHandlers from './modules/character';
import LocationHandlers from './modules/locations';

let firebase = initializeApp(functions.config().firebase).database();

let character = new CharacterHandlers(firebase);
let locations = new LocationHandlers(firebase);

export const onAllianceUpdate = locations.onAllianceUpdate;
export const onCorpUpdate = locations.onCorpUpdate;
export const onCharacterCreate = character.onNewCharacter;
