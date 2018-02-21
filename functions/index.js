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
/******/ 	return __webpack_require__(__webpack_require__.s = 2);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports) {

module.exports = require("firebase-functions");

/***/ }),
/* 1 */
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
exports.getRoute = (origin, destination, flag) => {
    return fetch(`https://esi.tech.ccp.is/latest/route/${origin}/${destination}/?flag=${flag}`, {
        method: 'GET',
        headers
    }).then(exports.verifyResponse);
};
exports.setWaypoint = (character, location, setType) => {
    return fetch(`https://esi.tech.ccp.is/latest/ui/autopilot/waypoint/?add_to_beginning=${setType.isFirst}&clear_other_waypoints=${setType.clear}&destination_id=${location.id}`, {
        method: 'POST',
        headers: Object.assign({ 'Authorization': `Bearer ${character.sso.accessToken}` }, headers)
    });
};


/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(3);
__webpack_require__(4);
module.exports = __webpack_require__(5);


/***/ }),
/* 3 */
/***/ (function(module, exports) {

module.exports = require("babel-polyfill");

/***/ }),
/* 4 */
/***/ (function(module, exports) {

module.exports = require("isomorphic-fetch");

/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const firebase_functions_1 = __webpack_require__(0);
const firebase_admin_1 = __webpack_require__(6);
const character_1 = __webpack_require__(7);
const locations_1 = __webpack_require__(9);
const storage_1 = __webpack_require__(10);
const universe_1 = __webpack_require__(11);
let firebase = firebase_admin_1.initializeApp(firebase_functions_1.config().firebase);
let character = new character_1.default(firebase.database());
let locations = new locations_1.default(firebase.database());
let universe = new universe_1.default(firebase.database());
let storage = new storage_1.default(firebase.storage());
exports.onAllianceUpdate = locations.onAllianceUpdate;
exports.onCorpUpdate = locations.onCorpUpdate;
exports.onCharacterCreate = character.onNewCharacter;
exports.onNewRoute = firebase_functions_1.database.ref('universe/routes/{systemId}/name')
    .onCreate(universe.onNewRoute);


/***/ }),
/* 6 */
/***/ (function(module, exports) {

module.exports = require("firebase-admin");

/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const firebase_functions_1 = __webpack_require__(0);
const esi_1 = __webpack_require__(1);
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
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.UserAgent = 'Account Management - Chingy Chonga/Jeremy Shore - w9jds@live.com';
exports.AccountsOrigin = process.env.ACCOUNTS_ORIGIN;
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
exports.ForumClientId = process.env.FORUM_CLIENT_ID;
exports.ForumSecret = process.env.FORUM_SECRET;
exports.ForumRedirect = process.env.FORUM_REDIRECT_URI;
exports.DiscordClientId = process.env.DISCORD_CLIENT_ID;
exports.DiscordSecret = process.env.DISCORD_SECRET;
exports.DiscordRedirect = process.env.DISCORD_REDIRECT_URI;


/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const firebase_functions_1 = __webpack_require__(0);
class LocationHandlers {
    constructor(firebase) {
        this.firebase = firebase;
        this.onAllianceUpdate = firebase_functions_1.database.ref('characters/{userId}/allianceId').onUpdate((event) => {
            this.removeOldLocation(event.data.previous.val(), event.params.userId);
        });
        this.onCorpUpdate = firebase_functions_1.database.ref('characters/{userId}/corpId').onUpdate((event) => {
            this.removeOldLocation(event.data.previous.val(), event.params.userId);
        });
        this.removeOldLocation = (previous, userId) => {
            return this.firebase.ref(`locations/${previous}/${userId}`).transaction(current => null);
        };
    }
}
exports.default = LocationHandlers;


/***/ }),
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const functions = __webpack_require__(0);
class StorageHandlers {
    constructor(storage) {
        this.storage = storage;
        this.saveLocation = functions.storage.bucket('backgrounds').object().onChange((event) => {
        });
    }
}
exports.default = StorageHandlers;


