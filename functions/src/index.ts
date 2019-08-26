import { database, config, EventContext } from 'firebase-functions';
import { initializeApp } from 'firebase-admin';

import { Aura } from '../../models/Discord';
import AuthHandlers from './modules/auth';
import CharacterHandlers from './modules/character';
import LocationHandlers from './modules/locations';
import StatisticsHandlers from './modules/statistics';
import DiscordHandlers from './modules/discord';
import AccessLists from './modules/accesslists';
import CloudSql from './modules/cloudSql';

global.app = initializeApp();
global.firebase = app.database();

const auth = new AuthHandlers();
const cloudSql = new CloudSql();
const accessLists = new AccessLists();
const character = new CharacterHandlers();
const locations = new LocationHandlers();
const statistics = new StatisticsHandlers();
const discord = new DiscordHandlers(config().aura as Aura);

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
 * Event Managers
 */
const onMapEvent = (snapshot: database.DataSnapshot, context?: EventContext) => {
    return Promise.all([
        cloudSql.onMapEvent(snapshot, context),
        statistics.onMapEvent(snapshot, context)
    ]);
}

const onSystemEvent = (snapshot: database.DataSnapshot, context?: EventContext) => {
    return Promise.all([
        cloudSql.onSystemEvent(snapshot, context),
        statistics.onSystemEvent(snapshot, context)
    ]);
}
    
export const onMapEventCreated = database.ref('maps/{mapId}')
    .onCreate(onMapEvent);
export const onMapEventDeleted = database.ref('maps/{mapId}')
    .onDelete(onMapEvent);
export const onSystemEventCreated = database.ref('maps/{mapId}/systems/{systemId}')
    .onCreate(onSystemEvent)
export const onSystemEventDeleted = database.ref('maps/{mapId}/systems/{systemId}')
    .onDelete(onSystemEvent)
export const onStatisticCreate = database.ref('statistics/{eventId}')
    .onCreate(statistics.onNewAction);