import * as moment from 'moment';
import * as CryptoJs from 'crypto-js';
import {verify as Verify, sign} from 'jsonwebtoken';
import * as queryString from 'query-string';

import { ResponseObject } from 'hapi';
import { internal, unauthorized } from 'boom';
import { login, verify } from '../lib/auth';
import { Esi } from 'node-esi-stackdriver';
import { ForumClientId, ForumSecret, ForumRedirect } from '../config/config';

import * as atob from 'atob';
import * as btoa from 'btoa';

export const verifyJwt = (token) => {
    try {
        return Verify(token, process.env.JWT_SECRET_KEY);
    }
    catch(error) {
        throw unauthorized(error);
    }
}

export default class Discourse {

    constructor(private esi: Esi) { }

    public loginHandler = (request, h) => {
        let hash = CryptoJs.HmacSHA256(request.query.sso, ForumSecret);
        
        let state = sign({
            sso: queryString.parse(atob(request.query.sso)),
            sig: request.query.sig
        }, process.env.JWT_SECRET_KEY);

        if (hash.toString() == request.query.sig) {
            return h.redirect(`https://login.eveonline.com/oauth/authorize/?response_type=code&redirect_uri=${ForumRedirect}&client_id=${ForumClientId}&state=${state}`);
        }

        throw unauthorized();
    }

    public callbackHandler = async (request, h): Promise<ResponseObject> => {
        let tokens = await login(request.query.code, ForumClientId, ForumSecret);
        let verification = await verify(tokens.token_type, tokens.access_token);
        let character = await this.esi.getCharacter(verification.CharacterID);
        let state = verifyJwt(request.query.state);
        
        let query = {
            email: `${verification.CharacterID}@gmail.com`,
            nonce: state['sso'].nonce,
            external_id: verification.CharacterID,
            username: character.name.replace(' ', '_'),
            name: character.name,
            avatar_url: `https://imageserver.eveonline.com/Character/${verification.CharacterID}_256.jpg`
        };

        if (character.alliance_id == 99006117) {
            let payload = btoa(queryString.stringify(query));
            let sig = CryptoJs.HmacSHA256(payload, ForumSecret).toString();

            return h.redirect(`${state['sso'].return_sso_url}?sso=${payload}&sig=${sig}`);
        }
        
        throw unauthorized();
    }
}
