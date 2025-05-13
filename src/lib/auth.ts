import { UserAgent } from '../config/config';
import { ErrorResponse, Logger } from 'node-esi-stackdriver';
import { decode } from 'jsonwebtoken';
import { EveTokens, TokenPayload, Verification } from '../../models/Auth';
import fetch, { Response } from 'node-fetch';

const logging = new Logger('auth', { projectId: 'new-eden-storage-a5c23' });
const headers = {
  'Accept': 'application/json',
  'User-Agent' : UserAgent
};

const verifyResponse = async (method: string, response: Response): Promise<any | ErrorResponse> => {
  if (response.status >= 200 && response.status < 305) {
    if (response.body) {
      return await response.json();
    }
    return;
  }

  // await logging.logHttp(method, response, await response.text());

  return {
    error: true,
    statusCode: response.status,
    uri: response.url
  }
}

export const verify = (token: string): Verification => {
  const payload: TokenPayload = decode(token, {
    json: true
  });

  return {
    characterId: +payload.sub.split(':')[2],
    name: payload.name,
    owner: payload.owner,
    scopes: payload.scp ? payload.scp.join(' ') : '',
  };
}

export const login = async (code: string, clientId: string, secret: string): Promise<EveTokens | ErrorResponse> => {
  const response = await fetch('https://login.eveonline.com/v2/oauth/token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(clientId + ':' + secret).toString('base64'),
      'Host': 'login.eveonline.com',
      'Content-Type': 'application/x-www-form-urlencoded',
      ...headers
    },
    body: `grant_type=authorization_code&code=${code}`
  });

  return verifyResponse('POST', response);
}

export const refresh = async (refreshToken: string, clientId: string, secret: string): Promise<any> => {
  return fetch('https://login.eveonline.com/v2/oauth/token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(clientId + ':' + secret).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
      'Host': 'login.eveonline.com'
    },
    body: `grant_type=refresh_token&refresh_token=${refreshToken}`
  });
}

export const revoke = async (accessToken: string, clientId: string, secret: string): Promise<any> => {
  return await fetch(`https://login.eveonline.com/v2/oauth/revoke?token_type_hint=access_token&token=${accessToken}`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(clientId + ':' + secret).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Host': 'login.eveonline.com'
    }
  });
}