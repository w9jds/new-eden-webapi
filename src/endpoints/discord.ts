import * as moment from 'moment';
import { database } from 'firebase-admin';
import { Request, ResponseToolkit, ResponseObject } from 'hapi';
import { DiscordClientId, DiscordRedirect, AccountsOrigin, DiscordScopes, DiscordApiBase } from '../config/config';
import { encryptState, decryptState } from './auth';
import { validate, getCurrentUser } from '../lib/discord';

import { Payload } from '../../models/Payload';
import { Tokens, DiscordUser } from '../../models/Discord';

export default class Discord {

  constructor(private firebase: database.Database) { }

  public loginHandler = (request: Request, h: ResponseToolkit): ResponseObject => {
    const authorization = request.auth.credentials.user as Payload;
    const cipherText = encryptState(authorization);

    return h.redirect(`${DiscordApiBase}/oauth2/authorize?client_id=${DiscordClientId}`
      + `&redirect_uri=${encodeURIComponent(DiscordRedirect)}&response_type=code&scope=${encodeURIComponent(DiscordScopes.join(' '))}&state=${cipherText}`);
  }

  public callbackHandler = async (request: Request, h: ResponseToolkit): Promise<ResponseObject> => {
    if (request.query['error']) {
      return h.redirect(AccountsOrigin);
    }

    const state: Payload = decryptState(request.query.state);
    const tokens: Tokens = await validate(<string>request.query.code);
    const user: DiscordUser = await getCurrentUser(tokens.access_token);

    this.firebase.ref(`discord/${user.id}`).set({
      id: user.id,
      accountId: state.accountId,
      username: user.username,
      discriminator: user.discriminator,
      verified: user.verified || false,
      avatar: user.avatar || null,
      email: user.email || null,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: moment().add((tokens.expires_in - 60), 'seconds').valueOf(),
      tokenType: tokens.token_type,
      scope: tokens.scope
    });

    return h.redirect(`${AccountsOrigin}`);
  }
}
