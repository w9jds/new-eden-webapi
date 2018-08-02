import {UserAgent} from '../config/config';
import fetch, {Response} from 'node-fetch';
import {ErrorResponse, Logger} from 'node-esi-stackdriver';

const logging = new Logger('auth', { projectId: 'new-eden-storage-a5c23' });

let headers = {
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

    await logging.logHttp(method, response, await response.text());
    
    return {
        error: true,
        statusCode: response.status,
        uri: response.url
    }
}

export const login = async (code: string, clientId: string, secret: string): Promise<any | ErrorResponse> => {
    const response = await fetch('https://login.eveonline.com/oauth/token', {
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + new Buffer(clientId + ':' + secret).toString('base64'),
            'Host': 'login.eveonline.com',
            'Content-Type': 'application/x-www-form-urlencoded',
            ...headers
        },
        body: `grant_type=authorization_code&code=${code}`
    });

    return verifyResponse('POST', response);
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

export const refresh = async (refreshToken: string, clientId: string, secret: string): Promise<any> => {
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

export const revoke = async (accessToken: string, clientId: string, secret: string): Promise<any> => {
    return await fetch(`https://login.eveonline.com/oauth/revoke?token_type_hint=access_token&token=${accessToken}`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${new Buffer(clientId + ':' + secret).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Host': 'login.eveonline.com'
        }
    });
}