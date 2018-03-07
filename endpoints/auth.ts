import * as CryptoJs from 'crypto-js';
import * as moment from 'moment';
import * as jwt from 'jsonwebtoken';
import * as atob from 'atob';
import * as btoa from 'btoa';

import FirebaseUtils from '../utils/firebase';
import { database, auth } from 'firebase-admin';
import { Request, ResponseToolkit, ResponseObject } from 'hapi';
import { badRequest, unauthorized } from 'boom';
import { login, verify } from '../lib/auth';
import { Character, Permissions } from '../models/character';
import { Profile } from '../models/profile';
import { Payload, State } from '../models/payload';
import { revoke } from '../lib/auth';
import { AccountsOrigin, RegisterRedirect, RegisterClientId,
    RegisterSecret, LoginRedirect, LoginClientId, LoginSecret,
    EveScopes } from '../config/config';

const types = {
    register: 'register',
    addCharacter: 'addCharacter',
    scopes: 'scopes'
}

const defaultScopes = [
    'esi-characters.read_titles.v1',
    'esi-characters.read_corporation_roles.v1'
];

export const verifyJwt = (token): Payload => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET_KEY) as Payload;
    }
    catch(error) {
        throw unauthorized(error);
    }
}

export const encryptState = state => {
    let code = CryptoJs.AES.encrypt(JSON.stringify(state), process.env.JWT_SECRET_KEY);
    return btoa(code.toString());
}

export const decryptState = state => {
    let bytes = CryptoJs.AES.decrypt(atob(state), process.env.JWT_SECRET_KEY);
    return JSON.parse(bytes.toString(CryptoJs.enc.Utf8));
}


const validateScopes = (parameter: string): string[] => {
    if (!parameter) {
        throw badRequest('Invalid Request, scopes parameter is required.');
    }

    let scopes = decodeURIComponent(parameter).split(' ') || [];

    defaultScopes.forEach(scope => {
        if (scopes.indexOf(scope) < 0) {
            scopes.push(scope);
        }
    });

    scopes.forEach(scope => {
        if (EveScopes.indexOf(scope) < 0) {
            throw badRequest('Invalid scopes parameter');
        }
    });

    return scopes;
}

const verifyScopes = (scopes: string[], permissions: Permissions, h: ResponseToolkit): string[] => {
    let current = permissions ? permissions.scope.split(' ') : [];

    if (!current) {
        return scopes;
    }

    let missing = scopes.filter(scope => current.indexOf(scope) < 0);

    if (missing.length > 0) {
        return missing;
    }

    return null;
}

const buildRegisterScopes = (request: Request): string => {
    if (request.query['scopes']) {
        return validateScopes(request.query['scopes']).join('%20');
    }

    return encodeURIComponent(defaultScopes.join(' '));
}

export default class Authentication {
    constructor(private firebase: database.Database, private auth: auth.Auth) {}

    public loginHandler = (request: Request, h: ResponseToolkit) => {
        if (!request.query['redirect_to']) {
            throw badRequest('Invalid Request, redirect_to parameter is required.');
        }
        if (!request.query['response_type'] && request.query['response_type'] != 'none' && request.query['response_type'] != 'token' && request.query['response_type'] != 'persistant' && request.query['response_type'] != 'session') {
            throw badRequest('Invalid Request, valid type parameter is required.');
        }

        let cipherText = encryptState({
            aud: request.info.host,
            response_type: request.query['response_type'],
            scopes: validateScopes(request.query['scopes']),
            redirect: decodeURI(request.query['redirect_to'])
        });
        return h.redirect(`https://login.eveonline.com/oauth/authorize?response_type=code&redirect_uri=${LoginRedirect}`
            + `&client_id=${LoginClientId}&state=${cipherText}`);
    }

    public logoutHandler = (request: Request, h: ResponseToolkit) => {
        if (!request.query['redirect_to']) {
            throw badRequest('Invalid Request, redirect_to parameter is required.');
        }

        h.redirect(request.query['redirect_to']).unstate('profile_jwt');
    }

    public loginCallbackHandler = async (request: Request, h: ResponseToolkit): Promise<ResponseObject> => {
        let state: State = decryptState(request.query['state']) as State;
        let tokens = await login(request.query['code'], LoginClientId, LoginSecret);
        let verification = await verify(tokens.token_type, tokens.access_token);
        let character: database.DataSnapshot = await this.getCharacter(verification.CharacterID);

        if (!character.exists()) {
            return h.redirect(`${AccountsOrigin}?type=character_not_found&redirect_to=${state.redirect}`
                + `&scopes=${state.scopes.join('%20')}`);
        }

        let profile: database.DataSnapshot = await this.getProfile(character.child('accountId').val());
        let token = this.buildProfileToken(state.aud, state.scopes, profile.key, profile.child('mainId').val());
        let missingScopes = verifyScopes(state.scopes, character.child('sso').val() as Permissions, h);

        if (missingScopes) {
            let token = this.buildScopesToken(request.info.host, character, missingScopes);
            return this.redirect(`${AccountsOrigin}?type=missing_scopes&name=${encodeURIComponent(character.child('name').val())}`
                + `&redirect=${state.redirect}&state=${token}`, token, state.response_type, h);
        }

        return this.redirect(state.redirect, token, state.response_type, h);
    }

