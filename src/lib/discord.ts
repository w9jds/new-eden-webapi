import { DiscordApiBase, DiscordClientId, DiscordSecret, DiscordRedirect, DiscordScopes } from '../config/config';
import { Tokens, DiscordUser } from '../../models/discord';
import fetch, { Response } from 'node-fetch';

export const validate = async (code: string): Promise<Tokens> => {
    const data = {
        client_id: DiscordClientId,
        client_secret: DiscordSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: DiscordRedirect,
        scope: DiscordScopes.join(' ')
    };

    const response: Response = await fetch(`${DiscordApiBase}/oauth2/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: Object.keys(data).map(key => key + '=' + data[key]).join('&')
    });

    return await response.json() as Tokens;
}

export const getCurrentUser = async (accessToken: string): Promise<DiscordUser> => {
    const response: Response = await fetch(`${DiscordApiBase}/v6/users/@me`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });

    return await response.json() as DiscordUser;
}
