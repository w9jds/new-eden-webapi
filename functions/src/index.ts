import { database, pubsub, config, https } from 'firebase-functions';
import { initializeApp } from 'firebase-admin';

import { Esi } from 'node-esi-stackdriver';

import { UserAgent, ProjectId } from './config/constants';

import CharacterHandlers from './modules/character';
import LocationHandlers from './modules/locations';
import AccessLists from './modules/accesslists';

import { updateSystemStatistics } from './modules/statistics';
import { onRolesChanged, createRefreshTask } from './modules/auth';
import { signatureUpdated, signatureCreated, signatureDeleted } from './modules/analytics';
import { onRefreshToken } from './modules/taskHandlers';

global.app = initializeApp();
global.firebase = app.database();
global.esi = new Esi(UserAgent, {
  projectId: ProjectId,
});

const accessLists = new AccessLists();
const character = new CharacterHandlers();
const locations = new LocationHandlers();

/**
 * Scheduled Jobs
 */
// export const affiliations = pubsub.schedule('*/30 * * * *')
//   .onRun(context => {
// });

export const statistics = pubsub.schedule('0 * * * *')
  .onRun(updateSystemStatistics);

/**
 * Database Data Updates
 */
export const onAllianceUpdate = database.ref('characters/{userId}/allianceId')
  .onUpdate(locations.onAffiliationsUpdate);

export const onCorpUpdate = database.ref('characters/{userId}/corpId')
  .onUpdate(locations.onAffiliationsUpdate);

export const onCharacterCreate = database.ref('characters/{characterId}')
  .onCreate(character.onNewCharacter);

export const onCharacterLogin = database.ref('characters/{characterId}/sso')
  .onCreate(character.onCharacterLogin);

export const onRolesWrite = database.ref('characters/{userId}/roles/roles')
  .onWrite(onRolesChanged);

/**
 * Cloud Task Managers
 */
export const onCharacterTokens = database.ref('characters/{characterId}/sso')
  .onWrite(createRefreshTask);

/**
 * Cloud Task Handlers
 */
export const refreshUserToken = https.onRequest(onRefreshToken);


/**
 * Access Lists
 */
export const onMapDeleted = database.ref('maps/{mapId}')
  .onDelete(accessLists.onMapDeleted);

export const onAccessGroupCreated = database.ref('maps/{mapId}/accesslist/{groupId}')
  .onCreate(accessLists.onAccessGroupCreated);

export const onAccessGroupDeleted = database.ref(`maps/{mapId}/accesslist/{groupId}`)
  .onDelete(accessLists.onAccessGroupDeleted);

export const onAccessGroupUpdated = database.ref(`maps/{mapId}/accesslist/{groupId}/write`)
  .onUpdate(accessLists.onAccessGroupUpdated);

/**
 * Analytics
 */
export const onSignatureCreated = database.ref('signatures/{ownerId}/{systemId}/{sigId}')
  .onCreate(signatureCreated);

export const onSignatureUpdated = database.ref('signatures/{ownerId}/{systemId}/{sigId}')
  .onUpdate(signatureUpdated);

export const onSignatureDeleted = database.ref('signatures/{ownerId}/{systemId}/{sigId}')
  .onDelete(signatureDeleted);

