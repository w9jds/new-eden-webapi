import Boom from 'boom';
import moment from 'moment';
import { database, auth } from 'firebase-admin';
import { Request, ReplyNoContinue } from 'hapi';
import { 
    RegisterRedirect, RegisterClientId, RegisterSecret,
    LoginRedirect, LoginClientId, LoginSecret, EveScopes
} from '../config/config';
import { login, verify } from '../lib/auth';
import { Character, Permissions } from '../models/character';
import { Profile } from '../models/profile';

export default class Authentication {
    constructor(private firebase: database.Database, private auth: auth.Auth) {}

    public loginHandler = (request: Request, reply: ReplyNoContinue): void => {
        reply.redirect(``);
    }
    public registerHandler = (request: Request, reply: ReplyNoContinue): void => {
        reply.redirect(`https://login.eveonline.com/oauth/authorize/?response_type=code&redirect_uri=${RegisterRedirect}&client_id=${RegisterClientId}&scope=${EveScopes.join('%20')}`);
    }
    public verifyHandler = (request: Request, reply: ReplyNoContinue): void => {
        debugger;
    }

    public loginCallbackHandler = (request: Request, reply: ReplyNoContinue): void => {
        // this.firebase.ref(`characters/${}`)
    }

    public registerCallbackHandler = (request: Request, reply: ReplyNoContinue): void => {
        let tokens;
    
        login(request.query.code).then(response => {
            tokens = response;
            return verify(response.token_type, response.access_token);
        }).then(verification => {
            this.firebase.ref(`characters/${verification.CharacterID}`).once('value', (snapshot: database.DataSnapshot) => {
                if (!snapshot.exists) {
                    this.createNewProfile(tokens, verification).then(() => {
                        reply();
                    });
                }
                else {
                    reply(Boom.badRequest('Character already associated to a profile'));
                }
            });
        });
    }

    private createNewProfile = (tokens, verification): Promise<void> => {
        return this.auth.createUser({
            displayName: verification.CharacterName,
            photoURL: ``,
            disabled: false
        }).then((record: auth.UserRecord) => {
            return this.firebase.ref(`character/${verification.CharacterID}`)
                .set(this.createCharacter(tokens, verification, record.uid)).then(() => {
                    return this.firebase.ref(`users/${record.uid}`).set({
                        id: record.uid,
                        mainId: verification.CharacterID,
                        name: verification.CharacterName,
                        errors: false
                    });
                })
        });
    }

    private createCharacter = (tokens, verification, uid): Character => {
        return {
            id: verification.CharacterID,
            accountId: uid,
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