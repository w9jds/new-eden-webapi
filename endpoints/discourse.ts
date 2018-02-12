import * as moment from 'moment';
import * as CryptoJs from 'crypto-js';
import * as jwt from 'jsonwebtoken';
import * as queryString from 'query-string';

import { internal, unauthorized } from 'boom';
import { login, verify } from '../lib/auth';
import { getCharacter } from '../lib/esi';
import { ForumClientId, ForumSecret, ForumRedirect } from '../config/config';

import * as atob from 'atob';
import * as btoa from 'btoa';

export const verifyJwt = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET_KEY);
    }
    catch(error) {
        throw unauthorized(error);
    }
}

export default class Discourse {

    constructor() { }

    public loginHandler = (request, h): void => {
        let hash = CryptoJs.HmacSHA256(request.query.sso, ForumSecret);
        let state = jwt.sign({
            sso: queryString.parse(atob(request.query.sso)),
            sig: request.query.sig
        }, process.env.JWT_SECRET_KEY);

        if (hash.toString() == request.query.sig) {
            return h.redirect(`https://login.eveonline.com/oauth/authorize/?response_type=code&redirect_uri=${ForumRedirect}&client_id=${ForumClientId}&state=${state}`);
        }
        else {
            throw unauthorized();
        }
    }

    public callbackHandler = (request, h) => {
        let characterId: string;

        return login(request.query.code, ForumClientId, ForumSecret).then(response => {
            return verify(response.token_type, response.access_token);
        }).then(response => {
            characterId = response.CharacterID;
            return getCharacter(characterId)
        }).then(character => {
            let state = verifyJwt(request.query.state);
            let query = {
                email: `${characterId}@gmail.com`,
                nonce: state['sso'].nonce,
                external_id: characterId,
                username: character.name.replace(' ', '_'),
                name: character.name,
                avatar_url: `https://imageserver.eveonline.com/Character/${characterId}_256.jpg`
            };
    
            if (character.alliance_id == 99006117) {
                let payload = btoa(queryString.stringify(query));
                let sig = CryptoJs.HmacSHA256(payload, ForumSecret).toString();
    
                return h.redirect(`${state['sso'].return_sso_url}?sso=${payload}&sig=${sig}`);
            }
            else {
                throw unauthorized();
            }
        }).catch(error => {
            throw internal(error);
        })
    }
}
