import * as admin from 'firebase-admin';
import {Server} from 'hapi';
import Authentication from './endpoints/auth';
import {DatabaseConfig} from './config/config';
import * as jwt from 'jsonwebtoken';
import * as cert from './config/firebase-admin.json';

let firebase = admin.initializeApp({
    credential: admin.credential.cert(cert as admin.ServiceAccount),
    databaseURL: DatabaseConfig.databaseURL
});

const server: Server = new Server({
    port: process.env.PORT || 8000
});

async function init(): Promise<Server> {

    server.route({
        method: 'GET',
        path: '/',
        handler: (request: Request, h) => {
            return {
                endpoints: [
                    '/auth/login',
                    '/auth/register',
                    '/auth/verify/',
                    '/auth/addCharacter',
                    '/discourse/login'
                ]
            };
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
        handler: authentication.loginHandler
    });

    server.route({
        method: 'GET',
        path: '/auth/register',
        handler: authentication.registerHandler
    });

    server.route({
        method: 'GET',
        path: '/auth/verify/{userId}',
        handler: authentication.verifyHandler
    });

    server.route({
        method: 'GET',
        path: '/auth/addCharacter',
        handler: authentication.addCharacterHandler
    });

    server.route({
        method: 'GET',
        path: '/login/callback',
        handler: authentication.loginCallbackHandler
    });

    server.route({
        method: 'GET',
        path: '/register/callback',
        handler: authentication.registerCallbackHandler
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