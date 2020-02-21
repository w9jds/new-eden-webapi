import { DiscordBaseUri, DiscordRedirect } from '../config/constants';
import { ErrorResponse } from 'node-esi-stackdriver';
import fetch, { Response } from 'node-fetch';
import { GuildMember, PatchGuildMember, GuildRole, Guild, AddGuildMember, Tokens } from '../../../models/Discord';

export default class DiscordApi {

  private headers;

  constructor(private clientId: string, private clientSecret: string, token: string) {
    this.headers = {
      'Authorization': `Bot ${token}`,
      'User-Agent': 'Aura Bot Cloud Functions (https://github.com/w9jds, v1) - Jeremy Shore - w9jds@live.com'
    }
  }

  public refresh = async (refreshToken: string, scope: string): Promise<Tokens | ErrorResponse> => {
    const response: Response = await fetch('https://discordapp.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: encodeURIComponent(
        `client_id=${this.clientId}&client_secret=${this.clientSecret}&` +
        `grant_type='refresh_token'&refresh_token=${refreshToken}&redirect_uri=${DiscordRedirect}&` +
        `scope=${scope}`
      )
    });

    if (response.status >= 200 && response.status < 300) {
      if (response.status === 204) {
        return null;
      }

      return await response.json() as Tokens;
    }

    console.log(await response.text());

    return {
      error: true,
      statusCode: response.status,
      uri: response.url
    }
  }

  private request = async <T>(url: string, options): Promise<T | ErrorResponse> => {
    const response: Response = await fetch(url, options);

    if (response.status >= 200 && response.status < 300) {
      if (response.status === 204) {
        return null;
      }

      return await response.json() as T;
    }

    console.log(await response.text());
    // if (content.indexOf('retry_after')) {
    //     const error: { retry_after: number } = JSON.parse(content);
    //     await this.sleep(error.retry_after)
    //     return await this.request(url, options);
    // }

    return {
      error: true,
      statusCode: response.status,
      uri: response.url
    }
  }

  private sleep = (ms: number): Promise<void> => new Promise(resolve => {
    setTimeout(resolve, ms)
  })

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
