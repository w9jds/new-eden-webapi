import * as functions from 'firebase-functions';
import {initializeApp} from 'firebase-admin';
import CharacterHandlers from './modules/character';

let firebase = initializeApp(functions.config().firebase).database();

let characterHandlers = new CharacterHandlers(firebase);

export const onCharacterCreate = characterHandlers.onNewCharacter;
