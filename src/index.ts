import * as admin from 'firebase-admin';
import * as cert from './config/neweden-admin.json';

import { Server, Request, ResponseToolkit, RouteOptions } from '@hapi/hapi';
import { unauthorized } from '@hapi/boom';

import Authentication, {verifyJwt} from './endpoints/auth';
import Discord from './endpoints/discord';
import Api from './endpoints/api';

import { Character, Esi } from 'node-esi-stackdriver';
import { CookieOptions, DatabaseConfig, UserAgent } from './config/config';
import { Payload } from '../models/Payload';
import Corporation from './endpoints/corp.js';

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
    credentials: true,
    additionalHeaders: [
      'Accept',
      'Authorization',
      'Content-Type',
      'If-None-Match',
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

const firebaseScheme = (_server: Server, _) => ({
  authenticate: async (request: Request, h: ResponseToolkit) => {
    const header = request.headers.authorization;
    if (!header || header.split(' ')[0] !== 'Bearer') {
      console.info(`[401] ${request.path} - ${header}`);
      throw unauthorized('Authentication Bearer token not provided');
    }

    const decodedToken = await admin.auth().verifyIdToken(header.split(' ')[1]);
    if (decodedToken.uid != request.params.userId) {
      console.info(`[401] ${request.path} - invalid_client ${decodedToken.uid} != ${request.params.userId}`);
      throw unauthorized('invalid_client: Token is for another user');
    }

    const snapshot = await admin.database().ref(`characters/${decodedToken.uid}`).once('value');
    return h.authenticated({
      credentials: {
        user: snapshot.val() as Character
      }
    });
  }
})

const directorScheme = (_server: Server, _) => ({
  authenticate: async (request: Request, h: ResponseToolkit) => {
    const header = request.headers.authorization;
    if (!header || header.split(' ')[0] !== 'Bearer') {
      console.info(`[401] ${request.path} - ${header}`);
      throw unauthorized('Authentication Bearer token not provided');
    }

    const decodedToken = await admin.auth().verifyIdToken(header.split(' ')[1]);
    const snapshot = await admin.database().ref(`characters/${decodedToken.uid}`).once('value');
    const character: Character = snapshot.val();
    if (+request.params.corpId != character.corpId) {
      console.info(`[401] ${request.path} - invalid_corp ${request.params.corpId} != ${character.corpId}`);
      throw unauthorized('invalid_corp: User is not in this corp');
    }

    if (!snapshot.hasChild('roles') || !snapshot.hasChild('roles/roles') || character.roles.roles.indexOf('Director') < 0) {
      console.info(`[401] ${request.path} - invalid_user ${snapshot.key} is not a director`);
      throw unauthorized('invalid_user: User is not a director');
    }

    return h.authenticated({
      credentials: {
        user: character
      }
    });
  }
})

const jwtScheme = (_server: Server, _) => ({
  authenticate: (request: Request, h: ResponseToolkit) => {
    const header = request.headers.authorization;
    if ((!header || header.split(' ')[0] !== 'Bearer') && !request.state.profile_jwt && !request.state.profile_session) {
      console.info(`[401] ${request.path} -  header: ${header} profile_jwt: ${request.state?.profile_jwt} session: ${request.state?.profile_session}`);

      h.unstate('profile_jwt');
      h.unstate('profile_session');
      throw unauthorized('Authentication Bearer token not provided');
    }

    try {
      const payload = header && header.split(' ')[1] ? header.split(' ')[1] : request.state.profile_jwt || request.state.profile_session;
      const token: Payload = verifyJwt(payload);

      if (token && token.aud) {
        return h.authenticated({
          credentials: {
            user: token
          }
        });
      } else {
        h.unstate('profile_jwt');
        h.unstate('profile_session');

        console.info(`[401] ${request.path} - invalid_token ${JSON.stringify(token)}`)
        throw unauthorized('Invalid JWT Token');
      }
    }
    catch(error) {
      h.unstate('profile_jwt');
      h.unstate('profile_session');

      console.error(JSON.stringify(error));
      throw unauthorized(error);
    }
  }
});

const init = async (): Promise<Server> => {
  const isProd: boolean = process.env.NODE_ENV === 'production';

  server.route({
    method : 'OPTIONS',
    path : '/{params*}',
    handler: (request, h) => {
      return h.response({ok: true})
        .header('Access-Control-Allow-Origin', request.headers.origin || request.headers.Origin)
        .header('Access-Control-Allow-Credentials', 'true')
        .header('Access-Control-Allow-Methods', 'GET, POST')
        .header('Access-Control-Allow-Headers', 'authorization, content-type');
    }
  });

  server.route({
    method: 'GET',
    path: '/',
    options: {
      auth: false
    },
    handler: (_request: Request, h) => {
      return h.response(server.table().map(row => row.path));
    }
  });

  server.state('profile_jwt', {
    ...CookieOptions,
    // isSameSite: 'None',
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
  createCorpRoutes();
  createDiscordRoutes();

  await server.start();
  return server;
}

const createApiRoutes = () => {
  const api = new Api(firebase.database(), esi);

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
    path: '/api/thera',
    handler: api.theraChain,
    options: {
      auth: 'firebase-auth',
      ...parseState,
      ...acceptCors,
    }
  });
}

const createCorpRoutes = () => {
  const corp = new Corporation(firebase.database());

  server.auth.scheme('director', directorScheme);
  server.auth.strategy('firebase-director', 'director');

  server.route({
    method: 'GET',
    path: '/corp/{corpId}/members/',
    handler: corp.membersHandler,
    options: {
      auth: 'firebase-director',
      ...parseState,
      ...acceptCors
    }
  });
}

const createAuthRoutes = () => {
  const authentication = new Authentication(firebase.database(), firebase.auth());

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
  });

  server.route({
    method: 'GET',
    path: '/auth/close',
    options: {
      auth: 'jwt-auth',
      handler: authentication.closeHandler,
      ...parseState,
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

const createDiscordRoutes = () => {
  const discord = new Discord(firebase.database());

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

const startServerInstance = async () => {
  try {
    let webApi = await init();

    console.info('Server running at: ', webApi.info.uri);
  }
  catch(error) {
    console.error(error);
  }
}

process.on('uncaughtException', e => {
  console.log(e);
  process.exit(1);
});

process.on('unhandledRejection', e => {
  console.log(e);
  process.exit(1);
});

startServerInstance();