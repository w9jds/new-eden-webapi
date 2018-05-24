import fetch, { Response, Headers } from 'node-fetch';

import { ErrorResponse } from 'node-esi-stackdriver';
import { GuildMember, PatchGuildMember, GuildRole, Guild, AddGuildMember } from '../models/Discord';
import { UserAgent, DiscordBaseUri } from '../config/config';

export default class DiscordApi {

    private headers;

    constructor(token: string) {
        this.headers = {
            'Authorization': `Bot ${token}`,
            'User-Agent': 'Aura Bot Cloud Functions (https://github.com/w9jds, v1) - Chingy Chonga / Jeremy Shore - w9jds@live.com'
        }
    }

    private request = async <T>(url: string, options): Promise<T | ErrorResponse> => {
        let response: Response = await fetch(url, options);

        if (response.status >= 200 && response.status < 300) {
            if (response.status == 204) {
                
                return;
            }

            return await response.json() as T;
        }

        
        console.log(await response.text());

        return {
            error: true,
            statusCode: response.status,
            uri: response.url
        }
    }

    public getGuildRoles = async (guildId: number | string): Promise<GuildRole[]|ErrorResponse> =>
        this.request<GuildRole[]>(`${DiscordBaseUri}/guilds/${guildId}/roles`, {
            method: 'GET',
            headers: this.headers
        })

    public getGuildMembers = async (guildId: number | string): Promise<GuildMember[]|ErrorResponse> =>
        this.request<GuildMember[]>(`${DiscordBaseUri}/guilds/${guildId}/members`, {
            method: 'GET',
            headers: this.headers
        })

    public getGuildMember = async (guildId: number | string, userId: number | string): Promise<GuildMember|ErrorResponse> =>
        this.request<GuildMember>(`${DiscordBaseUri}/guilds/${guildId}/members/${userId}`, {
            method: 'GET',
            headers: this.headers
        })
    
    public updateGuildMember = async (guildId: number | string, userId: number | string, patch: PatchGuildMember): Promise<boolean|ErrorResponse> =>
        this.request<boolean>(`${DiscordBaseUri}/guilds/${guildId}/members/${userId}`, {
            method: 'PATCH',
            headers: {
                ...this.headers,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(patch)
        })

    public getBotGuilds = async (): Promise<Guild[]|ErrorResponse> => 
        this.request<Guild[]>(`${DiscordBaseUri}/users/@me/guilds`, {
            method: 'GET',
            headers: this.headers
        })

    public addGuildMember = async (guildId: number | string, userId: number | string, user: AddGuildMember): Promise<GuildMember|ErrorResponse> =>
        this.request<GuildMember>(`${DiscordBaseUri}/guilds/${guildId}/members/${userId}`, {
            method: 'PUT',
            headers: {
                ...this.headers,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(user)
        })
}
