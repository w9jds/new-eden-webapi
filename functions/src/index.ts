import admin from 'firebase-admin';
import { runWith, database, https } from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onValueCreated } from 'firebase-functions/v2/database';

import { Esi } from 'node-esi-stackdriver';

import { UserAgent, ProjectId } from './config/constants';

import CharacterHandlers from './modules/character';
import LocationHandlers from './modules/locations';
import AccessLists from './modules/accesslists';

import { signatureUpdated, signatureCreated, signatureDeleted } from './modules/analytics';
import { updateSystemStatistics, updateHubConnections, onNewStatisticAdded } from './modules/universe';
import { onRolesChanged, createRefreshTask } from './modules/auth';
import { updateWarfareSystems } from './modules/factionWarfare';
import { onRefreshToken } from './modules/taskHandlers';
import { onNewKillAdded } from './modules/killMails';
import { updateSovSystems } from './modules/sovereignty';
import { notifySystemAdded } from './modules/discord';

global.app = admin.initializeApp();
global.firebase = global.app.database();
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

export const runSystemStats = onSchedule('0 * * * *', updateSystemStatistics);

export const runSovereigntyMap = onSchedule('0 * * * *', updateSovSystems);

export const runFactionWarfareStats = onSchedule('*/30 * * * *', updateWarfareSystems);

export const runEveScoutHubs = onSchedule('*/5 * * * *', updateHubConnections);

/**
 * Database Data Updates
 */
export const onAllianceUpdate = database.ref('characters/{userId}/allianceId')
  .onUpdate(locations.onAffiliationsUpdate);

export const onCorpUpdate = database.ref('characters/{userId}/corpId')
  .onUpdate(locations.onAffiliationsUpdate);

export const onCharacterCreate = database.ref('characters/{characterId}')
  .onCreate(character.onNewCharacter);

export const onCharacterDelete = database.ref('characters/{characterId}')
  .onDelete(character.onCharacterDeleted);

export const onCharacterLogin = database.ref('characters/{characterId}/sso')
  .onCreate(character.onCharacterLogin);

export const onRolesWrite = database.ref('characters/{userId}/roles/roles')
  .onWrite(onRolesChanged);

export const onKillAdded = database.ref('kills/{systemId}')
  .onUpdate(onNewKillAdded);

export const onStatisticAdded = database.ref('universe/systems/k_space/{systemId}/statistics')
  .onUpdate(onNewStatisticAdded);

export const onSystemAdded = onValueCreated('maps/{mapId}/systems/{systemId}', notifySystemAdded);

/**
 * Cloud Task Managers
 */
export const onCharacterTokens = runWith({ timeoutSeconds: 120, memory: '1GB', failurePolicy: true })
  .database.ref('characters/{characterId}/sso')
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

export const onAccessGroupDeleted = database.ref('maps/{mapId}/accesslist/{groupId}')
  .onDelete(accessLists.onAccessGroupDeleted);

export const onAccessGroupUpdated = database.ref('maps/{mapId}/accesslist/{groupId}/write')
  .onUpdate(accessLists.onAccessGroupUpdated);

export const onChangeRequest = database.ref('tasks/{userId}/access_list/{taskId}')
  .onCreate(accessLists.onChangeRequest);

/**
 * Analytics
 */
export const onSignatureCreated = database.ref('signatures/{ownerId}/{systemId}/{sigId}')
  .onCreate(signatureCreated);

export const onSignatureUpdated = database.ref('signatures/{ownerId}/{systemId}/{sigId}')
  .onUpdate(signatureUpdated);

export const onSignatureDeleted = database.ref('signatures/{ownerId}/{systemId}/{sigId}')
  .onDelete(signatureDeleted);

