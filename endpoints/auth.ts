import {badRequest, unauthorized} from 'boom';
import * as moment from 'moment';
import * as jwt from 'jsonwebtoken';
import { database, auth } from 'firebase-admin';
import { Request, ResponseToolkit } from 'hapi';
import { AccountsOrigin, RegisterRedirect, RegisterClientId, 
    RegisterSecret, LoginRedirect, LoginClientId, LoginSecret, 
    EveScopes
} from '../config/config';
import { login, verify } from '../lib/auth';
import { Character, Permissions } from '../models/character';
import { Profile } from '../models/profile';
import FirebaseUtils from '../utils/firebase';
import { Payload, State } from '../models/payload';

const types = {
    register: 'register',
    addCharacter: 'addCharacter'
}

export const verifyJwt = (token): Payload => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET_KEY) as Payload;
    }
    catch(error) {
        throw unauthorized(error);
    }
}

export const validateScopes = (parameter: string): string[] => {
    let scopes = parameter.split(' ') || [];

    if (scopes.length < 1) {
        throw badRequest('Invalid Request, scopes parameter is required.');
    }

    scopes.forEach(scope => {
        if (EveScopes.indexOf(scope) < 0) {
            throw badRequest('Invalid scopes parameter');
        }
    });

    return scopes;
}

