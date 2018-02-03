import admin, {database, auth} from 'firebase-admin';
import {Server, Request, ReplyNoContinue} from 'hapi';
import Authentication from './endpoints/auth';
import {DatabaseConfig} from './config/config';
import * as jwt from 'jsonwebtoken';
import * as cert from './config/firebase-admin.json';

let server: Server = new Server();

let firebase = admin.initializeApp({
    credential: admin.credential.cert(cert as admin.ServiceAccount),
    databaseURL: DatabaseConfig.databaseURL
});

let authentication = new Authentication(firebase.database(), firebase.auth());

server.connection({
    port: process.env.PORT || 8080,
    host: '0.0.0.0'
});

const validate = (request, decodedToken, callback) => {
    admin.auth().getUser(decodedToken.accountId)
        .then(userRecord => {
            return callback({}, true, userRecord.toJSON());
        })
        .catch(error => {
            console.log("Error fetching user data:", error);
        });
};

server.register([require('inert'), require('hapi-auth-jwt')], error => {
    if (error) {
        throw error;
    }

    server.auth.strategy('jwt', 'jwt', {
        key: process.env.JWT_SECRET_KEY,
        validateFunc: validate,
        verifyOptions: { 
            algorithms: ['HS256'] 
        }
    });



    server.route({
        method: 'GET',
        path: '/auth/login',
        config: {
            auth: false,
            handler: authentication.loginHandler
        }
    });

    server.route({
        method: 'GET',
        path: '/auth/register',
        config: {
            auth: false,
            handler: authentication.registerHandler
        }
    });

    server.route({
        method: 'GET',
        path: '/login/callback',
        config: {
            auth: false,
            handler: authentication.loginCallbackHandler
        }
    });

    server.route({
        method: 'GET',
        path: '/register/callback',
        config: {
            auth: false,
            handler: authentication.registerCallbackHandler
        }
    });

    server.route({
        method: 'GET',
        path: '/auth/verify',
        config: {
            auth: 'token',

        }
    });

    server.start(error => {
        if (error) {
            throw error;
        }

        console.log(`Server running at: ${server.info.uri}`);
    });
});

export default server;
