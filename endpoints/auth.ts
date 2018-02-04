import * as Boom from 'boom';
import * as moment from 'moment';
import jwt from 'jsonwebtoken';
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

    public loginHandler = (request: Request, h) => {
        return h.redirect(`https://login.eveonline.com/oauth/authorize?response_type=code&redirect_uri=${LoginRedirect}&client_id=${LoginClientId}`);
    }
    public registerHandler = (request: Request, h) => {
        return h.redirect(`https://login.eveonline.com/oauth/authorize/?response_type=code&redirect_uri=${RegisterRedirect}&client_id=${RegisterClientId}&scope=${EveScopes.join('%20')}`);
    }
    public verifyHandler = (request: Request, h): void => {
        debugger;
    }

    public loginCallbackHandler = (request: Request, h) => {
        let tokens, verification;
        
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
                return this.auth.createCustomToken(verification.CharacterID).then((token: string) => {
                    let profileToken = jwt.sign({ 
                        accountId: snapshot.child('accountId').val() 
                    }, process.env.JWT_SECRET_KEY);

                    return {
                        profile: profileToken,
                        user: token
                    };
                });
            }
        });
    }

    public registerCallbackHandler = (request: Request, h) => {
        let tokens, verification;
    
        return login(request.query.code, RegisterClientId, RegisterSecret).then(response => {
            tokens = response;
            return verify(response.token_type, response.access_token);
        }).then(response => {
            verification = response;
            return this.getCharacter(verification.CharacterID)
        }).then((snapshot: database.DataSnapshot) => {
            if (!snapshot.exists()) {
                return this.createNewProfile(tokens, verification).then(() => {
                    return {};
                });
            }
            else {
                throw Boom.badRequest('Character already associated to a profile');
            }
        });;
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