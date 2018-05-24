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
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
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
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/config/config.ts":
/*!******************************!*\
  !*** ./src/config/config.ts ***!
  \******************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\nObject.defineProperty(exports, \"__esModule\", { value: true });\nexports.UserAgent = 'Cloud Functions - Chingy Chonga/Jeremy Shore - w9jds@live.com';\nexports.DiscordBaseUri = 'https://discordapp.com/api';\n\n\n//# sourceURL=webpack:///./src/config/config.ts?");

/***/ }),

/***/ "./src/index.ts":
/*!**********************!*\
  !*** ./src/index.ts ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\nObject.defineProperty(exports, \"__esModule\", { value: true });\nconst firebase_functions_1 = __webpack_require__(/*! firebase-functions */ \"firebase-functions\");\nconst firebase_admin_1 = __webpack_require__(/*! firebase-admin */ \"firebase-admin\");\nconst character_1 = __webpack_require__(/*! ./modules/character */ \"./src/modules/character.ts\");\nconst locations_1 = __webpack_require__(/*! ./modules/locations */ \"./src/modules/locations.ts\");\nconst statistics_1 = __webpack_require__(/*! ./modules/statistics */ \"./src/modules/statistics.ts\");\nconst discord_1 = __webpack_require__(/*! ./modules/discord */ \"./src/modules/discord.ts\");\nlet firebase = firebase_admin_1.initializeApp();\nlet realtime = firebase.database();\nlet discord = new discord_1.default(realtime, firebase_functions_1.config().aura.token);\nlet character = new character_1.default(realtime);\nlet locations = new locations_1.default(realtime);\nlet statistics = new statistics_1.default(realtime);\nexports.onAllianceUpdate = firebase_functions_1.database.ref('characters/{userId}/allianceId')\n    .onUpdate(locations.onAffiliationsUpdate);\nexports.onCorpUpdate = firebase_functions_1.database.ref('characters/{userId}/corpId')\n    .onUpdate(locations.onAffiliationsUpdate);\nexports.onCharacterCreate = firebase_functions_1.database.ref('characters/{characterId}')\n    .onCreate(character.onNewCharacter);\nexports.onCharacterLogin = firebase_functions_1.database.ref('characters/{characterId}/sso')\n    .onCreate(character.onCharacterLogin);\nexports.onStatisticCreate = firebase_functions_1.database.ref('statistics/{eventId}')\n    .onCreate(statistics.onNewAction);\nexports.onDiscordConnected = firebase_functions_1.database.ref('discord/{userId}')\n    .onCreate(discord.onNewAccount);\nexports.onDiscordCorpUpdate = firebase_functions_1.database.ref('characters/{userId}/corpId')\n    .onUpdate(discord.onCorpUpdate);\nexports.onTitlesUpdate = firebase_functions_1.database.ref('characters/{userId}/titles')\n    .onUpdate(discord.onTitlesUpdate);\nexports.onTitlesCreated = firebase_functions_1.database.ref('characters/{userId}/titles')\n    .onCreate(discord.onTitlesCreate);\nexports.onMainCharacterUpdated = firebase_functions_1.database.ref('users/{userId}/mainId')\n    .onUpdate(discord.onMainCharacterUpdated);\n\n\n//# sourceURL=webpack:///./src/index.ts?");

/***/ }),

