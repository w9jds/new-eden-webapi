import admin from 'firebase-admin';
import { database } from 'firebase-functions/v1';
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onValueCreated, onValueUpdated, onValueDeleted, onValueWritten } from 'firebase-functions/v2/database';

import { Esi } from 'node-esi-stackdriver';

import { UserAgent, ProjectId } from './config/constants';

import CharacterHandlers from './modules/character';
import AccessLists from './modules/accesslists';

import { signatureUpdated, signatureCreated, signatureDeleted } from './modules/analytics';
import { updateSystemStatistics, updateHubConnections, onNewStatisticAdded } from './modules/universe';
import { onRolesChanged, createRefreshTask } from './modules/auth';
import { onAffiliationsUpdate } from './modules/locations';
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

/**
 * Scheduled Jobs
 */

export const runSystemStats = onSchedule('0 * * * *', updateSystemStatistics);

export const runSovereigntyMap = onSchedule('0 * * * *', updateSovSystems);

export const runFactionWarfareStats = onSchedule('*/30 * * * *', updateWarfareSystems);

export const runEveScoutHubs = onSchedule('*/5 * * * *', updateHubConnections);

/**
 * Database Data Updates
 */
export const onAllianceUpdate = onValueUpdated('characters/{userId}/allianceId', onAffiliationsUpdate);

export const onCorpUpdate = onValueUpdated('characters/{userId}/corpId', onAffiliationsUpdate);

export const onCharacterCreate = onValueCreated('characters/{characterId}', character.onNewCharacter);

export const onCharacterUpdate = onValueUpdated('characters/{characterId}', character.onCharacterUpdate);

export const onCharacterDelete = onValueDeleted('characters/{characterId}', character.onCharacterDeleted);

export const onCharacterLogin = onValueCreated('characters/{characterId}/sso', character.onCharacterLogin);

export const onRolesWrite = onValueWritten('characters/{userId}/roles/roles', onRolesChanged);

export const onKillAdded = onValueUpdated('kills/{systemId}', onNewKillAdded);

export const onStatisticAdded = onValueUpdated('universe/systems/k_space/{systemId}/statistics', onNewStatisticAdded);

export const onSystemAdded = onValueCreated('maps/{mapId}/systems/{systemId}', notifySystemAdded);

/**
 * Cloud Task Managers
 */
export const onCharacterTokens = onValueWritten({
  ref: 'characters/{characterId}/sso',
  memory: '1GiB',
  timeoutSeconds: 120,
  retry: true
}, createRefreshTask);

/**
 * Cloud Task Handlers
 */
export const refreshUserToken = onRequest(onRefreshToken);

/**
 * Access Lists
 */
export const onMapDeleted = onValueDeleted('maps/{mapId}', accessLists.onMapDeleted);

export const onAccessGroupCreated = onValueCreated('maps/{mapId}/accesslist/{groupId}', accessLists.onAccessGroupCreated);

export const onAccessGroupDeleted = onValueDeleted('maps/{mapId}/accesslist/{groupId}', accessLists.onAccessGroupDeleted);

export const onAccessGroupUpdated = onValueUpdated('maps/{mapId}/accesslist/{groupId}/write', accessLists.onAccessGroupUpdated);

export const onChangeRequest = onValueCreated('tasks/{userId}/access_list/{taskId}', accessLists.onChangeRequest);

/**
 * Analytics
 */
export const onSignatureCreated = database.ref('signatures/{ownerId}/{systemId}/{sigId}').onCreate(signatureCreated);

export const onSignatureUpdated = database.ref('signatures/{ownerId}/{systemId}/{sigId}').onUpdate(signatureUpdated);

export const onSignatureDeleted = database.ref('signatures/{ownerId}/{systemId}/{sigId}').onDelete(signatureDeleted);

