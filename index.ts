import * as admin from 'firebase-admin';
import * as cert from './config/neweden-admin.json';
import { Server, Request, ResponseToolkit, ServerAuthSchemeOptions, RouteOptions } from 'hapi';
import { unauthorized } from 'boom';

import Authentication, {verifyJwt} from './endpoints/auth';
import Discourse from './endpoints/discourse';
import Discord from './endpoints/discord';
import Api from './endpoints/api';

import { DatabaseConfig, AccountsOrigin, UserAgent } from './config/config';
import { Payload } from './models/payload';
import { Character, Esi } from 'node-esi-stackdriver';

const firebase = admin.initializeApp({
    credential: admin.credential.cert(cert as admin.ServiceAccount),
    databaseURL: DatabaseConfig.databaseURL
});

const esi: Esi = new Esi(UserAgent, {
    projectId: 'new-eden-storage-a5c23'
});

const server: Server = new Server({
    port: process.env.PORT || 8000,
    host: '0.0.0.0'
});

const acceptCors: RouteOptions = {
    cors: {
        origin: ['*'],
        additionalHeaders: [
            'authorization',
            'content-type'
        ]
    }
};

const parseState: RouteOptions = {
    state: {
        parse: true,
        failAction: 'error'
    }
}

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

const init = async (): Promise<Server> => {
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
            return h.response(server.table().map(row => row.path));
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
    let api = new Api(firebase.database(), esi);

    server.auth.scheme('firebase', firebaseScheme);
    server.auth.strategy('firebase-auth', 'firebase');

    server.route({
        method: 'POST',
        path: '/ui/waypoint/{userId*}',
        handler: api.waypointHandler,
        options: {
            auth: 'firebase-auth',
            ...parseState,
            ...acceptCors
        }
    });

    server.route({
        method: 'GET',
        path: '/character/{userId*}/mail',
        handler: {},
        options: {
            auth: 'firebase-auth',
            ...parseState,
            ...acceptCors
        }
    });

    server.route({
        method: 'GET',
        path: '/character/{userId*}/wallet',
        handler: {},
        options: {
            auth: 'firebase-auth',
            ...parseState,
            ...acceptCors
        }
    });

    server.route({
        method: 'GET',
        path: '/character/{userId*}/skills',
        handler: {},
        options: {
            auth: 'firebase-auth',
            ...parseState,
            ...acceptCors
        }
    });

    server.route({
        method: 'GET',
        path: '/market/{regionId}/orders/{typeId*}',
        handler: api.regionOrdersHandler,
        options: {
            auth: false,
            ...acceptCors
        }
    });

    server.route({
        method: 'POST',
        path: '/universe/routes/',
        handler: api.routesHandler,
        options: {
            auth: false,
            ...acceptCors
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
            auth: 'jwt-auth',
            handler: authentication.logoutHandler,
            ...parseState
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
            handler: authentication.modifyScopesHandler,
            ...parseState
        }
    });

    server.route({
        method: 'GET',
        path: '/auth/addCharacter',
        options: {
            auth: 'jwt-auth',
            handler: authentication.addCharacterHandler,
            ...parseState
        }
    });

    server.route({
        method: 'GET',
        path: '/auth/verify/{userId*}',
        handler: authentication.verifyHandler,
        options: {
            auth: 'jwt-auth',
            ...parseState,
            ...acceptCors
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
    let discourse = new Discourse(esi);

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
            ...parseState
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