/***/ "./src/lib/DiscordApi.ts":
/*!*******************************!*\
  !*** ./src/lib/DiscordApi.ts ***!
  \*******************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\nObject.defineProperty(exports, \"__esModule\", { value: true });\nconst tslib_1 = __webpack_require__(/*! tslib */ \"tslib\");\nconst node_fetch_1 = __webpack_require__(/*! node-fetch */ \"node-fetch\");\nconst config_1 = __webpack_require__(/*! ../config/config */ \"./src/config/config.ts\");\nclass DiscordApi {\n    constructor(token) {\n        this.request = (url, options) => tslib_1.__awaiter(this, void 0, void 0, function* () {\n            let response = yield node_fetch_1.default(url, options);\n            if (response.status >= 200 && response.status < 300) {\n                if (response.status == 204) {\n                    return;\n                }\n                return yield response.json();\n            }\n            console.log(yield response.text());\n            return {\n                error: true,\n                statusCode: response.status,\n                uri: response.url\n            };\n        });\n        this.getGuildRoles = (guildId) => tslib_1.__awaiter(this, void 0, void 0, function* () {\n            return this.request(`${config_1.DiscordBaseUri}/guilds/${guildId}/roles`, {\n                method: 'GET',\n                headers: this.headers\n            });\n        });\n        this.getGuildMembers = (guildId) => tslib_1.__awaiter(this, void 0, void 0, function* () {\n            return this.request(`${config_1.DiscordBaseUri}/guilds/${guildId}/members`, {\n                method: 'GET',\n                headers: this.headers\n            });\n        });\n        this.getGuildMember = (guildId, userId) => tslib_1.__awaiter(this, void 0, void 0, function* () {\n            return this.request(`${config_1.DiscordBaseUri}/guilds/${guildId}/members/${userId}`, {\n                method: 'GET',\n                headers: this.headers\n            });\n        });\n        this.updateGuildMember = (guildId, userId, patch) => tslib_1.__awaiter(this, void 0, void 0, function* () {\n            return this.request(`${config_1.DiscordBaseUri}/guilds/${guildId}/members/${userId}`, {\n                method: 'PATCH',\n                headers: Object.assign({}, this.headers, { 'Content-Type': 'application/json' }),\n                body: JSON.stringify(patch)\n            });\n        });\n        this.getBotGuilds = () => tslib_1.__awaiter(this, void 0, void 0, function* () {\n            return this.request(`${config_1.DiscordBaseUri}/users/@me/guilds`, {\n                method: 'GET',\n                headers: this.headers\n            });\n        });\n        this.addGuildMember = (guildId, userId, user) => tslib_1.__awaiter(this, void 0, void 0, function* () {\n            return this.request(`${config_1.DiscordBaseUri}/guilds/${guildId}/members/${userId}`, {\n                method: 'PUT',\n                headers: Object.assign({}, this.headers, { 'Content-Type': 'application/json' }),\n                body: JSON.stringify(user)\n            });\n        });\n        this.headers = {\n            'Authorization': `Bot ${token}`,\n            'User-Agent': 'Aura Bot Cloud Functions (https://github.com/w9jds, v1) - Chingy Chonga / Jeremy Shore - w9jds@live.com'\n        };\n    }\n}\nexports.default = DiscordApi;\n\n\n//# sourceURL=webpack:///./src/lib/DiscordApi.ts?");

/***/ }),

/***/ "./src/modules/character.ts":
/*!**********************************!*\
  !*** ./src/modules/character.ts ***!
  \**********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\nObject.defineProperty(exports, \"__esModule\", { value: true });\nconst tslib_1 = __webpack_require__(/*! tslib */ \"tslib\");\nconst config_1 = __webpack_require__(/*! ../config/config */ \"./src/config/config.ts\");\nconst node_esi_stackdriver_1 = __webpack_require__(/*! node-esi-stackdriver */ \"node-esi-stackdriver\");\nclass CharacterHandlers {\n    constructor(firebase) {\n        this.firebase = firebase;\n        this.onNewCharacter = (snapshot, context) => {\n            return this.populateCharacterInfo(context.params.characterId, snapshot.child('sso/accessToken').val(), snapshot.ref);\n        };\n        this.onCharacterLogin = (snapshot, context) => {\n            return this.populateCharacterInfo(context.params.characterId, snapshot.child('accessToken').val(), snapshot.ref.parent);\n        };\n        this.populateCharacterInfo = (characterId, accessToken, ref) => tslib_1.__awaiter(this, void 0, void 0, function* () {\n            let responses = yield Promise.all([\n                this.esi.getCharacter(characterId),\n                this.esi.getCharacterRoles(characterId, accessToken),\n                this.esi.getCharacterTitles(parseInt(characterId), accessToken)\n            ]);\n            if ('corporation_id' in responses[0]) {\n                yield ref.update({\n                    corpId: responses[0].corporation_id,\n                    allianceId: responses[0].alliance_id || null\n                });\n            }\n            if ('roles' in responses[1]) {\n                let roles = responses[1];\n                yield ref.update({\n                    roles: roles.roles || null\n                });\n            }\n            if ('titles' in responses[2]) {\n                let titles = responses[2];\n                yield ref.update({\n                    titles: titles.titles.map((title) => title.name) || []\n                });\n            }\n            ref.child('expired_scopes').remove();\n            let accountId = yield ref.child('accountId').once('value');\n            return yield this.updateFlags(accountId.val());\n        });\n        this.updateFlags = (accountId) => tslib_1.__awaiter(this, void 0, void 0, function* () {\n            let hasError = false;\n            let characters = yield this.firebase.ref('characters')\n                .orderByChild('accountId')\n                .equalTo(accountId)\n                .once('value');\n            for (let character of characters) {\n                let error = !character.hasChild('sso');\n                if (error === true) {\n                    hasError = true;\n                }\n            }\n            if (hasError === false) {\n                return this.firebase.ref(`users/${accountId}`).update({\n                    errors: false\n                });\n            }\n            return;\n        });\n        this.esi = new node_esi_stackdriver_1.Esi(config_1.UserAgent, {\n            projectId: 'new-eden-storage-a5c23'\n        });\n    }\n}\nexports.default = CharacterHandlers;\n\n\n//# sourceURL=webpack:///./src/modules/character.ts?");

