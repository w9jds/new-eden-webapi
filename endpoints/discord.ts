import * as moment from 'moment';
import * as jwt from 'jsonwebtoken';

import { Request, ResponseToolkit } from 'hapi';
import { DiscordClientId, DiscordRedirect } from '../config/config';

export default class Discord {

    constructor() { }

    public loginHandler = (request: Request, h: ResponseToolkit) => {
        return h.redirect(`https://discordapp.com/api/oauth2/authorize?client_id=${DiscordClientId}&redirect_uri=${DiscordRedirect}&response_type=code&scope=identify%20email%20guilds`);
    }

    public callbackHandler = (request: Request, h: ResponseToolkit) => {

    }
}
