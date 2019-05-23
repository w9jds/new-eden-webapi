import { Request, ResponseToolkit, ResponseObject } from 'hapi';
import { database } from 'firebase-admin';
import { Character } from 'node-esi-stackdriver';
import { Account, CharacterRoles, DiscordAccount } from '../../models/User';

type MemberAccount = {
    id: string;
    mainId: number;
    discord?: {
        username: string;
        discriminator?: string;
    };
    characters: Record<number, {
        id: number;
        name: string;
        corpId: number;
        allianceId?: number;
        roles?: CharacterRoles;
        titles?: string[];
    }>;
}

export default class Corporation {

    constructor(private firebase: database.Database) { }

    private getAccountsForCorp = async (corpId: number): Promise<Record<string, MemberAccount>> => {
        const characters = await this.firebase.ref('characters').orderByChild('corpId').equalTo(corpId).once('value');
        let accounts: Record<string, MemberAccount> = {};

        const matches: Record<number, Character> = characters.val();
        for (let id in matches) {
            const character = matches[id];

            if (!accounts[character.accountId]) {
                accounts[character.accountId] = await this.getAccountDetails(character);
            }
        }
        
        return accounts;
    }
    
    private getAccountDetails = async (character: Character): Promise<MemberAccount> => {
        const user = await this.firebase.ref(`users/${character.accountId}`).once('value');
        const account = user.val() as Account;
        const details = await Promise.all([
            this.firebase.ref(`characters`).orderByChild('accountId')
                .equalTo(character.accountId).once('value'),
            this.firebase.ref('discord').orderByChild('accountId')
                .equalTo(character.accountId).once('value')
        ]);

        const memberAccount: MemberAccount = {
            id: character.accountId,
            mainId: account.mainId,
            characters: {}
        };

        const characters: Record<number, Character> = details[0].val();
        for (let id in characters) {
            const character = characters[id];

            memberAccount.characters[id] = {
                id: +id,
                name: character.name,
                corpId: character.corpId,
                allianceId: character.allianceId,
                roles: character.roles,
                titles: character.titles
            }
        }

        if (details[1].exists()) {
            let discordAccounts: Record<number, DiscordAccount> = details[1].val();
           
            for (let id in discordAccounts) {
                let discordAccount = discordAccounts[id];

                memberAccount.discord = {
                    username: discordAccount.username,
                    discriminator: discordAccount.discriminator
                };
            }
        }
        
        return memberAccount;
    }

    public membersHandler = async (request: Request, h: ResponseToolkit): Promise<ResponseObject> => {
        const credentials = request.auth.credentials.user as Character;
        const accounts = await this.getAccountsForCorp(credentials.corpId);
        
        return h.response(accounts);
    }
}
