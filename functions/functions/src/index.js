"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_functions_1 = require("firebase-functions");
const firebase_admin_1 = require("firebase-admin");
const character_1 = require("./modules/character");
const locations_1 = require("./modules/locations");
const storage_1 = require("./modules/storage");
const universe_1 = require("./modules/universe");
let firebase = firebase_admin_1.initializeApp(firebase_functions_1.config().firebase);
let character = new character_1.default(firebase.database());
let locations = new locations_1.default(firebase.database());
let universe = new universe_1.default(firebase.database());
let storage = new storage_1.default(firebase.storage());
exports.onAllianceUpdate = firebase_functions_1.database.ref('characters/{userId}/allianceId')
    .onUpdate(locations.onAffiliationsUpdate);
exports.onCorpUpdate = firebase_functions_1.database.ref('characters/{userId}/corpId')
    .onUpdate(locations.onAffiliationsUpdate);
exports.onCharacterCreate = firebase_functions_1.database.ref('characters/{characterId}')
    .onCreate(character.onNewCharacter);
exports.onCharacterLogin = firebase_functions_1.database.ref('characters/{characterId}/sso')
    .onCreate(character.onCharacterLogin);
//# sourceMappingURL=index.js.map