import {UserAgent} from '../config/config';
import {verifyResponse} from './esi';

let headers = {
    'Accept': 'application/json',
    'User-Agent' : UserAgent
};

export const login = (code: string, clientId: string, secret: string): Promise<any> => {
    return fetch('https://login.eveonline.com/oauth/token', {
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + new Buffer(clientId + ':' + secret).toString('base64'),
            'Host': 'login.eveonline.com',
            'Content-Type': 'application/x-www-form-urlencoded',
            ...headers
        },
        body: `grant_type=authorization_code&code=${code}`
    }).then(verifyResponse);
}

export const verify = (type: string, token: string): Promise<any> => {
    return fetch('https://login.eveonline.com/oauth/verify/', {
        method: 'GET',
        headers: {
            'Authorization': type + ' ' + token,
            'Host': 'login.eveonline.com',
            ...headers
        }
    }).then((response: Response) => {
        if (response.status == 200) {
            return response.json();
        }
        else {
            throw new Error(`Invalid Login: ${response.status} ${response.body}`);
        }
    });
}

export async function refresh(refreshToken: string, clientId: string, secret: string): Promise<any> {
    return fetch('https://login.eveonline.com/oauth/token', {
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + new Buffer(clientId + ':' + secret).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
            'Host': 'login.eveonline.com'
        },
        body: `grant_type=refresh_token&refresh_token=${refreshToken}`
    });
}

export async function revoke(accessToken: string, clientId: string, secret: string): Promise<any> {
    return fetch('https://login.eveonline.com/oauth/revoke', {
        method: 'POST',
        body: JSON.stringify({
            'token_type_hint': 'access_token',
            'token': accessToken
        }),
        headers: {
            'Authorization': `Basic ${new Buffer(clientId + ':' + secret).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Host': 'login.eveonline.com'
        }
    });
}