/* eslint-disable @typescript-eslint/no-explicit-any */
import { APIEmbed, WebhookClient } from 'discord.js';
import { DataSnapshot, DatabaseEvent } from 'firebase-functions/v2/database';

import { SystemStatistics } from './universe';
import Metadata, { SolarSystemDetails } from '../data/systems';
import { MapAlert, SolarSystem } from '../../../models/Map';
import { DiscordAccount } from '../../../models/User';
import { getClassName } from '../utils';

// export default class DiscordHandlers {
//   private api: DiscordApi;

//   constructor(aura: Aura) {
//     this.api = new DiscordApi(aura.client_id, aura.client_secret, aura.token);
//   }

//   private getFirebaseObject = async <T>(reference: database.Reference): Promise<T | null> => {
//     const snapshot: database.DataSnapshot = await reference.once('value');
//     return snapshot.exists() ? snapshot.val() : null;
//   };

//   private getFirebaseObjects = async <T>(query: database.Reference | database.Query): Promise<T[] | null> => {
//     const snapshot: database.DataSnapshot = await query.once('value');

//     if (snapshot.exists()) {
//       const contents = snapshot.val();
//       return Object.keys(contents).map(key => contents[key]);
//     }

//     return [];
//   };

//   private getAccount = (accountId: string): Promise<Account> =>
//     this.getFirebaseObject<Account>(global.firebase.ref(`users/${accountId}`));

//   private getCharacter = (characterId: number): Promise<Character> =>
//     this.getFirebaseObject<Character>(global.firebase.ref(`characters/${characterId}`));

//   private getGuild = async (corpId: number): Promise<FirebaseGuild> => {
//     const matches = await this.getFirebaseObjects<FirebaseGuild>(
//       global.firebase.ref('guilds').orderByChild('corpId').equalTo(corpId)
//     );

//     return matches[0];
//   };

//   private getGuilds = (): Promise<FirebaseGuild[]> => this.getFirebaseObjects(global.firebase.ref('guilds'));

//   private getDiscordAccount = async (accountId: string | number): Promise<DiscordAccount> => {
//     const matches = await this.getFirebaseObjects<DiscordAccount>(
//       global.firebase.ref('discord').orderByChild('accountId').equalTo(accountId)
//     );

//     return matches[0];
//   };

//   private getRoles = (character: Character, guild: FirebaseGuild, roles: GuildRole[], user: GuildMember): string[] => {
//     const ids: string[] = [];
//     let isMember = false;

//     if (character) {
//       isMember = character.corpId === guild.corpId || character.allianceId === guild.allianceId;
//     }

//     if (user && user.roles) {
//       const booster = roles.filter(role => role.name === 'Nitro Booster');

//       if (booster.length > 0 && user.roles.indexOf(booster[0].id) > -1) {
//         ids.push(booster[0].id);
//       }
//     }

//     if (isMember === false) {
//       for (const role of roles) {
//         if (role.name === 'Guest') {
//           ids.push(role.id);
//         }
//       }
//     }

//     if (isMember) {
//       const titles = character.titles ? Object.values(character.titles) : [];

//       for (const role of roles) {
//         switch (role.name) {
//           case 'NewBro':
//             if (character.memberFor && character.memberFor <= 90) {
//               ids.push(role.id);
//             }
//             break;
//           case 'Member':
//             ids.push(role.id);
//             break;
//           default:
//             if (character.titles && titles.indexOf(role.name) > -1) {
//               ids.push(role.id);
//             }
//         }
//       }
//     }

//     return ids;
//   };

//   private refreshTokens = async (account: DiscordAccount): Promise<boolean> => {
//     const response = await this.api.refresh(account.refreshToken, account.scope);

//     if ('error' in response) {
//       if (response.statusCode >= 400 && response.statusCode < 500) {
//         await global.firebase.ref(`discord/${account.id}`).remove();
//         return false;
//       }
//     }

//     await global.firebase.ref(`discord/${account.id}`).update(response)
//       .catch(err => {
//         error('Error storing updated credentials', err);
//         return false;
//       });

//     return true;
//   };

//   private updateRolesFromId = async (userId: number): Promise<any> => {
//     const character: Character = await this.getCharacter(userId);

//     if (character) {
//       const profile: Account = await this.getAccount(character.accountId);
//       const account: DiscordAccount = await this.getDiscordAccount(character.accountId);

//       if (profile.mainId === character.id) {
//         return this.updateRoles(character, account);
//       }

