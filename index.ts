import * as admin from 'firebase-admin';
import {Server} from 'hapi';
import Authentication, {verifyJwt} from './endpoints/auth';
import {DatabaseConfig} from './config/config';
import * as jwt from 'jsonwebtoken';
import * as cert from './config/firebase-admin.json';
import { Payload } from './models/payload';
import { unauthorized } from 'boom';

let firebase = admin.initializeApp({
    credential: admin.credential.cert(cert as admin.ServiceAccount),
    databaseURL: DatabaseConfig.databaseURL
});

const server: Server = new Server({
    port: process.env.PORT || 8000,
    host: '0.0.0.0'
});

const scheme = (server, options) => {
    return {
        authenticate: (request, h) => {
            const authorization = request.headers.authorization;

            let header = request.headers.authorization;

            if (!header || header.split(' ')[0] != 'Bearer') {
                throw unauthorized();
            }
    
            try {
                let token: Payload = verifyJwt(header.split(' ')[1]);
                if (token && token.aud) {
                    if (token.aud != request.info.host) {
                        throw unauthorized('invalid_client: Token is for another client');
                    }
                    
                    return h.authenticated({ 
                        credentials: token
                    });
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

    server.auth.scheme('jwt', scheme);
    server.auth.strategy('jwt-auth', 'jwt');

    server.route({
        method : 'OPTIONS',
        path : '/{params*}',
        options: { 
            handler: (request, h) => { 
                return h.response({ok: true})
                    .header('Access-Control-Allow-Origin', request.headers.origin || request.headers.Origin)
                    .header('Access-Control-Allow-Credentials', 'true')
                    .header('Access-Control-Allow-Methods', 'GET, POST, PUT')
                    .header('Access-Control-Allow-Headers', 'authorization');
            }
        }
    });

    server.route({
        method: 'GET',
        path: '/.well-known/acme-challenge/{token}',
        handler: (request, h) => {            
            return {};
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
                    '/auth/register',
                    '/auth/verify/',
                    '/auth/addCharacter',
                    '/discourse/login'
                ]
            });
        }
    });

    createAuthRoutes();
    createDiscourseRoutes();
    
    await server.start();

    return server;
}

const createAuthRoutes = () => {
    let authentication = new Authentication(firebase.database(), firebase.auth());

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
        path: '/auth/register',
        options: {
            auth: false,
            handler: authentication.registerHandler
        }
    });

    server.route({
        method: 'GET',
        path: '/auth/addCharacter',
        options: {
            auth: false,
            handler: authentication.addCharacterHandler
        }
    });

    server.route({
        method: 'GET',
        path: '/auth/verify/{userId*}',
        handler: authentication.verifyHandler,
        options: {
            auth: 'jwt-auth',
            cors: {
                origin: ['*'],
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
    // server.route({
    //     method: 'GET',
    //     path: '/discourse/login',
    //     handler: discourse.login
    // });

    // server.route({
    //     method: 'GET',
    //     path: '/discourse/callback',
    //     handler: discourse.callback
    // });
}

init().then(server => {
    console.log('Server running at:', server.info.uri);
}).catch(error => {
    console.log(error);  
});