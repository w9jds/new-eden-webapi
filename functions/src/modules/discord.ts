import { database, Change, EventContext } from 'firebase-functions';
import { Character, ErrorResponse } from 'node-esi-stackdriver';
import * as admin from 'firebase-admin';
import * as bluebird from 'bluebird';

import { DiscordAccount, Account } from '../models/User';
import { FirebaseGuild, GuildRole, GuildMember } from '../models/Discord';
import DiscordApi from '../lib/DiscordApi';

export default class DiscordHandlers {

    private api: DiscordApi;

    constructor(private firebase: admin.database.Database, token: string) {
        this.api = new DiscordApi(token);
    }

    private getFirebaseObject = async <T>(reference: admin.database.Reference): Promise<T | null> => {
        const snapshot: admin.database.DataSnapshot = await reference.once('value');
        return snapshot.exists() ? snapshot.val() : null;
    }

    private getFirebaseObjects = async <T>(query: admin.database.Reference | admin.database.Query): Promise<T[] | null> => {
        const snapshot: admin.database.DataSnapshot = await query.once('value');

        if (snapshot.exists()) {
            const contents = snapshot.val();
            return Object.keys(contents).map(key => contents[key]);
        }

        return [];
    }

    private getAccount = (accountId: string): Promise<Account> =>
        this.getFirebaseObject<Account>(this.firebase.ref(`users/${accountId}`));

    private getCharacter = (characterId: number): Promise<Character> =>
        this.getFirebaseObject<Character>(this.firebase.ref(`characters/${characterId}`));

    private getGuild = async (corpId: number): Promise<FirebaseGuild> => {
        const matches = await this.getFirebaseObjects<FirebaseGuild>(
            this.firebase.ref('guilds').orderByChild('corpId').equalTo(corpId)
        );
        return matches[0];
    }

    private getGuilds = (): Promise<FirebaseGuild[]> => this.getFirebaseObjects(this.firebase.ref('guilds'));

    private getDiscordAccount = async (accountId: string | number): Promise<DiscordAccount> => {
        const matches = await this.getFirebaseObjects<DiscordAccount>(
            this.firebase.ref('discord').orderByChild('accountId').equalTo(accountId)
        );
        return matches[0];
    }

    private getRoles = (character: Character, guild: FirebaseGuild, roles: GuildRole[]): string[] => {
        const ids: string[] = [];
        let isMember: Boolean = false;

        if (character) {
            isMember = character.corpId === guild.corpId || character.allianceId === guild.allianceId;
        }

        if (isMember === false) {
            for (const role of roles) {
                if (role.name === 'Guest') {
                    ids.push(role.id);
                }
            }
        }

        if (isMember) {
            for (const role of roles) {
                if (role.name === 'Member' || (character.titles && character.titles.indexOf(role.name) > -1)) {
                    ids.push(role.id);
                }
            }
        }

        return ids;
    }

    private updateRolesFromId = async (userId: number): Promise<any> => {
        const character: Character = await this.getCharacter(userId);

        if (character) {
            const profile: Account = await this.getAccount(character.accountId);
            const account: DiscordAccount = await this.getDiscordAccount(character.accountId);

            console.debug(`${character.name} is not the main character for their account.`);

            if (profile.mainId === character.id) {
                return this.updateRoles(character, account);
            }
        }
    }

    private updateRoles = async (character: Character, account: DiscordAccount): Promise<any> => {
        const guilds: FirebaseGuild[] = await this.getGuilds();

        if (account && guilds) {
            const patches = [];

            for (const guild of guilds) {
                const user: GuildMember | ErrorResponse = await this.api.getGuildMember(guild.id, account.id);

                if ('joined_at' in user) {
                    const roles: GuildRole[] | ErrorResponse = await this.api.getGuildRoles(guild.id);

                    if (roles instanceof Array) {
                        patches.push(
                            this.api.updateGuildMember(guild.id, account.id, {
                                roles: await this.getRoles(character, guild, roles)
                            })
                        );
                    }
                }
            }

            return bluebird.map(patches, item => item, { concurrency: 300 });
        }

        return;
    }

    public onNewAccount = async (snapshot: database.DataSnapshot, context?: EventContext): Promise<any> => {
        const discordAccount: DiscordAccount = snapshot.val();
        const account: Account = await this.getAccount(discordAccount.accountId);
        const character: Character = await this.getCharacter(account.mainId);
        const guild: FirebaseGuild = await this.getGuild(character.corpId);

        if (account && character && guild) {
            const user: GuildMember | ErrorResponse = await this.api.getGuildMember(guild.id, discordAccount.id);

            if ('error' in user) {
                const roles: GuildRole[] | ErrorResponse = await this.api.getGuildRoles(guild.id);

                if (roles instanceof Array) {
                    return this.api.addGuildMember(guild.id, discordAccount.id, {
                        access_token: discordAccount.accessToken,
                        nick: character.name,
                        roles: await this.getRoles(character, guild, roles)
                    });
                }

                console.info('Could not get list of roles from specified Guild');
            }
            else {
                return Promise.all([
                    this.api.updateGuildMember(guild.id, discordAccount.id, { nick: character.name }),
                    this.updateRoles(character, discordAccount)
                ]);
            }
        }

        if (!account) {
            console.info(`Could not find the associated account!`);
        }

        if (!character)  {
            console.info(`Could not find the associated character!`);
        }

        if (!guild) {
            console.info(`No corp/alliance guild was found for ${character.name} so he wasn't auto added to any guilds`)
        }

        return;
    }

    public onAllianceUpdate = (_change: Change<database.DataSnapshot>, context?: EventContext) =>
        this.updateRolesFromId(context.params.userId);

    public onCorpUpdate = (_change: Change<database.DataSnapshot>, context?: EventContext) =>
        this.updateRolesFromId(context.params.userId);

    public onTitlesUpdate = (_change: Change<database.DataSnapshot>, context?: EventContext) =>
        this.updateRolesFromId(context.params.userId);

    public onTitlesCreate = (_snapshot: database.DataSnapshot, context?: EventContext) =>
        this.updateRolesFromId(context.params.userId);

    public onMainCharacterUpdated = async (change: Change<database.DataSnapshot>, context?: EventContext): Promise<any> => {
        const account: DiscordAccount = await this.getDiscordAccount(context.params.userId);
        const character: Character = await this.getCharacter(change.after.val());
        const guilds: FirebaseGuild[] = await this.getGuilds();

        if (account && character && guilds) {
            const patches = [];

            for (const guild of guilds) {
                patches.push(this.updateRoles(character, account));
                patches.push(this.api.updateGuildMember(guild.id, account.id, {
                    nick: character.name
                }));
            }

            return bluebird.map(patches, item => item, { concurrency: 300 });
        }

        return;
    }

}
