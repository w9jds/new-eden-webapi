import {database, Change, EventContext} from 'firebase-functions';
import {Esi, Character, Reference, ErrorResponse} from 'node-esi-stackdriver';
import fetch, {Response} from 'node-fetch';
import * as admin from 'firebase-admin';
import * as bluebird from 'bluebird';

import {UserAgent} from '../config/config';
import {DiscordAccount, Account} from '../models/User';
import {FirebaseGuild, Guild, GuildRole, GuildMember} from '../models/Discord';
import DiscordApi from '../lib/DiscordApi';

export default class DiscordHandlers {

    private esi: Esi;
    private api: DiscordApi;

    constructor(private firebase: admin.database.Database, token: string) {
        this.api = new DiscordApi(token);
        this.esi = new Esi(UserAgent, {
            projectId: 'new-eden-storage-a5c23'
        });
    }

    private getFirebaseObject = async <T>(reference: admin.database.Reference): Promise<T | null> => {
        let snapshot: admin.database.DataSnapshot = await reference.once('value');

        if (snapshot.exists()) {
            return snapshot.val();
        }

        return null;
    }

    private getFirebaseObjects = async <T>(query:admin.database.Reference | admin.database.Query): Promise<T[] | null> => {
        let snapshot: admin.database.DataSnapshot = await query.once('value');

        if (snapshot.exists()) {
            let contents = snapshot.val();
            return Object.keys(contents).map(key => contents[key]);
        }

        return [];
    }

    private getAccount = (accountId: string | number): Promise<Account> => {
        return this.getFirebaseObject<Account>(this.firebase.ref(`users/${accountId}`));
    }
    
    private getCharacter = (characterId: string | number): Promise<Character> => {
        return this.getFirebaseObject<Character>(this.firebase.ref(`characters/${characterId}`));
    }

    private getGuild = async (corpId: string | number): Promise<FirebaseGuild> => {
        let matches = await this.getFirebaseObjects<FirebaseGuild>(this.firebase.ref(`guilds`).orderByChild('corpId').equalTo(corpId));
        return matches[0];
    }

    private getGuilds = (): Promise<FirebaseGuild[]> => {
        return this.getFirebaseObjects(this.firebase.ref('guilds'));
    }
        
    private getDiscordAccount = async (accountId: string | number): Promise<DiscordAccount> => {
        let matches = await this.getFirebaseObjects<DiscordAccount>(this.firebase.ref('discord').orderByChild('accountId').equalTo(accountId));
        return matches[0];
    }

    private getRoles = (character: Character, guild: FirebaseGuild, roles: GuildRole[]): string[] => {
        let ids: string[] = [];
        let isMember: Boolean = false;

        if (character) {
            isMember = character.corpId == guild.corpId || character.allianceId == guild.allianceId;
        }

        if (isMember === false) {
            for (let role of roles) {
                if (role.name == 'Guest') {
                    ids.push(role.id);
                }
            }
        }
        if (isMember) {
            for (let role of roles) {
                if (role.name == 'Member' || character.titles.indexOf(role.name) > -1) {
                    ids.push(role.id);
                }
            }
        }

        return ids;
    }
    
    private updateRoles = async (context?: EventContext): Promise<any> => {
        let character: Character = await this.getCharacter(context.params.userId);
        let account: DiscordAccount = await this.getDiscordAccount(character.accountId);
        let guilds: FirebaseGuild[] = await this.getGuilds();

        if (account && guilds) {
            let patches = [];
            
            for (let guild of guilds) {
                let user: GuildMember | ErrorResponse = await this.api.getGuildMember(guild.id, account.id);

                if ('joined_at' in user) {
                    let roles: GuildRole[] | ErrorResponse = await this.api.getGuildRoles(guild.id);

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

    public onNewAccount = async (snapshot: database.DataSnapshot, context?: EventContext) => {
        let discordAccount: DiscordAccount = snapshot.val();
        let account: Account = await this.getAccount(discordAccount.accountId);
        let character: Character = await this.getCharacter(account.mainId);
        let guild: FirebaseGuild = await this.getGuild(character.corpId);

        if (account && character && guild) {
            let user: GuildMember | ErrorResponse = await this.api.getGuildMember(guild.id, account.id);

            if ('error' in user) {
                let roles: GuildRole[] | ErrorResponse = await this.api.getGuildRoles(guild.id);

                if (roles instanceof Array) {
                    return this.api.addGuildMember(guild.id, discordAccount.id, {
                        access_token: discordAccount.accessToken,
                        nick: character.name,
                        roles: await this.getRoles(character, guild, roles)
                    });
                }
            }
        }

        return;
    }

    public onAllianceUpdate = (change: Change<database.DataSnapshot>, context?: EventContext) => {
        return this.updateRoles(context);
    }

    public onCorpUpdate = (change: Change<database.DataSnapshot>, context?: EventContext) => {
        return this.updateRoles(context);
    }

    public onTitlesUpdate = (change: Change<database.DataSnapshot>, context?: EventContext) => {
        return this.updateRoles(context);
    }

    public onTitlesCreate = (snapshot: database.DataSnapshot, context?: EventContext) => {
        return this.updateRoles(context);
    }

    public onMainCharacterUpdated = async (change: Change<database.DataSnapshot>, context?: EventContext) => {
        let account: DiscordAccount = await this.getDiscordAccount(context.params.userId);
        let guilds: FirebaseGuild[] = await this.getGuilds();

        if (account && guilds) {
            let character: Character = await this.getCharacter(change.after.val());
            let patches = [];

            for (let guild of guilds) {
                // let user: GuildMember | ErrorResponse = await this.api.getGuildMember(guild.id, account.id);

                // if ('joined_at' in user) {
                    patches.push(this.api.updateGuildMember(guild.id, account.id, {
                        nick: character.name
                    }));
                // }
            }

            return bluebird.map(patches, item => item, { concurrency: 300 });
        }

        return;
    }

}