/***/ }),

/***/ "./src/modules/discord.ts":
/*!********************************!*\
  !*** ./src/modules/discord.ts ***!
  \********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\nObject.defineProperty(exports, \"__esModule\", { value: true });\nconst tslib_1 = __webpack_require__(/*! tslib */ \"tslib\");\nconst node_esi_stackdriver_1 = __webpack_require__(/*! node-esi-stackdriver */ \"node-esi-stackdriver\");\nconst bluebird = __webpack_require__(/*! bluebird */ \"bluebird\");\nconst config_1 = __webpack_require__(/*! ../config/config */ \"./src/config/config.ts\");\nconst DiscordApi_1 = __webpack_require__(/*! ../lib/DiscordApi */ \"./src/lib/DiscordApi.ts\");\nclass DiscordHandlers {\n    constructor(firebase, token) {\n        this.firebase = firebase;\n        this.getFirebaseObject = (reference) => tslib_1.__awaiter(this, void 0, void 0, function* () {\n            let snapshot = yield reference.once('value');\n            if (snapshot.exists()) {\n                return snapshot.val();\n            }\n            return null;\n        });\n        this.getFirebaseObjects = (query) => tslib_1.__awaiter(this, void 0, void 0, function* () {\n            let snapshot = yield query.once('value');\n            if (snapshot.exists()) {\n                let contents = snapshot.val();\n                return Object.keys(contents).map(key => contents[key]);\n            }\n            return [];\n        });\n        this.getAccount = (accountId) => {\n            return this.getFirebaseObject(this.firebase.ref(`users/${accountId}`));\n        };\n        this.getCharacter = (characterId) => {\n            return this.getFirebaseObject(this.firebase.ref(`characters/${characterId}`));\n        };\n        this.getGuild = (corpId) => tslib_1.__awaiter(this, void 0, void 0, function* () {\n            let matches = yield this.getFirebaseObjects(this.firebase.ref(`guilds`).orderByChild('corpId').equalTo(corpId));\n            return matches[0];\n        });\n        this.getGuilds = () => {\n            return this.getFirebaseObjects(this.firebase.ref('guilds'));\n        };\n        this.getDiscordAccount = (accountId) => tslib_1.__awaiter(this, void 0, void 0, function* () {\n            let matches = yield this.getFirebaseObjects(this.firebase.ref('discord').orderByChild('accountId').equalTo(accountId));\n            return matches[0];\n        });\n        this.getRoles = (character, guild, roles) => {\n            let ids = [];\n            let isMember = false;\n            if (character) {\n                isMember = character.corpId == guild.corpId || character.allianceId == guild.allianceId;\n            }\n            if (isMember === false) {\n                for (let role of roles) {\n                    if (role.name == 'Guest') {\n                        ids.push(role.id);\n                    }\n                }\n            }\n            if (isMember) {\n                for (let role of roles) {\n                    if (role.name == 'Member' || character.titles.indexOf(role.name) > -1) {\n                        ids.push(role.id);\n                    }\n                }\n            }\n            return ids;\n        };\n        this.updateRoles = (context) => tslib_1.__awaiter(this, void 0, void 0, function* () {\n            let character = yield this.getCharacter(context.params.userId);\n            let account = yield this.getDiscordAccount(character.accountId);\n            let guilds = yield this.getGuilds();\n            if (account && guilds) {\n                let patches = [];\n                for (let guild of guilds) {\n                    let user = yield this.api.getGuildMember(guild.id, account.id);\n                    if ('joined_at' in user) {\n                        let roles = yield this.api.getGuildRoles(guild.id);\n                        if (roles instanceof Array) {\n                            patches.push(this.api.updateGuildMember(guild.id, account.id, {\n                                roles: yield this.getRoles(character, guild, roles)\n                            }));\n                        }\n                    }\n                }\n                return bluebird.map(patches, item => item, { concurrency: 300 });\n            }\n            return;\n        });\n        this.onNewAccount = (snapshot, context) => tslib_1.__awaiter(this, void 0, void 0, function* () {\n            let discordAccount = snapshot.val();\n            let account = yield this.getAccount(discordAccount.accountId);\n            let character = yield this.getCharacter(account.mainId);\n            let guild = yield this.getGuild(character.corpId);\n            if (account && character && guild) {\n                let user = yield this.api.getGuildMember(guild.id, account.id);\n                if ('error' in user) {\n                    let roles = yield this.api.getGuildRoles(guild.id);\n                    if (roles instanceof Array) {\n                        return this.api.addGuildMember(guild.id, discordAccount.id, {\n                            access_token: discordAccount.accessToken,\n                            nick: character.name,\n                            roles: yield this.getRoles(character, guild, roles)\n                        });\n                    }\n                }\n            }\n            return;\n        });\n        this.onAllianceUpdate = (change, context) => {\n            return this.updateRoles(context);\n        };\n        this.onCorpUpdate = (change, context) => {\n            return this.updateRoles(context);\n        };\n        this.onTitlesUpdate = (change, context) => {\n            return this.updateRoles(context);\n        };\n        this.onTitlesCreate = (snapshot, context) => {\n            return this.updateRoles(context);\n        };\n        this.onMainCharacterUpdated = (change, context) => tslib_1.__awaiter(this, void 0, void 0, function* () {\n            let account = yield this.getDiscordAccount(context.params.userId);\n            let guilds = yield this.getGuilds();\n            if (account && guilds) {\n                let character = yield this.getCharacter(change.after.val());\n                let patches = [];\n                for (let guild of guilds) {\n                    patches.push(this.api.updateGuildMember(guild.id, account.id, {\n                        nick: character.name\n                    }));\n                }\n                return bluebird.map(patches, item => item, { concurrency: 300 });\n            }\n            return;\n        });\n        this.api = new DiscordApi_1.default(token);\n        this.esi = new node_esi_stackdriver_1.Esi(config_1.UserAgent, {\n            projectId: 'new-eden-storage-a5c23'\n        });\n    }\n}\nexports.default = DiscordHandlers;\n\n\n//# sourceURL=webpack:///./src/modules/discord.ts?");

