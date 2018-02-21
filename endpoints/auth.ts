import {badRequest, unauthorized} from 'boom';
import * as moment from 'moment';
import * as jwt from 'jsonwebtoken';
import { database, auth } from 'firebase-admin';
import { Request, ResponseToolkit, ResponseObject } from 'hapi';
import { AccountsOrigin, RegisterRedirect, RegisterClientId, 
    RegisterSecret, LoginRedirect, LoginClientId, LoginSecret, 
    EveScopes
} from '../config/config';
import { login, verify } from '../lib/auth';
import { Character, Permissions } from '../models/character';
import { Profile } from '../models/profile';
import FirebaseUtils from '../utils/firebase';
import { Payload, State } from '../models/payload';
import { revoke } from '../lib/auth';

const types = {
    register: 'register',
    addCharacter: 'addCharacter'
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

export const validateScopes = (parameter: string): string[] => {
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

export const verifyScopes = (scopes: string[], permissions: Permissions, h: ResponseToolkit): string[] => {
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
    if (request.query.scopes) {
        return validateScopes(request.query.scopes).join('%20');
    }

    return encodeURIComponent(defaultScopes.join(' '));
}

export default class Authentication {
    constructor(private firebase: database.Database, private auth: auth.Auth) {}

    public loginHandler = (request: Request, h: ResponseToolkit) => {
        if (!request.query.redirectTo) {
            throw badRequest('Invalid Request, redirectTo parameter is required.');
        }

        let redirect = jwt.sign({
            aud: request.info.host, 
            scopes: validateScopes(request.query.scopes), 
            redirect: decodeURI(request.query.redirectTo)}, 
            process.env.JWT_SECRET_KEY);
        return h.redirect(`https://login.eveonline.com/oauth/authorize?response_type=code&redirect_uri=${LoginRedirect}&client_id=${LoginClientId}&state=${redirect}`);
    }

    public registerHandler = (request: Request, h: ResponseToolkit) => {
        if (!request.query.redirectTo) throw badRequest('Invalid Request, redirectTo parameter is required.');

        let state = jwt.sign({ 
            type: types.register,
            aud: request.info.host,
            redirect: decodeURI(request.query.redirectTo)
        }, process.env.JWT_SECRET_KEY);
        
        return h.redirect(`https://login.eveonline.com/oauth/authorize/?response_type=code&redirect_uri=${RegisterRedirect}&client_id=${RegisterClientId}&scope=${buildRegisterScopes(request)}&state=${state}`);
    }

    public addCharacterHandler = async (request: Request, h: ResponseToolkit): Promise<ResponseObject> => {
        if (!request.query.redirectTo) throw badRequest('Invalid Request, redirectTo parameter is required.');
        if (!request.query.token) throw badRequest('Invalid Request, token parameter is required.');

        let authorization: Payload = verifyJwt(request.query.token);
        if (authorization.aud != request.info.host) throw unauthorized('invalid_client: Token is for another client');

        let snapshot: database.DataSnapshot = await this.getProfile(authorization.accountId);
        if (!snapshot.exists()) throw unauthorized();

        let state = jwt.sign({
            type: types.addCharacter,
            aud: request.info.host,
            accountId: authorization.accountId, 
            redirect: request.query.redirectTo
        }, process.env.JWT_SECRET_KEY);
        
        return h.redirect(`https://login.eveonline.com/oauth/authorize/?response_type=code&redirect_uri=${RegisterRedirect}&client_id=${RegisterClientId}&scope=${buildRegisterScopes(request)}&state=${state}`);
    }

    public modifyScopesHandler = async (request: Request, h: ResponseToolkit): Promise<ResponseObject> => {
        if (!request.query.redirectTo) throw badRequest('Invalid Request, redirectTo parameter is required.');
        if (!request.query.state) throw badRequest('Invalid Request, state parameter is required.');

        let state = verifyJwt(request.query.state);
        let character = await this.getCharacter(state.mainId);
        if (!character.exists) throw badRequest('Invalid State');

        if (character.hasChild('sso')) {
            let permissions = character.child('sso').val() as Permissions;        
            permissions.scope.split(' ').forEach(scope => {
                if (state.scopes.indexOf(scope) < 0) {
                    state.scopes.push(scope);
                }
            });
        }
        else {
            defaultScopes.forEach(scope => {
                if (state.scopes.indexOf(scope) < 0) {
                    state.scopes.push(scope);
                }
            });
        }

        return h.redirect(`/auth/register?redirectTo=${decodeURIComponent(request.query.redirectTo)}&scopes=${state.scopes.join('%20')}`);
    }

    public verifyHandler = async (request: Request, h: ResponseToolkit) => {
        let authorization = request.auth.credentials as Payload;
        let characterId: string | number = request.params.userId || authorization.mainId;

        let profile: database.DataSnapshot = await this.getProfile(authorization.accountId);
        if (!profile.exists()) throw badRequest(`Invalid request, profile doesn't exist!`);

        let character: database.DataSnapshot = await this.getCharacter(characterId);
        if (!character.exists()) {
            return h.response({
                error: 'invalid_character',
                redirect: `${AccountsOrigin}?type=character_not_found&redirectTo=${request.info.referrer}&scopes=${authorization.scopes.join('%20')}`
            }).code(400);
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
            }).code(401);
        }
        
        let token: string = await this.auth.createCustomToken(characterId.toString());
        return h.response({ characterId, token });
    }

    public loginCallbackHandler = async (request: Request, h: ResponseToolkit): Promise<ResponseObject> => {
        let state: State = verifyJwt(request.query.state) as State;

        let tokens = await login(request.query.code, LoginClientId, LoginSecret);
        let verification = await verify(tokens.token_type, tokens.access_token);
        let character: database.DataSnapshot = await this.getCharacter(verification.CharacterID);

        if (!character.exists()) {
            return h.redirect(`${AccountsOrigin}?type=character_not_found&redirectTo=${state.redirect}&scopes=${state.scopes.join('%20')}`);
        }

        let missingScopes = verifyScopes(state.scopes, character.child('sso').val() as Permissions, h);
        if (missingScopes) {
            let token = this.buildScopesToken(request.info.host, character, missingScopes);
            return h.redirect(`${AccountsOrigin}?type=missing_scopes&name=${encodeURIComponent(character.child('name').val())}&redirect=${state.redirect}&state=${token}`);
        }

        let profile: database.DataSnapshot = await this.getProfile(character.child('accountId').val());
        let token = this.buildProfileToken(state.aud, state.scopes, profile.key, profile.child('mainId').val());

        return h.redirect(`${state.redirect}#${token}`);
    }

    public registerCallbackHandler = async (request: Request, h: ResponseToolkit): Promise<ResponseObject> => {
        let state: State = verifyJwt(request.query.state) as State;
        let authorization = await login(request.query.code, RegisterClientId, RegisterSecret);
        let verification = await verify(authorization.token_type, authorization.access_token);
        let character: database.DataSnapshot = await this.getCharacter(verification.CharacterID);
        
        if (!character.exists()) {
            if (state.type == types.register) {
                let token = await this.createNewProfile(state, request, authorization, verification);
                return h.redirect(`${state.redirect}/#${token}`);
            }
            if (state.type == types.addCharacter) {
                await Promise.all([
                    this.createUser(verification),
                    this.firebase.ref(`characters/${verification.CharacterID}`)
                        .set(this.createCharacter(authorization, verification, state.accountId))
                ]);
                return h.redirect(state.redirect);
            }
        }
        else {
            if (character.hasChild('sso')) {
                let permissions: Permissions = character.child('sso').val();
    
                if (permissions.scope.split(' ').length < verification.Scopes.split(' ').length) {
                    await revoke(permissions.accessToken, RegisterClientId, RegisterSecret);
                    character.child('sso').ref.set(
                        this.createCharacter(authorization, verification, state.accountId).sso
                    );
                }
                else {
                    await revoke(authorization.access_token, RegisterClientId, RegisterSecret)
                }
            }
            else {
                character.child('sso').ref.set(
                    this.createCharacter(authorization, verification, state.accountId).sso
                );  
            }
    
            return h.redirect(`${state.redirect}/#` + 
                this.buildProfileToken(state.redirect, verification.Scopes.split(' '), state.accountId, verification.CharacterID)
            );
        }
    }

    private getCharacter = (characterId: number | string): Promise<database.DataSnapshot> => {
        return this.firebase.ref(`characters/${characterId}`).once('value');
    }

    private getProfile = (profileId: number | string): Promise<database.DataSnapshot> => {
        return this.firebase.ref(`users/${profileId}`).once('value');
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
            iss: 'https://api.chingy.tools',
            sub: 'profile',
            aud: host,
            accountId, mainId, scopes
        }, process.env.JWT_SECRET_KEY);
    }
}