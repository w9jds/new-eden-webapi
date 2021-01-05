import * as CryptoJs from 'crypto-js';
import * as moment from 'moment';
import * as atob from 'atob';
import * as btoa from 'btoa';

import {verify as Verify, sign} from 'jsonwebtoken';
import { database, auth } from 'firebase-admin';
import { Request, ResponseToolkit, ResponseObject } from 'hapi';
import { badRequest, unauthorized } from 'boom';
import { Character, Permissions } from 'node-esi-stackdriver';
import { login, verify, revoke } from '../lib/auth';
import FirebaseUtils from '../utils/firebase';

import { Payload, State } from '../../models/Payload';
import { CorporationConfig } from '../../models/Corporation';

import {
    AccountsOrigin, RegisterRedirect, RegisterClientId,
    RegisterSecret, LoginRedirect, LoginClientId, LoginSecret,
    EveScopes, DefaultEveScopes, CookieOptions
} from '../config/config';

enum RequestType {
  REGISTER = 'register',
  ADD_CHARACTER = 'addCharacter',
  SCOPES = 'scopes'
}

enum SessionType {
  NONE = 'none',
  TOKEN = 'token',
  PERSISTENT = 'persistent',
  SESSION = 'session'
}

enum ErrorType {
  CHARACTER_NOT_FOUND = 'character_not_found',
  MISSING_SCOPES = 'missing_scopes'

}

export const verifyJwt = (token): Payload => {
  try {
    return Verify(token, process.env.JWT_SECRET_KEY) as Payload;
  }
  catch(error) {
    throw unauthorized(error);
  }
}

export const encryptState = state => {
  let code = CryptoJs.AES.encrypt(JSON.stringify(state), process.env.JWT_SECRET_KEY);
  return btoa(code.toString());
}

export const decryptState = state => {
  let bytes = CryptoJs.AES.decrypt(atob(state), process.env.JWT_SECRET_KEY);
  return JSON.parse(bytes.toString(CryptoJs.enc.Utf8));
}


const validateScopes = (parameter: string): string[] => {
  if (!parameter) {
    throw badRequest('Invalid Request, scopes parameter is required.');
  }

  let scopes = decodeURIComponent(parameter).split(' ') || [];

  for (const scope of DefaultEveScopes) {
    if (scopes.indexOf(scope) < 0) {
      scopes.push(scope);
    }
  }

  for (const scope of scopes) {
    if (EveScopes.indexOf(scope) < 0) {
      throw badRequest('Invalid scopes parameter');
    }
  }

  return scopes;
}

const verifyScopes = (scopes: string[], character: database.DataSnapshot, settings: database.DataSnapshot, h: ResponseToolkit): string[] => {
  const permissions: Permissions = character.child('sso').val();
  let current = permissions && permissions.scope ? permissions.scope.split(' ') : [];

  if (!current) {
    return scopes;
  }

  let missing = scopes.filter(scope => current.indexOf(scope) < 0);

  if (settings && settings.exists()) {
    const config: CorporationConfig = settings.val();

    if (config.enforceScopes === true) {
      missing.concat(config.scopes.filter(scope => current.indexOf(scope) < 0));
    }
  }

  if (missing.length > 0) {
    return missing;
  }

  return null;
}

const buildRegisterScopes = (request: Request): string => {
  if (request.query.scopes) {
    return validateScopes(<string>request.query.scopes).join('%20');
  }

  return encodeURIComponent(DefaultEveScopes.join(' '));
}

const isValidSessionType = (responseType: string): boolean => {
  switch (responseType) {
    case SessionType.NONE:
    case SessionType.TOKEN:
    case SessionType.PERSISTENT:
    case SessionType.SESSION:
      return true;
    default:
      return false;
  }
}

export default class Authentication {
  constructor(private firebase: database.Database, private auth: auth.Auth) {}

  public loginHandler = (request: Request, h: ResponseToolkit) => {
    if (!request.query.redirect_to) {
      throw badRequest('Invalid Request', 'redirect_to parameter is required.');
    }

    if (!isValidSessionType(<string>request.query.response_type)) {
      throw badRequest('Invalid Request', 'valid type parameter is required.');
    }

    let cipherText = encryptState({
      aud: request.info.host,
      response_type: request.query.response_type,
      scopes: validateScopes(<string>request.query.scopes),
      redirect: decodeURI(<string>request.query.redirect_to)
    });

    return h.redirect(`https://login.eveonline.com/oauth/authorize?response_type=code&redirect_uri=${LoginRedirect}`
      + `&client_id=${LoginClientId}&state=${cipherText}`);
  }

  public logoutHandler = (request: Request, h: ResponseToolkit) => {
    if (!request.query['redirect_to']) {
      throw badRequest('Invalid Request, redirect_to parameter is required.');
    }

    h.unstate('profile_jwt', CookieOptions);
    return h.redirect(<string>request.query.redirect_to);
  }