export const verifyScopes = (scopes: string[], permissions: Permissions, h: ResponseToolkit) => {
    let current = permissions ? permissions.scope.split(' ') : [];

    if (!current) {
        return scopes.join(' ');
    }

    let missing = scopes.filter(scope => current.indexOf(scope) < 0);
    
    if (missing.length > 0) {
        return missing.join(' ');
    }
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
    
    private buildRegisterScopes = (request: Request): string => {
        if (request.query.scopes) {
            return request.query.scopes;
        }

        return encodeURIComponent([
            'esi-characters.read_titles.v1',
            'esi-characters.read_corporation_roles.v1'
        ].join(' '));
    }

    public registerHandler = (request: Request, h: ResponseToolkit) => {
        if (!request.query.redirectTo) {
            throw badRequest('Invalid Request, redirectTo parameter is required.');
        }

        let state = jwt.sign({ 
            type: types.register, 
            aud: request.info.host,
            redirect: decodeURI(request.query.redirectTo) 
        }, process.env.JWT_SECRET_KEY);
        return h.redirect(`https://login.eveonline.com/oauth/authorize/?response_type=code&redirect_uri=${RegisterRedirect}&client_id=${RegisterClientId}&scope=${this.buildRegisterScopes(request)}&state=${state}`);
    }

    public addCharacterHandler = (request: Request, h: ResponseToolkit) => {
        if (!request.query.redirectTo) {
            throw badRequest('Invalid Request, redirectTo parameter is required.');
        }
        if (!request.query.token) {
            throw badRequest('Invalid Request, token parameter is required.');
        }

        let authorization: Payload = verifyJwt(request.query.token);
        
        if (authorization.aud != request.info.host) {
            throw unauthorized('invalid_client: Token is for another client');
        }

        return this.getProfile(authorization.accountId).then((snapshot: database.DataSnapshot) => {
            if (!snapshot.exists()) {
                throw unauthorized();
            }
            else {
                let state = jwt.sign({
                    type: types.addCharacter,
                    aud: request.info.host,
                    accountId: authorization.accountId, 
                    redirect: request.query.redirectTo
                }, process.env.JWT_SECRET_KEY);
                return h.redirect(`https://login.eveonline.com/oauth/authorize/?response_type=code&redirect_uri=${RegisterRedirect}&client_id=${RegisterClientId}&scope=${EveScopes.join('%20')}&state=${state}`);
            }
        });
    }

    public verifyHandler = (request: Request, h: ResponseToolkit) => {
        let authorization = request.auth.credentials as Payload;
        let characterId: string | number = request.params.userId || authorization.mainId;

        return this.getProfile(authorization.accountId).then((snapshot: database.DataSnapshot) => {
            if (!snapshot.exists()) {
                throw badRequest(`Invalid request, profile doesn't exist!`);
            }

            return this.getCharacter(characterId);
        }).then((snapshot: database.DataSnapshot) => {
            if (!snapshot.exists()) {
                throw badRequest('Invalid request, character not found!');
            }
            
            if (snapshot.child('accountId').val() != authorization.accountId) {
                throw badRequest('Invalid request, character not part of provided profile!');
            }

            let missingScopes = verifyScopes(authorization.scopes, snapshot.child('sso').val() as Permissions, h);
            if (missingScopes) {
                throw badRequest(`Invalid request, character missing ${missingScopes} scopes`);
            }

            return this.auth.createCustomToken(characterId.toString());
        }).then((token: string) => {
            return h.response({ characterId, token });
        });;
    }

    public loginCallbackHandler = (request: Request, h: ResponseToolkit) => {
        let tokens, verification;
        let state: State = verifyJwt(request.query.state) as State;

        return login(request.query.code, LoginClientId, LoginSecret).then(response => {
            tokens = response;
            return verify(response.token_type, response.access_token);
        }).then(response => {
            verification = response;
            return this.getCharacter(verification.CharacterID)
        }).then((snapshot: database.DataSnapshot) => {
            if (!snapshot.exists()) {
                return h.redirect(`${AccountsOrigin}?type=character_not_found`);
            }

            let missingScopes = verifyScopes(state.scopes, snapshot.child('sso').val() as Permissions, h);
            if (missingScopes) {
                return h.redirect(`${AccountsOrigin}?type=missing_scopes&scopes=${encodeURIComponent(missingScopes)}`);;
            }

            return this.getProfile(snapshot.child('accountId').val()).then((snapshot: database.DataSnapshot) => {
                let token = this.buildProfileToken(state.aud, state.scopes, snapshot.key, snapshot.child('mainId').val());
                return h.redirect(`${state.redirect}#${token}`)  
            });
        });
    }

    public registerCallbackHandler = (request: Request, h: ResponseToolkit) => {
        let tokens, verification;
        let state: State = verifyJwt(request.query.state) as State;

        return login(request.query.code, RegisterClientId, RegisterSecret).then(response => {
            tokens = response;
            return verify(response.token_type, response.access_token);
        }).then(response => {
            verification = response;
            return this.getCharacter(verification.CharacterID)
        }).then((snapshot: database.DataSnapshot) => {
            if (!snapshot.exists()) {
                if (state.type == types.register) {
                    return this.createNewProfile(state, request, tokens, verification).then(token => {
                        return h.redirect(`${state.redirect}/#${token}`);
                    });
                }
                if (state.type == types.addCharacter) {
                    return Promise.all([
                        this.createUser(verification),
                        this.firebase.ref(`characters/${verification.CharacterID}`)
                            .set(this.createCharacter(tokens, verification, state.accountId))
                    ]).then(() => {
                        return h.redirect(state.redirect);  
                    });
                }
            }
            else {
                return h.redirect(`${AccountsOrigin}?type=character_already_exists`);
            }
        });
    }

    private getCharacter = (characterId: number | string): Promise<database.DataSnapshot> => {
        return this.firebase.ref(`characters/${characterId}`).once('value');
    }

    private getProfile = (profileId: number | string): Promise<database.DataSnapshot> => {
        return this.firebase.ref(`users/${profileId}`).once('value');
    }

    private createNewProfile = (state, request, tokens, verification): Promise<string> => {
        let accountId: string = FirebaseUtils.generateKey();

        return this.createUser(verification).then((record: auth.UserRecord) => {
            return Promise.all([
                this.firebase.ref(`characters/${verification.CharacterID}`).set(this.createCharacter(tokens, verification, accountId)),
                this.firebase.ref(`users/${accountId}`).set({
                    id: accountId,
                    mainId: verification.CharacterID,
                    name: verification.CharacterName,
                    errors: false
                })
            ]);
        }).then(() => {
            return this.buildProfileToken(state.aud, state.scopes, accountId, verification.CharacterID);
        });
    }

    private createUser = (verification): Promise<auth.UserRecord> => {
        return this.auth.createUser({
            uid: verification.CharacterID.toString(),
            displayName: verification.CharacterName,
            photoURL: `https://imageserver.eveonline.com/Character/${verification.CharacterID}_512.jpg`,
            disabled: false
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

    private buildProfileToken = (host, scopes: string[], accountId: string | number, mainId): string => {
        return jwt.sign({
            iss: 'https://api.chingy.tools',
            sub: 'profile',
            aud: host,
            accountId, mainId, scopes
        }, process.env.JWT_SECRET_KEY);
    }
}