    public registerHandler = (request: Request, h: ResponseToolkit) => {
        if (!request.query['redirect_to']) {
            throw badRequest('Invalid Request, redirect_to parameter is required.');
        }
        if (!request.query['response_type'] && request.query['response_type'] != 'none' && request.query['response_type'] != 'token' && request.query['response_type'] != 'persistant' && request.query['response_type'] != 'session') {
            throw badRequest('Invalid Request, valid type parameter is required.');
        }

        let cipherText = encryptState({
            aud: request.info.host,
            type: types.register,
            response_type: request.query['response_type'],
            redirect: decodeURI(request.query['redirect_to'])
        });
        
        return h.redirect(`https://login.eveonline.com/oauth/authorize/?response_type=code&redirect_uri=${RegisterRedirect}`
            + `&client_id=${RegisterClientId}&scope=${buildRegisterScopes(request)}&state=${cipherText}`);
    }

    public registerCallbackHandler = async (request: Request, h: ResponseToolkit): Promise<ResponseObject> => {
        let state: State = decryptState(request.query['state']) as State;
        let tokens = await login(request.query['code'], RegisterClientId, RegisterSecret);
        let verification = await verify(tokens.token_type, tokens.access_token);
        let character: database.DataSnapshot = await this.getCharacter(verification.CharacterID);

        if (!character.exists()) {
            if (state.type == types.register) {
                let token = await this.createNewProfile(state, request, tokens, verification);
                return this.redirect(state.redirect, token, state.response_type, h);
            }
            if (state.type == types.addCharacter) {
                let character = this.createCharacter(tokens, verification, state.accountId);
                await Promise.all([
                    this.createUser(verification),
                    this.firebase.ref(`characters/${verification.CharacterID}`).set(character)
                ]);
                return h.redirect(state.redirect);
            }
        }

        if (character.hasChild('sso')) {
            let permissions: Permissions = character.child('sso').val();
            await revoke(permissions.accessToken, RegisterClientId, RegisterSecret);
        }

        character.child('sso').ref.set(this.createCharacter(tokens, verification, state.accountId).sso);
        
        let token = this.buildProfileToken(
            state.redirect,
            verification.Scopes.split(' '),
            state.accountId,
            verification.CharacterID
        );
        return this.redirect(state.redirect, token, state.response_type, h);
    }

    public modifyScopesHandler = async (request: Request, h: ResponseToolkit): Promise<ResponseObject> => {
        let authorization = request.auth.credentials as Payload;
        
        if (!request.query['redirect_to']) {
            throw badRequest('Invalid Request, redirect_to parameter is required.');
        }

        let character = await this.getCharacter(authorization.mainId);
        if (!character.exists()) {
            throw badRequest('Invalid Request, character not found.');
        }

        if (character.hasChild('sso')) {
            let permissions = character.child('sso').val() as Permissions;
            permissions.scope.split(' ').forEach(scope => {
                if (authorization.scopes.indexOf(scope) < 0) {
                    authorization.scopes.push(scope);
                }
            });
        }
        else {
            defaultScopes.forEach(scope => {
                if (authorization.scopes.indexOf(scope) < 0) {
                    authorization.scopes.push(scope);
                }
            });
        }

        return h.redirect(`/auth/register?redirect_to=${decodeURIComponent(request.query['redirect_to'])}`
            + `&response_type=none&scopes=${authorization.scopes.join('%20')}`);
    }

    public addCharacterHandler = async (request: Request, h: ResponseToolkit): Promise<ResponseObject> => {
        let authorization = request.auth.credentials as Payload;
        if (!request.query['redirect_to']) {
            throw badRequest('Invalid Request, redirect_to parameter is required.');
        }
        if (authorization.aud != request.info.host) {
            throw unauthorized('invalid_client: Token is for another client');
        }

        let profile: database.DataSnapshot = await this.getProfile(authorization.accountId);
        if (!profile.exists()) {
            throw unauthorized();
        }

        let cipherText = encryptState({
            type: types.addCharacter,
            aud: request.info.host,
            accountId: authorization.accountId,
            redirect: decodeURIComponent(request.query['redirect_to'])
        });
        return h.redirect(`https://login.eveonline.com/oauth/authorize/?response_type=code&redirect_uri=${RegisterRedirect}`
            + `&client_id=${RegisterClientId}&scope=${buildRegisterScopes(request)}&state=${cipherText}`);
    }

