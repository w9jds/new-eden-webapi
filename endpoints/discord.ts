import * as moment from 'moment';
import { database } from 'firebase-admin';
import { Request, ResponseToolkit, ResponseObject } from 'hapi';
import { DiscordClientId, DiscordRedirect } from '../config/config';
import { verifyJwt } from './auth';
import { Payload } from '../models/payload';
import { validate, getCurrentUser } from '../lib/discord';
import { Tokens, User } from '../models/discord';
import { badRequest } from 'boom';
import { AccountsOrigin } from '../config/config';

export default class Discord {

    constructor(private firebase: database.Database) { }

    public loginHandler = (request: Request, h: ResponseToolkit): ResponseObject => {
        if (!request.query.token) {
            throw badRequest('Request is missing a token query containing the profile information.');
        }
        
        verifyJwt(request.query.token);
        return h.redirect(`https://discordapp.com/api/oauth2/authorize?client_id=${DiscordClientId}&redirect_uri=${encodeURIComponent(DiscordRedirect)}&response_type=code&scope=identify%20email%20guilds%20guilds.join&state=${request.query.token}`);
    }

    public callbackHandler = async (request: Request, h: ResponseToolkit): Promise<ResponseObject> => {
        if (request.query.error) {
            return h.redirect(AccountsOrigin);
        }

        let state: Payload = verifyJwt(request.query.state);
        let tokens: Tokens = await validate(request.query.code);
        let user: User = await getCurrentUser(tokens.access_token);

        this.firebase.ref(`discord/${user.id}`).set({
            id: user.id,
            accountId: state.accountId,
            username: user.username,
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