//       info(`${character.name} is not the main character for their account.`);
//     }
//   };

//   private updateRoles = async (character: Character, account: DiscordAccount): Promise<any> => {
//     const guilds: FirebaseGuild[] = await this.getGuilds();

//     if (account && guilds) {
//       const patches = [];

//       info(`Updating roles for ${character.name}`);

//       for (const guild of guilds) {
//         const user: GuildMember | ErrorResponse = await this.api.getGuildMember(guild.id, account.id);

//         if ('joined_at' in user) {
//           const roles: GuildRole[] | ErrorResponse = await this.api.getGuildRoles(guild.id);

//           if (roles instanceof Array) {
//             const updatedRoles = await this.getRoles(character, guild, roles, user);

//             if (this.arraysEqual(user.roles, updatedRoles) === false) {
//               patches.push(
//                 this.api.updateGuildMember(guild.id, account.id, {
//                   roles: updatedRoles,
//                 })
//               );

//               info(`Updating ${character.name} to roles of ${updatedRoles.join(', ')}`);
//               return await map(patches, item => item, {concurrency: 300});
//             }
//           }
//         }
//       }
//     }
//   };

//   private arraysEqual = (left: Array<string>, right: Array<string>) => {
//     if (left === right) return true;
//     if (left.length !== right.length) return false;

//     const aSorted = left.sort();
//     const bSorted = right.sort();

//     for (let i = 0; i < aSorted.length; ++i) {
//       if (aSorted[i] !== bSorted[i]) return false;
//     }

//     return true;
//   };

//   private manageAccount = async (discordAccount: DiscordAccount): Promise<any> => {
//     const account: Account = await this.getAccount(discordAccount.accountId);
//     const character: Character = await this.getCharacter(account.mainId);
//     const guild: FirebaseGuild = await this.getGuild(character.corpId);

//     if (account && character && guild) {
//       const user: GuildMember | ErrorResponse = await this.api.getGuildMember(guild.id, discordAccount.id);

//       if ('error' in user) {
//         const roles: GuildRole[] | ErrorResponse = await this.api.getGuildRoles(guild.id);

//         if (roles instanceof Array) {
//           return this.api.addGuildMember(guild.id, discordAccount.id, {
//             access_token: discordAccount.accessToken,
//             nick: character.name,
//             roles: await this.getRoles(character, guild, roles, null),
//           });
//         }

//         warn('Could not get list of roles from specified Guild');
//         return;
//       } else {
//         return Promise.all([
//           this.api.updateGuildMember(guild.id, discordAccount.id, {nick: character.name}),
//           this.updateRoles(character, discordAccount),
//         ]);
//       }
//     }

//     if (!account) {
//       warn('Could not find the associated account!');
//     }

//     if (!character) {
//       warn('Could not find the associated character!');
//     }

//     if (!guild) {
//       warn(`No corp discord guild was found for ${character.name} so he wasn't added to any guilds.`);
//     }
//   };

//   private updateAssociations = async (userId: number): Promise<any> => {
//     const character: Character = await this.getCharacter(userId);

//     if (character) {
//       const profile: Account = await this.getAccount(character.accountId);
//       const account: DiscordAccount = await this.getDiscordAccount(character.accountId);

//       if (account && profile.mainId === character.id) {
//         if (isBefore(new Date(), new Date(account.expiresAt))) {
//           info(`Refreshing token for ${account.username}#${account.discriminator}...`);

//           if (await this.refreshTokens(account) === false) {
//             warn(`Token refresh for ${account.username}#${account.discriminator} failed, and has been removed.`);
//             return;
//           }
//         } else {
//           info('Refresh token still valid, running manageAccount.');
//         }

//         return await this.manageAccount(await this.getDiscordAccount(character.accountId));
//       }

//       info(account ?
//         `${character.name} is not the main of this profile.` :
//         `Couldn't find discord for ${character.name} with ${profile.id}`
//       );
//     }
//   };

//   public onNewAccount = async (snapshot: database.DataSnapshot): Promise<any> =>
//     this.manageAccount(snapshot.val() as DiscordAccount);

//   // Update Discord roles for ALL registered guilds this member belongs to,
//   // and add the user to any guild they may now belong to with the update affiliations
//   public onCorpUpdate = async (_change: Change<database.DataSnapshot>, context?: EventContext): Promise<void> => {
//     info('Searching for new associated servers that are available.');
//     await this.updateAssociations(+context.params.userId);
//     info('Updating roles on all registered Discord servers.');
//     await this.updateRolesFromId(+context.params.userId);
//   };