    public verifyHandler = async (request: Request, h: ResponseToolkit) => {
        let authorization = request.auth.credentials as Payload;
        let characterId: string | number = request.params.userId || authorization.mainId;
        let profile: database.DataSnapshot = await this.getProfile(authorization.accountId);

        if (!profile.exists()) {
            throw badRequest(`Invalid request, profile doesn't exist!`);
        }

        let character: database.DataSnapshot = await this.getCharacter(characterId);
        if (!character.exists()) {
            return h.response({
                error: 'invalid_character',
                redirect: `${AccountsOrigin}?type=character_not_found&redirect_to=${request.info.referrer}&scopes=${authorization.scopes.join('%20')}`
            }).code(503);
        }

        if (character.child('accountId').val() != authorization.accountId) {
            throw unauthorized('Character not part of provided profile!');
        }

        let missingScopes = verifyScopes(authorization.scopes, character.child('sso').val() as Permissions, h);
        if (missingScopes) {
            let token = this.buildScopesToken(request.info.referrer, character, missingScopes);
            return h.response({
                error: 'invalid_scopes',
                redirect: `${AccountsOrigin}?type=missing_scopes&name=${encodeURIComponent(character.child('name').val())}&redirect=${request.info.referrer}&state=${token}`
            }).code(503);
        }

        return h.response({ 
            characterId: characterId, 
            token: await this.auth.createCustomToken(characterId.toString())
        });
    }

    private createCharacter = (tokens, verification, accountId): Character => {
        return {
            id: verification.CharacterID,
            accountId,
            name: verification.CharacterName,
            hash: verification.CharacterOwnerHash,
            sso: {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                expiresAt: moment().add((tokens.expires_in - 60), 'seconds').valueOf(),
                scope: verification.Scopes
            }
        };
    }

    private getCharacter = (characterId: number | string): Promise<database.DataSnapshot> => {
        return this.firebase.ref(`characters/${characterId}`).once('value');
    }

    private getProfile = (profileId: number | string): Promise<database.DataSnapshot> => {
        return this.firebase.ref(`users/${profileId}`).once('value');
    }

    private createUser = (verification): Promise<auth.UserRecord> => {
        let user = {
            uid: verification.CharacterID.toString(),
            displayName: verification.CharacterName,
            photoURL: `https://imageserver.eveonline.com/Character/${verification.CharacterID}_512.jpg`,
            disabled: false
        };

        return this.auth.createUser(user).catch(error => {
            return this.auth.updateUser(user.uid, user);
        });
    }

    private redirect = (uri: string, token: string, type: string, h: ResponseToolkit): ResponseObject => {
        if (type == 'none') {
            return h.redirect(uri);
        }
        if (type == 'token') {
            return h.redirect(`${uri}#${token}`)
        }
        if (type == 'persistant') {
            h.state('profile_jwt', token, {
                domain: 'new-eden.io',
                path: '/',
                ttl: 1000 * 60 * 60 * 24 * 365 * 10
            });
            return h.redirect(`${uri}`);
        }
        if (type == 'session') {
            h.state('profile_jwt', token, {
                domain: 'new-eden.io',
                path: '/'
            });
            return h.redirect(`${uri}`);
        }
    }

    private createNewProfile = async (state, request, tokens, verification): Promise<string> => {
        let accountId: string = FirebaseUtils.generateKey();
        let record: auth.UserRecord = await this.createUser(verification);

        await Promise.all([
            this.firebase.ref(`characters/${verification.CharacterID}`).set(this.createCharacter(tokens, verification, accountId)),
            this.firebase.ref(`users/${accountId}`).set({
                id: accountId,
                mainId: verification.CharacterID,
                name: verification.CharacterName,
                errors: false
            })
        ]);

        return this.buildProfileToken(state.aud, state.scopes, accountId, verification.CharacterID);
    }

    private buildScopesToken = (host: string, character: database.DataSnapshot, missingScopes: string[]): string => {
        return jwt.sign({
            aud: host,
            mainId: character.key,
            accountId: character.child('accountId').val(),
            scopes: missingScopes
        }, process.env.JWT_SECRET_KEY);
    }

    private buildProfileToken = (host: string, scopes: string[], accountId: string | number, mainId): string => {
        return jwt.sign({
            iss: 'https://api.new-eden.io',
            sub: 'profile',
            aud: host,
            accountId, mainId, scopes
        }, process.env.JWT_SECRET_KEY);
    }
}