/***/ }),

/***/ "./src/modules/locations.ts":
/*!**********************************!*\
  !*** ./src/modules/locations.ts ***!
  \**********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\nObject.defineProperty(exports, \"__esModule\", { value: true });\nclass LocationHandlers {\n    constructor(firebase) {\n        this.firebase = firebase;\n        this.onAffiliationsUpdate = (change, context) => {\n            return this.firebase.ref(`locations/${change.before.val()}/${context.params.userId}`)\n                .transaction(current => null);\n        };\n    }\n}\nexports.default = LocationHandlers;\n\n\n//# sourceURL=webpack:///./src/modules/locations.ts?");

/***/ }),

/***/ "./src/modules/statistics.ts":
/*!***********************************!*\
  !*** ./src/modules/statistics.ts ***!
  \***********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\nObject.defineProperty(exports, \"__esModule\", { value: true });\nconst node_esi_stackdriver_1 = __webpack_require__(/*! node-esi-stackdriver */ \"node-esi-stackdriver\");\nclass StatisticsHandlers {\n    constructor(firebase) {\n        this.firebase = firebase;\n        this.onNewAction = (snapshot, context) => {\n            const logging = new node_esi_stackdriver_1.Logger('functions', { projectId: 'new-eden-storage-a5c23' });\n            const action = snapshot.val();\n            return logging.log(node_esi_stackdriver_1.Severity.INFO, {}, action).then(() => {\n                return snapshot.ref.remove();\n            });\n        };\n    }\n}\nexports.default = StatisticsHandlers;\n\n\n//# sourceURL=webpack:///./src/modules/statistics.ts?");

/***/ }),

/***/ 0:
/*!****************************!*\
  !*** multi ./src/index.ts ***!
  \****************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

eval("module.exports = __webpack_require__(/*! ./src/index.ts */\"./src/index.ts\");\n\n\n//# sourceURL=webpack:///multi_./src/index.ts?");

/***/ }),

/***/ "bluebird":
/*!***************************!*\
  !*** external "bluebird" ***!
  \***************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("module.exports = require(\"bluebird\");\n\n//# sourceURL=webpack:///external_%22bluebird%22?");

/***/ }),

/***/ "firebase-admin":
/*!*********************************!*\
  !*** external "firebase-admin" ***!
  \*********************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("module.exports = require(\"firebase-admin\");\n\n//# sourceURL=webpack:///external_%22firebase-admin%22?");

/***/ }),

/***/ "firebase-functions":
/*!*************************************!*\
  !*** external "firebase-functions" ***!
  \*************************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("module.exports = require(\"firebase-functions\");\n\n//# sourceURL=webpack:///external_%22firebase-functions%22?");

/***/ }),

/***/ "node-esi-stackdriver":
/*!***************************************!*\
  !*** external "node-esi-stackdriver" ***!
  \***************************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("module.exports = require(\"node-esi-stackdriver\");\n\n//# sourceURL=webpack:///external_%22node-esi-stackdriver%22?");

/***/ }),

/***/ "node-fetch":
/*!*****************************!*\
  !*** external "node-fetch" ***!
  \*****************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("module.exports = require(\"node-fetch\");\n\n//# sourceURL=webpack:///external_%22node-fetch%22?");

/***/ }),

/***/ "tslib":
/*!************************!*\
  !*** external "tslib" ***!
  \************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("module.exports = require(\"tslib\");\n\n//# sourceURL=webpack:///external_%22tslib%22?");

/***/ })

/******/ })));