//   public onTitlesWrite = async (change: Change<database.DataSnapshot>, context?: EventContext) => {
//     await this.updateRolesFromId(+context.params.userId);
//   };

//   public onMemberForWrite = async (change: Change<database.DataSnapshot>, context?: EventContext) => {
//     await this.updateRolesFromId(+context.params.userId);
//   };

//   public onMainCharacterUpdated = async (change: Change<database.DataSnapshot>, context?: EventContext): Promise<any> => {
//     const account: DiscordAccount = await this.getDiscordAccount(context.params.userId);
//     const character: Character = await this.getCharacter(change.after.val());
//     const guilds: FirebaseGuild[] = await this.getGuilds();

//     if (account && character && guilds) {
//       const patches = [];

//       for (const guild of guilds) {
//         patches.push(this.updateRoles(character, account));
//         patches.push(this.api.updateGuildMember(guild.id, account.id, {
//           nick: character.name,
//         }));
//       }

//       return map(patches, item => item, {concurrency: 300});
//     }

//     return;
//   };
// }

export const accountAdded = async (event: DatabaseEvent<DataSnapshot, { memberId: string; }>) => {
  const account: DiscordAccount = event.data.val();

  return;
};

export const affiliationsUpdated = async () => {
  
} 

export const notifySystemAdded = async (event: DatabaseEvent<DataSnapshot, { systemId: string; mapId: string; }>) => {
  if (+event.data.key) {
    const system: SolarSystem = event.data.val();
    const data = Metadata.find(metadata => metadata.solarSystemID == +event.data.key);

    const { name, alerts } = await Promise
      .all([
        global.firebase.ref(`maps/${event.params.mapId}/name`).once('value'),
        global.firebase.ref(`maps/${event.params.mapId}/alerts`).once('value'),
      ])
      .then(([name, alerts]) => ({
        name: name.val() as string,
        alerts: alerts as DataSnapshot,
      }));

    if (alerts.hasChildren) {
      alerts.forEach(child => {
        const alert: MapAlert = child.val();

        if (alert?.watchlist?.systems?.includes(+event.data.key)) {
          pushSystemWebhook(alert.webhook, `Map \`${name}\` has just connected to the \`${system.name}\` System!`, system, data);
        } else if (alert?.watchlist?.constellations?.includes(data.constellationID)) {
          pushSystemWebhook(alert.webhook, `Map \`${name}\` has just connected the \`${data.constellationName}\` Constellation!`, system, data);
        } else if (alert?.watchlist?.regions?.includes(data.regionID)) {
          pushSystemWebhook(alert.webhook, `Map \`${name}\` has just connected to the \`${data.regionName}\` Region!`, system, data);
        }
      });
    }
  }
};

const pushSystemWebhook = async (webhook: string, content: string, system: SolarSystem, data: SolarSystemDetails) => {
  const className = getClassName(data.wormholeClassID);
  const embed: APIEmbed = {
    title: `${className} - ${data.name} ${system?.identifier}`,
    fields: [],
  };

  if (data.wormholeClassID === 7 || data.wormholeClassID === 8 || data.wormholeClassID === 9) {
    const statistics = await global.firebase.ref(`universe/systems/k_space/${data.solarSystemID}/statistics`)
      .orderByChild('processed_at')
      .limitToLast(1)
      .once('value');

    if (statistics.exists() && statistics.hasChildren()) {
      const stats = statistics.val() as Record<string, SystemStatistics>;
      const latest = stats[Object.keys(stats)[0]];

      if (latest) {
        embed.fields = embed.fields.concat([
          { name: 'Stargate Jumps', value: `${latest.jumps}`, inline: true },
          { name: 'NPC Kills', value: `${latest.kills.npcKills}`, inline: true },
          { name: '', value: '', inline: false },
          { name: 'Ships Destroyed', value: `${latest.kills.shipKills}`, inline: true },
          { name: 'Pods Destroyed', value: `${latest.kills.podKills}`, inline: true },
        ]);
      }
    }
  }

  // https://evemaps.dotlan.net/map/The_Forge
  // https://evemaps.dotlan.net/map/The_Forge/Jita
  // https://evemaps.dotlan.net/map/The_Forge/Kimotoro

  const client = new WebhookClient({ url: webhook });
  client.send({
    username: 'GalaxyFinder',
    avatarURL: 'https://content.eveonline.com/www/newssystem/media/65281/1/auralogo.png',
    content,
    embeds: [embed],
  });
};
