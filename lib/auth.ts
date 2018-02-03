import * as esi from './esi';
import {UserAgent, EveClientId, EveSecret} from '../config/config';
import {verifyResponse} from './esi';

let headers = {
    'Accept': 'application/json',
    'User-Agent' : UserAgent
};

export const login = (code: string): Promise<any> => {
    return fetch('https://login.eveonline.com/oauth/token', {
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + new Buffer(EveClientId + ':' + EveSecret).toString('base64'),
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

export const refresh = (refreshToken: string): Promise<any> => {
    return fetch('https://login.eveonline.com/oauth/token', {
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + new Buffer(EveClientId + ':' + EveSecret).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
            'Host': 'login.eveonline.com'
        },
        body: `grant_type=refresh_token&refresh_token=${refreshToken}`
    });
}