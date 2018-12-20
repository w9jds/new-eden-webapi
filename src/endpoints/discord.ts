import * as moment from 'moment';
import { database } from 'firebase-admin';
import { Request, ResponseToolkit, ResponseObject } from 'hapi';
import { DiscordClientId, DiscordRedirect, AccountsOrigin, DiscordScopes } from '../config/config';
import { encryptState, decryptState } from './auth';
import { Payload } from '../models/payload';
import { validate, getCurrentUser } from '../lib/discord';
import { Tokens, User } from '../models/discord';

export default class Discord {

    constructor(private firebase: database.Database) { }

    public loginHandler = (request: Request, h: ResponseToolkit): ResponseObject => {
        let authorization = request.auth.credentials.user as Payload;
        let cipherText = encryptState(authorization);

        return h.redirect(`https://discordapp.com/api/oauth2/authorize?client_id=${DiscordClientId}`
            + `&redirect_uri=${encodeURIComponent(DiscordRedirect)}&response_type=code&scope=${encodeURIComponent(DiscordScopes.join(' '))}&state=${cipherText}`);
    }

    public callbackHandler = async (request: Request, h: ResponseToolkit): Promise<ResponseObject> => {
        if (request.query['error']) {
            return h.redirect(AccountsOrigin);
        }

        let state: Payload = decryptState(request.query['state']);
        let tokens: Tokens = await validate(request.query['code']);
        let user: User = await getCurrentUser(tokens.access_token);

        this.firebase.ref(`discord/${user.id}`).set({
            id: user.id,
            accountId: state.accountId,
            username: user.username,
            discriminator: user.discriminator,
            verified: user.verified,
            avatar: user.avatar,
            email: user.email || null,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt: moment().add((tokens.expires_in - 60), 'seconds').valueOf(),
            tokenType: tokens.token_type,
            scope: tokens.scope
        });

        return h.redirect(`${AccountsOrigin}`);
    }
}
