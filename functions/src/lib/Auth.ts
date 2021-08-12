import { config } from 'firebase-functions';
import fetch, { Response } from 'node-fetch';
import { UserAgent } from '../config/constants';

type EveConfig = {
  client_id: string;
  client_secret: string;
}

export const verify = async (type: string, token: string): Promise<any> => {
  const response: Response = await fetch('https://login.eveonline.com/oauth/verify/', {
    method: 'GET',
    headers: {
      'Authorization': type + ' ' + token,
      'Host': 'login.eveonline.com',
      'Accept': 'application/json',
      'User-Agent': UserAgent,
    }
  });

  if (response.status === 200) {
    return response.json();
  }
  else {
    throw new Error(`Invalid Login: ${response.status} ${response.body}`);
  }
}

export const refresh = (refreshToken: string): Promise<any> => {
  const eve: EveConfig = config().eve;

  return fetch('https://login.eveonline.com/oauth/token', {
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
