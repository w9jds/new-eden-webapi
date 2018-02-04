import * as Boom from 'boom';
import * as moment from 'moment';
import * as jwt from 'jsonwebtoken';
import { database, auth } from 'firebase-admin';
import { Request } from 'hapi';
import { 
    RegisterRedirect, RegisterClientId, RegisterSecret,
    LoginRedirect, LoginClientId, LoginSecret, EveScopes
} from '../config/config';
import { login, verify } from '../lib/auth';
import { Character, Permissions } from '../models/character';
import { Profile } from '../models/profile';
import FirebaseUtils from '../utils/firebase';

export default class Authentication {
    constructor(private firebase: database.Database, private auth: auth.Auth) {}

    private verifyJwt = (header): any => {
        if (!header) {
            throw Boom.unauthorized();
        }

        try {
            return jwt.decode(header.split(' ')[1]);
        }
        catch(error) {
            throw Boom.unauthorized(error);
        }
    }

    public loginHandler = (request: Request, h) => {
        if (!request.query.redirectTo) {
            return Boom.badRequest('Login request requires a redirectTo query for callback');
        }

        let redirect = jwt.sign({ callback: decodeURI(request.query.redirectTo) }, process.env.JWT_SECRET_KEY);
        return h.redirect(`https://login.eveonline.com/oauth/authorize?response_type=code&redirect_uri=${LoginRedirect}&client_id=${LoginClientId}&state=${redirect}`);
    }
    
    public registerHandler = (request: Request, h) => {
        return h.redirect(`https://login.eveonline.com/oauth/authorize/?response_type=code&redirect_uri=${RegisterRedirect}&client_id=${RegisterClientId}&scope=${EveScopes.join('%20')}`);
    }

    public verifyHandler = (request: Request, h) => {
        if (!request.params.userId) {
            return Boom.badRequest('Verify requires you to specify which userId you want to get a token for');
        }

        let authorization = this.verifyJwt(request.headers.authorization);
        return this.getProfile(authorization['accountId']).then((snapshot: database.DataSnapshot) => {
            if (!snapshot.exists()) {
                throw Boom.unauthorized();
            }
            else {
                return this.getCharacter(request.params.userId)
            }
        }).then((snapshot: database.DataSnapshot) => {
            if (!snapshot.exists()) {
                throw Boom.badRequest('Invalid characterId');
            }
            if (snapshot.child('accountId').val() != authorization.accountId) {
                throw Boom.unauthorized();
            }

            return this.auth.createCustomToken(request.params.userId);
        }).then((token: string) => {
            return {
                characterId: request.params.userId,
                customToken: token
            };
        });
    }

    public loginCallbackHandler = (request: Request, h) => {
        let tokens, verification;
        let state = jwt.decode(request.query.state);

        return login(request.query.code, LoginClientId, LoginSecret).then(response => {
            tokens = response;
            return verify(response.token_type, response.access_token);
        }).then(response => {
            verification = response;
            return this.getCharacter(verification.CharacterID)
        }).then((snapshot: database.DataSnapshot) => {
            if (!snapshot.exists()) {
                throw Boom.badRequest('There are no profiles that are associated with this character, please register for a profile.');
            }
            else {
                let profileToken = jwt.sign({accountId: snapshot.child('accountId').val()}, process.env.JWT_SECRET_KEY);
                return h.redirect(`${state['callback']}?code=${profileToken}`)
            }
        });
    }

    public registerCallbackHandler = (request: Request, h) => {
        let tokens, verification;
        let state = request.query.state ? jwt.decode(request.query.state) : null;

        return login(request.query.code, RegisterClientId, RegisterSecret).then(response => {
            tokens = response;
            return verify(response.token_type, response.access_token);
        }).then(response => {
            verification = response;
            return this.getCharacter(verification.CharacterID)
        }).then((snapshot: database.DataSnapshot): Promise<any> => {
            if (!snapshot.exists()) {
                if (!state) {
                    return this.createNewProfile(tokens, verification);
                }
                else {
                    return this.firebase.ref(`characters/${verification.CharacterID}`)
                        .set(this.createCharacter(tokens, verification, state['accountId']));
                }
            }
            else {
                throw Boom.badRequest('Character already associated to a profile');
            }
        }).then(() => {
            if (!state) {
                return {};
            }
            else {
                return h.redirect(state['callback']);
            }
        });
    }

    public addCharacterHandler = (request: Request, h) => {
        let authorization = this.verifyJwt(request.headers.authorization);

        return this.getProfile(authorization['accountId']).then((snapshot: database.DataSnapshot) => {
            if (!snapshot.exists()) {
                throw Boom.unauthorized();
            }
            else {
                let state = jwt.sign({accountId: authorization.accountId, callback: request.query.callback}, process.env.JWT_SECRET_KEY);
                return h.redirect(`https://login.eveonline.com/oauth/authorize/?response_type=code&redirect_uri=${RegisterRedirect}&client_id=${RegisterClientId}&scope=${EveScopes.join('%20')}&state=${state}`);
            }
        });
    }

    private getCharacter = (characterId: number): Promise<database.DataSnapshot> => {
        return this.firebase.ref(`characters/${characterId}`).once('value');
    }

    private getProfile = (profileId: number): Promise<database.DataSnapshot> => {
        return this.firebase.ref(`profiles/${profileId}`).once('value');
    }

    private createNewProfile = (tokens, verification): Promise<[void, void]> => {
        return this.auth.createUser({
            uid: verification.CharacterID.toString(),
            displayName: verification.CharacterName,
            photoURL: `https://imageserver.eveonline.com/Character/${verification.CharacterID}_512.jpg`,
            disabled: false
        }).then((record: auth.UserRecord) => {
            let accountId: string = FirebaseUtils.generateKey();

            return Promise.all([
                this.firebase.ref(`characters/${verification.CharacterID}`).set(this.createCharacter(tokens, verification, accountId)),
                this.firebase.ref(`users/${accountId}`).set({
                    id: record.uid,
                    mainId: verification.CharacterID,
                    name: verification.CharacterName,
                    errors: false
                })
            ]);
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
}