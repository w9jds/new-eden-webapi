import * as admin from 'firebase-admin';
import * as jwt from 'jsonwebtoken';
import * as cert from './config/neweden-admin.json';
import { Server, Request, ResponseToolkit, ServerAuthSchemeOptions } from 'hapi';
import { unauthorized } from 'boom';

import Authentication, {verifyJwt} from './endpoints/auth';
import Discourse from './endpoints/discourse';
import Discord from './endpoints/discord';
import Api from './endpoints/api';

import { DatabaseConfig, AccountsOrigin } from './config/config';
import { Payload } from './models/payload';
import { Character } from './models/character';

let firebase = admin.initializeApp({
    credential: admin.credential.cert(cert as admin.ServiceAccount),
    databaseURL: DatabaseConfig.databaseURL
});

const server: Server = new Server({
    port: process.env.PORT || 8000,
    host: '0.0.0.0'
});

const firebaseScheme = (server: Server, options: ServerAuthSchemeOptions) => {
    return {
        authenticate: (request: Request, h: ResponseToolkit) => {
            let header = request.headers.authorization;

            if (!header || header.split(' ')[0] != 'Bearer') {
                throw unauthorized();
            }

            return admin.auth().verifyIdToken(header.split(' ')[1]).then((decodedToken: admin.auth.DecodedIdToken) => {
                if (decodedToken.uid == request.params.userId) {
                    return admin.database().ref(`characters/${decodedToken.uid}`).once('value');
                }
                else {
                    throw unauthorized('invalid_client: Token is for another user');
                }
            }).then((snapshot: admin.database.DataSnapshot) => {
                return h.authenticated({
                    credentials: snapshot.val() as Character
                });
            }).catch(error => {
                throw unauthorized(error);
            });

        }
    };
};

const jwtScheme = (server: Server, options: ServerAuthSchemeOptions) => {
    return {
        authenticate: (request: Request, h: ResponseToolkit) => {
            let header = request.headers.authorization;

            if ((!header || header.split(' ')[0] != 'Bearer') && !request.state.profile_jwt && !request.state.profile_session) {
                throw unauthorized();
            }

            try {
                let payload = header && header.split(' ')[1] ? header.split(' ')[1] : 
                    request.state.profile_jwt || request.state.profile_session;
                let token: Payload = verifyJwt(payload);

                if (token && token.aud) {
                    return h.authenticated({ credentials: token });
                }
                else {
                    throw unauthorized();
                }
            }
            catch(error) {
                throw unauthorized(error);
            }
        }
    };
};

async function init(): Promise<Server> {
    let isProd: boolean = process.env.NODE_ENV == 'production';

    server.route({
        method : 'OPTIONS',
        path : '/{params*}',
        options: {
            handler: (request, h) => {
                return h.response({ok: true})
                    .header('Access-Control-Allow-Origin', request.headers.origin || request.headers.Origin)
                    .header('Access-Control-Allow-Credentials', 'true')
                    .header('Access-Control-Allow-Methods', 'GET, POST')
                    .header('Access-Control-Allow-Headers', 'authorization, content-type');
            }
        }
    });

    server.route({
        method: 'GET',
        path: '/',
        options: {
            auth: false
        },
        handler: (request: Request, h) => {
            return h.response({
                endpoints: [
                    '/auth/login',
                    '/auth/logout',
                    '/auth/register',
                    '/auth/updateScopes',
                    '/auth/addCharacter',
                    '/auth/verify/{userId*}',
                    '/discourse/login',
                    '/discord/login'
                ]
            });
        }
    });

    server.state('profile_jwt', {
        isSameSite: false,
        isSecure: isProd,
        isHttpOnly: true,
        encoding: 'iron',
        password: process.env.COOKIE_PASSWORD,
        clearInvalid: true,
        strictHeader: true
    });

    createApiRoutes();
    createAuthRoutes();
    createDiscordRoutes();
    createDiscourseRoutes();

    await server.start();
    
    return server;
}

const createApiRoutes = () => {
    let api = new Api(firebase.database());

    server.auth.scheme('firebase', firebaseScheme);
    server.auth.strategy('firebase-auth', 'firebase');

    server.route({
        method: 'POST',
        path: '/ui/waypoint/{userId*}',
        handler: api.waypointHandler,
        options: {
            auth: 'firebase-auth',
            state: {
                parse: true,
                failAction: 'error'
            },
            cors: {
                origin: ['*'],
                additionalHeaders: [
                    'authorization',
                    'content-type'
                ]
            }
        }
    });

    server.route({
        method: 'POST',
        path: '/universe/routes/',
        handler: api.routesHandler,
        options: {
            auth: false,
            cors: {
                origin: ['*'],
                additionalHeaders: [
                    'authorization',
                    'content-type'
                ]
            }
        }
    });
}

const createAuthRoutes = () => {
    let authentication = new Authentication(firebase.database(), firebase.auth());

    server.auth.scheme('jwt', jwtScheme);
    server.auth.strategy('jwt-auth', 'jwt');

    server.route({
        method: 'GET',
        path: '/auth/login',
        options: {
            auth: false,
            handler: authentication.loginHandler
        }
    });

    server.route({
        method: 'GET',
        path: '/auth/logout',
        options: {
            auth: false,
            handler: authentication.logoutHandler
        }
    })

    server.route({
        method: 'GET',
        path: '/auth/register',
        options: {
            auth: false,
            handler: authentication.registerHandler
        }
    });

    server.route({
        method: 'GET',
        path: '/auth/updateScopes',
        options: {
            auth: 'jwt-auth',
            state: {
                parse: true,
                failAction: 'error'
            },
            handler: authentication.modifyScopesHandler
        }
    });

    server.route({
        method: 'GET',
        path: '/auth/addCharacter',
        options: {
            auth: 'jwt-auth',
            state: {
                parse: true,
                failAction: 'error'
            },
            handler: authentication.addCharacterHandler
        }
    });

    server.route({
        method: 'GET',
        path: '/auth/verify/{userId*}',
        handler: authentication.verifyHandler,
        options: {
            auth: 'jwt-auth',
            state: {
                parse: true,
                failAction: 'ignore'
            },
            cors: {
                origin: ['*'],
                credentials: true,
                additionalHeaders: ['authorization']
            }
        }
    });

    server.route({
        method: 'GET',
        path: '/login/callback',
        options: {
            auth: false,
            handler: authentication.loginCallbackHandler
        }
    });

    server.route({
        method: 'GET',
        path: '/register/callback',
        options: {
            auth: false,
            handler: authentication.registerCallbackHandler
        }
    });
}

const createDiscourseRoutes = () => {
    let discourse = new Discourse();

    server.route({
        method: 'GET',
        path: '/discourse/login',
        handler: discourse.loginHandler,
        options: {
            auth: false
        }
    });

    server.route({
        method: 'GET',
        path: '/discourse/callback',
        handler: discourse.callbackHandler,
        options: {
            auth: false
        }
    });
}

const createDiscordRoutes = () => {
    let discord = new Discord(firebase.database());

    server.route({
        method: 'GET',
        path: '/discord/login',
        handler: discord.loginHandler,
        options: {
            auth: 'jwt-auth',
            state: {
                parse: true,
                failAction: 'error'
            }
        }
    });

    server.route({
        method: 'GET',
        path: '/discord/callback',
        handler: discord.callbackHandler,
        options: {
            auth: false
        }
    });

}

init().then(server => {
    console.log('Server running at:', server.info.uri);
}).catch(error => {
    console.log(error);
});
