(function(e, a) { for(var i in a) e[i] = a[i]; }(this, /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 1);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports) {

module.exports = require("firebase-functions");

/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(2);
__webpack_require__(3);
module.exports = __webpack_require__(4);


/***/ }),
/* 2 */
/***/ (function(module, exports) {

module.exports = require("babel-polyfill");

/***/ }),
/* 3 */
/***/ (function(module, exports) {

module.exports = require("isomorphic-fetch");

/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const functions = __webpack_require__(0);
const firebase_admin_1 = __webpack_require__(5);
const character_1 = __webpack_require__(6);
let firebase = firebase_admin_1.initializeApp(functions.config().firebase).database();
let characterHandlers = new character_1.default(firebase);
exports.onCharacterCreate = characterHandlers.onNewCharacter;


/***/ }),
/* 5 */
/***/ (function(module, exports) {

module.exports = require("firebase-admin");

/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const firebase_functions_1 = __webpack_require__(0);
const esi_1 = __webpack_require__(7);
class CharacterHandlers {
    constructor(firebase) {
        this.firebase = firebase;
        this.onNewCharacter = firebase_functions_1.database.ref('characters/{characterId}').onCreate((event) => {
            return Promise.all([
                esi_1.getCharacter(event.params.characterId),
                esi_1.getRoles(event.params.characterId, event.data.current.child('sso/accessToken').val()),
                esi_1.getTitles(event.params.characterId, event.data.current.child('sso/accessToken').val())
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
}
exports.default = CharacterHandlers;


/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = __webpack_require__(8);
let headers = {
    'Accept': 'application/json',
    'User-Agent': config_1.UserAgent
};
exports.verifyResponse = (response) => {
    if (response.status >= 200 && response.status <= 300) {
        return response.json();
    }
    else if (response.bodyUsed) {
        return response.json().then(error => {
            return {
                error: true,
                body: response.body,
                statusCode: response.status,
                message: error,
                url: response.url
            };
        });
    }
    else {
        return new Promise((resolve) => {
            resolve({
                error: true,
                statusCode: response.status,
                uri: response.url
            });
        });
    }
};
exports.getCharacter = (id) => {
    return fetch(`https://esi.tech.ccp.is/latest/characters/${id}`, {
        method: 'GET',
        headers
    }).then(exports.verifyResponse);
};
exports.getRoles = (id, accessToken) => {
    return fetch(`https://esi.tech.ccp.is/v2/characters/${id}/roles/`, {
        method: 'GET',
        headers: Object.assign({ 'Authorization': `Bearer ${accessToken}` }, headers)
    }).then(exports.verifyResponse);
};
exports.getTitles = (id, accessToken) => {
    return fetch(`https://esi.tech.ccp.is/v1/characters/${id}/titles/`, {
        method: 'GET',
        headers: Object.assign({ 'Authorization': `Bearer ${accessToken}` }, headers)
    }).then(exports.verifyResponse);
};
exports.getCorporation = (id) => {
    return fetch(`https://esi.tech.ccp.is/v4/corporations/${id}/`, {
        method: 'GET',
        headers
    }).then(exports.verifyResponse);
};


/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.UserAgent = 'Account Management - Chingy Chonga/Jeremy Shore - w9jds@live.com';
exports.EveScopes = [
    'esi-ui.write_waypoint.v1',
    'esi-skills.read_skills.v1',
    'esi-characterstats.read.v1',
    'esi-location.read_online.v1',
    'esi-characters.read_titles.v1',
    'esi-location.read_location.v1',
    'esi-location.read_ship_type.v1',
    'esi-characters.read_contacts.v1',
    'esi-wallet.read_character_wallet.v1',
    'esi-industry.read_character_mining.v1',
    'esi-characters.read_corporation_roles.v1',
    'esi-contracts.read_character_contracts.v1',
    'esi-contracts.read_corporation_contracts.v1',
];
exports.DatabaseConfig = {
    apiKey: process.env.DATABASE_API_KEY,
    authDomain: process.env.DATABASE_AUTH_DOMAIN,
    databaseURL: process.env.DATABASE_URL,
    projectId: process.env.PROJECT_ID,
    storageBucket: process.env.DATABASE_STORAGE_BUCKET,
    messagingSenderId: process.env.DATABASE_SENDER_ID
};
exports.RegisterClientId = process.env.REGISTER_CLIENT_ID;
exports.RegisterSecret = process.env.REGISTER_SECRET;
exports.RegisterRedirect = process.env.REGISTER_REDIRECT_URI;
exports.LoginClientId = process.env.LOGIN_CLIENT_ID;
exports.LoginSecret = process.env.LOGIN_SECRET;
exports.LoginRedirect = process.env.LOGIN_REDIRECT_URI;


/***/ })
/******/ ])));