  public loginCallbackHandler = async (request: Request, h: ResponseToolkit): Promise<ResponseObject> => {
    const state: State = decryptState(request.query.state) as State;
    const tokens = await login(<string>request.query.code, LoginClientId, LoginSecret);
    const verification = await verify(tokens.token_type, tokens.access_token);
    const character: database.DataSnapshot = await this.getCharacter(verification.CharacterID);

    if (!character.exists()) {
      return h.redirect(`${AccountsOrigin}?type=character_not_found&redirect_to=${state.redirect}`
          + `&scopes=${state.scopes.join('%20')}`);
    }

    const profile: database.DataSnapshot = await this.getProfile(character.child('accountId').val());
    const token = this.buildProfileToken(state.aud, profile.key, profile.child('mainId').val());
    const missingScopes = verifyScopes(state.scopes, character, null, h);

    if (missingScopes) {
      let cipherText = encryptState({
        mainId: character.key,
        accountId: character.child('accountId').val(),
        scopes: missingScopes
      });

      return this.redirect(`${AccountsOrigin}?type=missing_scopes&name=${encodeURIComponent(character.child('name').val())}`
        + `&redirect=${state.redirect}&state=${cipherText}`, token, state.response_type, h);
    }

    return this.redirect(state.redirect, token, state.response_type, h);
  }

  public registerHandler = (request: Request, h: ResponseToolkit) => {
    if (!request.query['redirect_to']) {
      throw badRequest('Invalid Request, redirect_to parameter is required.');
    }

    if (!isValidSessionType(<string>request.query.response_type)) {
      throw badRequest('Invalid Request, valid type parameter is required.');
    }

    let cipherText = encryptState({
      aud: request.info.host,
      type: RequestType.REGISTER,
      response_type: request.query.response_type,
      redirect: decodeURI(<string>request.query.redirect_to)
    });

    return h.redirect(`https://login.eveonline.com/oauth/authorize/?response_type=code&redirect_uri=${RegisterRedirect}`
      + `&client_id=${RegisterClientId}&scope=${buildRegisterScopes(request)}&state=${cipherText}`);
  }

  public registerCallbackHandler = async (request: Request, h: ResponseToolkit): Promise<ResponseObject> => {
    const state: State = decryptState(request.query['state']) as State;
    const tokens = await login(<string>request.query.code, RegisterClientId, RegisterSecret);
    const verification = await verify(tokens.token_type, tokens.access_token);
    const character: database.DataSnapshot = await this.getCharacter(verification.CharacterID);

    if (!character.exists()) {
      switch (state.type) {
        case RequestType.REGISTER:
          let token = await this.createNewProfile(state, tokens, verification);
          return this.redirect(state.redirect, token, state.response_type, h);
        case RequestType.ADD_CHARACTER:
          let character = this.createCharacter(tokens, verification, state.accountId);
          await Promise.all([
            this.createUser(verification),
            this.firebase.ref(`characters/${verification.CharacterID}`).set(character)
          ]);
          return h.redirect(state.redirect);
      }
    }

    if (character.hasChild('sso')) {
        let permissions: Permissions = character.child('sso').val();
        await revoke(permissions.accessToken, RegisterClientId, RegisterSecret);
    }

    await character.child('sso').ref.set(this.createCharacter(tokens, verification, state.accountId).sso);

    let token = this.buildProfileToken(state.redirect, state.accountId, verification.CharacterID);
    return this.redirect(state.redirect, token, state.response_type, h);
  }

  public modifyScopesHandler = async (request: Request, h: ResponseToolkit): Promise<ResponseObject> => {
    if (!request.query['redirect_to']) {
      throw badRequest('Invalid Request, redirect_to parameter is required.');
    }
    if (!request.query['state']) {
      throw badRequest('Invalid Request, state parameter is required.');
    }

    let state = decryptState(request.query['state']);
    let character = await this.getCharacter(state.mainId);

    if (!character.exists()) {
      throw badRequest('Invalid Request, character not found.');
    }

    if (character.hasChild('sso') && character.hasChild('sso/scope')) {
      let permissions = character.child('sso').val() as Permissions;
      for (let scope of permissions.scope.split(' ')) {
        if (state.scopes.indexOf(scope) < 0) {
          state.scopes.push(scope);
        }
      }
    }
    else {
      for (let scope of DefaultEveScopes) {
        if (state.scopes.indexOf(scope) < 0) {
          state.scopes.push(scope);
        }
      }
    }

    return h.redirect(`/auth/register?redirect_to=${decodeURIComponent(<string>request.query.redirect_to)}`
      + `&response_type=none&scopes=${state.scopes.join('%20')}`);
  }

