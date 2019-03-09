import { database, config } from 'firebase-functions';
import { initializeApp } from 'firebase-admin';

import AuthHandlers from './modules/auth';
import CharacterHandlers from './modules/character';
import LocationHandlers from './modules/locations';
import StatisticsHandlers from './modules/statistics';
import DiscordHandlers from './modules/discord';
import AccessLists from './modules/accesslists';
import { Aura } from '../../models/Discord';

const firebase = initializeApp();
const realTime = firebase.database();

const auth = new AuthHandlers(realTime);
const accessLists = new AccessLists(realTime);
const character = new CharacterHandlers(realTime);
const locations = new LocationHandlers(realTime);
const statistics = new StatisticsHandlers(realTime);
const discord = new DiscordHandlers(realTime, config().aura as Aura)

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
export const onRolesChanged = database.ref('characters/{userId}/roles/roles')
    .onWrite(auth.onRolesChanged);

/**
 * Access Lists
 */
export const onMapDeleted = database.ref('maps/{mapId}')
    .onDelete(accessLists.onMapDeleted);
// export const onMapCreated = database.ref('maps/{mapId}')
//     .onCreate(accessLists.onMapCreated);
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
export const onTitlesUpdate = database.ref('characters/{userId}/titles')
    .onUpdate(discord.onTitlesUpdate);
export const onTitlesCreated = database.ref('characters/{userId}/titles')
    .onCreate(discord.onTitlesCreate);
export const onMainCharacterUpdated = database.ref('users/{userId}/mainId')
    .onUpdate(discord.onMainCharacterUpdated);

/**
 * Statistics
 */
export const onMapEventCreated = database.ref('maps/{mapId}')
    .onCreate(statistics.onMapEvent)
export const onMapEventDeleted = database.ref('maps/{mapId}')
    .onDelete(statistics.onMapEvent)
export const onSystemEventCreated = database.ref('maps/{mapId}/systems/{systemId}')
    .onCreate(statistics.onSystemEvent)
export const onSystemEventDeleted = database.ref('maps/{mapId}/systems/{systemId}')
    .onDelete(statistics.onSystemEvent)
export const onStatisticCreate = database.ref('statistics/{eventId}')
    .onCreate(statistics.onNewAction);
