import fetch from 'node-fetch';
import { decode } from 'jsonwebtoken';
import { config } from 'firebase-functions';
import { UserAgent } from '../config/constants';
import { Verification, TokenPayload } from '../../../models/Auth';

type EveConfig = {
  client_id: string;
  client_secret: string;
}

export const verify = (token: string): Verification => {
  const payload: TokenPayload = decode(token, { 
    json: true 
  });
  
  return {
    characterId: +payload.sub.split(':')[2],
    name: payload.name,
    owner: payload.owner,
    scopes: payload.scp.join(' '),
  };
}

export const refresh = (refreshToken: string): Promise<any> => {
  const eve: EveConfig = config().eve;

  return fetch('https://login.eveonline.com/v2/oauth/token', {
    method: 'POST',
    body: `grant_type=refresh_token&refresh_token=${refreshToken}`,
    headers: {
      'User-Agent': UserAgent,
      'Authorization': 'Basic ' + Buffer.from(eve.client_id + ':' + eve.client_secret).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
      'Host': 'login.eveonline.com'
    }
  });
}