  public addCharacterHandler = async (request: Request, h: ResponseToolkit): Promise<ResponseObject> => {
    let authorization = request.auth.credentials.user as Payload;
    if (!request.query.redirect_to) {
      throw badRequest('Invalid Request, redirect_to parameter is required.');
    }
    if (authorization.aud !== request.info.host) {
      throw unauthorized('invalid_client: Token is for another client');
    }

    let profile: database.DataSnapshot = await this.getProfile(authorization.accountId);
    if (!profile.exists()) {
      throw unauthorized();
    }

    let cipherText = encryptState({
      type: RequestType.ADD_CHARACTER,
      aud: request.info.host,
      accountId: authorization.accountId,
      redirect: decodeURIComponent(<string>request.query.redirect_to)
    });

    return h.redirect(`https://login.eveonline.com/oauth/authorize/?response_type=code&redirect_uri=${RegisterRedirect}`
      + `&client_id=${RegisterClientId}&scope=${buildRegisterScopes(request)}&state=${cipherText}`);
  }

  public verifyHandler = async (request: Request, h: ResponseToolkit) => {
    if (!request.query.scopes) {
      throw badRequest('Invalid request, scopes parameter is required.');
    }

    const authorization = request.auth.credentials.user as Payload;
    const characterId: string | number = request.params.userId || authorization.mainId;
    const profile: database.DataSnapshot = await this.getProfile(authorization.accountId);
    const scopes: string[] = decodeURIComponent(<string>request.query.scopes).split(' ');

    if (!profile.exists()) {
      throw badRequest(`Invalid request, profile doesn't exist!`);
    }

    const character: database.DataSnapshot = await this.getCharacter(characterId);
    if (!character.exists()) {
      return h.response({
        error: ErrorType.CHARACTER_NOT_FOUND,
        redirect: `${AccountsOrigin}?type=${ErrorType.CHARACTER_NOT_FOUND}&redirect_to=${request.info.referrer}&scopes=${scopes.join('%20')}`
      }).code(503);
    }

    if (character.child('accountId').val() !== authorization.accountId) {
      throw unauthorized('Character not part of provided profile!');
    }

    const corpConfig = await this.getCorpConfig(character.child('corpId').val());
    const missingScopes = verifyScopes(scopes, character, corpConfig, h);
    if (missingScopes && missingScopes.length > 0) {
      const cipherText = encryptState({
        mainId: character.key,
        accountId: character.child('accountId').val(),
        scopes: missingScopes
      });

      return h.response({
        error: ErrorType.MISSING_SCOPES,
        redirect: `${AccountsOrigin}?type=${ErrorType.MISSING_SCOPES}&name=${encodeURIComponent(character.child('name').val())}`
          + `&redirect=${request.info.referrer}&state=${cipherText}`
      }).code(503);
    }

    return h.response({
      characterId: characterId,
      token: await this.auth.createCustomToken(characterId.toString())
    });
  }

  private createCharacter = (tokens, verification, accountId): Character => ({
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
  });

  private getCharacter = (characterId: number | string): Promise<database.DataSnapshot> =>
    this.firebase.ref(`characters/${characterId}`).once('value');

  private getProfile = (profileId: number | string): Promise<database.DataSnapshot> =>
    this.firebase.ref(`users/${profileId}`).once('value');

  private getCorpConfig = (corpId: number | string): Promise<database.DataSnapshot> =>
    this.firebase.ref(`corporations/configs/${corpId}`).once('value');

  private createUser = (verification): Promise<auth.UserRecord> => {
    let user = {
      uid: verification.CharacterID.toString(),
      displayName: verification.CharacterName,
      photoURL: `https://imageserver.eveonline.com/Character/${verification.CharacterID}_512.jpg`,
      disabled: false
    };

    return this.auth.createUser(user).catch(error => {
      return this.auth.updateUser(user.uid, user);
    });
  }

  private redirect = (uri: string, token: string, type: string, h: ResponseToolkit): ResponseObject => {
    switch(type) {
      case SessionType.NONE:
        return h.redirect(uri);
      case SessionType.TOKEN:
        return h.redirect(`${uri}#${token}`)
      case SessionType.PERSISTENT:
        h.state('profile_jwt', token, {
          ...CookieOptions,
          ttl: 1000 * 60 * 60 * 24 * 365 * 10
        });
        return h.redirect(`${uri}`);
      case SessionType.SESSION:
        h.state('profile_jwt', token, CookieOptions);
        return h.redirect(`${uri}`);
    }
  }

  private createNewProfile = async (state, tokens, verification): Promise<string> => {
    let accountId: string = FirebaseUtils.generateKey();

    await Promise.all([
      this.createUser(verification),
      this.firebase.ref(`characters/${verification.CharacterID}`)
          .set(this.createCharacter(tokens, verification, accountId)),
      this.firebase.ref(`users/${accountId}`).set({
        id: accountId,
        mainId: verification.CharacterID,
        name: verification.CharacterName,
        errors: false
      })
    ]);

    return this.buildProfileToken(state.aud, accountId, verification.CharacterID);
  }

  private buildProfileToken = (host: string, accountId: string | number, mainId): string => {
    return sign({
      iss: 'https://api.new-eden.io',
      // sub: () => 'profile',
      aud: host,
      accountId,
      mainId,
    }, process.env.JWT_SECRET_KEY);
  }
}