/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = __webpack_require__(12);
const firebase_functions_1 = __webpack_require__(0);
const esi = __webpack_require__(1);
class UniverseHandler {
    constructor(firebase) {
        this.firebase = firebase;
        this.onSystemStatsUpdate = firebase_functions_1.database.ref('universe/systems/k_space/{systemId}/statistics').onUpdate((event) => {
            let data = event.data.val();
        });
        this.onNewRoute = (event) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            let hubs = {}, destinations = [30000142, 30002510, 30002187, 30002053, 30002659, 30003794];
            let uniqueIds = [];
            let routes = yield Promise.all(destinations.map(hubId => {
                return esi.getRoute(hubId, event.params.systemId, 'shortest');
            }));
            routes.forEach((route, index) => {
                hubs[destinations[index]] = route;
                route.forEach(id => {
                    if (uniqueIds.indexOf(id) < 0) {
                        uniqueIds.push(id);
                    }
                });
            });
            let snapshots = yield Promise.all(uniqueIds.map(systemId => this.firebase.ref(`universe/systems/k_space/${systemId}`).once('value')));
            console.info('received system information');
            let systems = snapshots.reduce((end, system) => {
                end[system.key] = system.val();
                return end;
            }, {});
            Object.keys(hubs).forEach(key => {
                let route = hubs[key].map(id => {
                    return systems[id];
                });
                if (route[route.length - 1].id == event.params.systemId) {
                    route.reverse();
                }
                hubs[key] = {
                    shortest: route
                };
            });
            event.data.ref.parent.set({ hubs: hubs });
            console.info('stored hub routes.');
            return;
        });
    }
}
exports.default = UniverseHandler;


/***/ }),
/* 12 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (immutable) */ __webpack_exports__["__extends"] = __extends;
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "__assign", function() { return __assign; });
/* harmony export (immutable) */ __webpack_exports__["__rest"] = __rest;
/* harmony export (immutable) */ __webpack_exports__["__decorate"] = __decorate;
/* harmony export (immutable) */ __webpack_exports__["__param"] = __param;
/* harmony export (immutable) */ __webpack_exports__["__metadata"] = __metadata;
/* harmony export (immutable) */ __webpack_exports__["__awaiter"] = __awaiter;
/* harmony export (immutable) */ __webpack_exports__["__generator"] = __generator;
/* harmony export (immutable) */ __webpack_exports__["__exportStar"] = __exportStar;
/* harmony export (immutable) */ __webpack_exports__["__values"] = __values;
/* harmony export (immutable) */ __webpack_exports__["__read"] = __read;
/* harmony export (immutable) */ __webpack_exports__["__spread"] = __spread;
/* harmony export (immutable) */ __webpack_exports__["__await"] = __await;
/* harmony export (immutable) */ __webpack_exports__["__asyncGenerator"] = __asyncGenerator;
/* harmony export (immutable) */ __webpack_exports__["__asyncDelegator"] = __asyncDelegator;
/* harmony export (immutable) */ __webpack_exports__["__asyncValues"] = __asyncValues;
/* harmony export (immutable) */ __webpack_exports__["__makeTemplateObject"] = __makeTemplateObject;
/* harmony export (immutable) */ __webpack_exports__["__importStar"] = __importStar;
/* harmony export (immutable) */ __webpack_exports__["__importDefault"] = __importDefault;
/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */
/* global Reflect, Promise */

var extendStatics = Object.setPrototypeOf ||
    ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
    function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };

function __extends(d, b) {
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

var __assign = Object.assign || function __assign(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
    }
    return t;
}

function __rest(s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
}

function __decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}

function __param(paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
}

function __metadata(metadataKey, metadataValue) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
}

function __awaiter(thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

function __generator(thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
}

function __exportStar(m, exports) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}

function __values(o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
}

function __read(o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
}

function __spread() {
    for (var ar = [], i = 0; i < arguments.length; i++)
        ar = ar.concat(__read(arguments[i]));
    return ar;
}

function __await(v) {
    return this instanceof __await ? (this.v = v, this) : new __await(v);
}

function __asyncGenerator(thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
    function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);  }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
}

function __asyncDelegator(o) {
    var i, p;
    return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
    function verb(n, f) { if (o[n]) i[n] = function (v) { return (p = !p) ? { value: __await(o[n](v)), done: n === "return" } : f ? f(v) : v; }; }
}

function __asyncValues(o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator];
    return m ? m.call(o) : typeof __values === "function" ? __values(o) : o[Symbol.iterator]();
}

function __makeTemplateObject(cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};

function __importStar(mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result.default = mod;
    return result;
}

function __importDefault(mod) {
    return (mod && mod.__esModule) ? mod : { default: mod };
}


/***/ })
/******/ ])));