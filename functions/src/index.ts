import { database, pubsub, config } from 'firebase-functions';
import { initializeApp } from 'firebase-admin';

import { Esi } from 'node-esi-stackdriver';
import { Aura } from '../../models/Discord';

import { UserAgent, ProjectId } from './config/constants';

import AuthHandlers from './modules/auth';
import CharacterHandlers from './modules/character';
import LocationHandlers from './modules/locations';
import DiscordHandlers from './modules/discord';
import AccessLists from './modules/accesslists';
import CloudSql from './modules/cloudSql';

import { updateSystemStatistics } from './modules/statistics';

global.app = initializeApp();
global.firebase = app.database();
global.esi = new Esi(UserAgent, {
  projectId: ProjectId,
});

const auth = new AuthHandlers();
const cloudSql = new CloudSql();
const accessLists = new AccessLists();
const character = new CharacterHandlers();
const locations = new LocationHandlers();
const discord = new DiscordHandlers(config().aura as Aura);

/**
 * Scheduled Jobs
 */
// export const affiliations = pubsub.schedule('*/30 * * * *')
//   .onRun(context => {

//   });

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
  .onWrite(auth.onRolesChanged);

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
 * Discord Bot Updates
 */
export const onDiscordConnected = database.ref('discord/{userId}')
  .onCreate(discord.onNewAccount);

  export const onDiscordCorpUpdate = database.ref('characters/{userId}/corpId')
  .onUpdate(discord.onCorpUpdate);

export const onDiscordTitlesWrite = database.ref('characters/{userId}/titles')
  .onWrite(discord.onTitlesWrite);

export const onDiscordMemberForWrite = database.ref('characters/{userId}/memberFor')
  .onWrite(discord.onMemberForWrite);

export const onMainCharacterUpdated = database.ref('users/{userId}/mainId')
  .onUpdate(discord.onMainCharacterUpdated);

/**
 * Cloud SQL
 */
export const onMapEventCreated = database.ref('maps/{mapId}')
  .onCreate(cloudSql.onMapEvent);

export const onMapEventDeleted = database.ref('maps/{mapId}')
  .onDelete(cloudSql.onMapEvent);

export const onSystemEventCreated = database.ref('maps/{mapId}/systems/{systemId}')
  .onCreate(cloudSql.onSystemEvent)

export const onSystemEventDeleted = database.ref('maps/{mapId}/systems/{systemId}')
  .onDelete(cloudSql.onSystemEvent)