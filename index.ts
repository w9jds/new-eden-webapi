import * as admin from 'firebase-admin';
import {Server, ServerOptions} from 'hapi';
import Authentication from './endpoints/auth';
import {DatabaseConfig} from './config/config';
import * as jwt from 'jsonwebtoken';
import * as cert from './config/firebase-admin.json';

const server: Server = new Server({
    port: process.env.PORT || 8000,
    host: '0.0.0.0'
});

let firebase = admin.initializeApp({
    credential: admin.credential.cert(cert as admin.ServiceAccount),
    databaseURL: DatabaseConfig.databaseURL
});

async function init(): Promise<Server> {
    createRoutes();
    
    await server.start();

    return server;
}

const createRoutes = () => {
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
        path: '/login/callback',
        handler: authentication.loginCallbackHandler
    });

    server.route({
        method: 'GET',
        path: '/register/callback',
        handler: authentication.registerCallbackHandler
    });
}

init().then(server => {
    console.log('Server running at:', server.info.uri);
}).catch(error => {
    console.log(error);  
});