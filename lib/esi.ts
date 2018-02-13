import { UserAgent } from '../config/config';
import { Character } from '../models/character';

let headers = {
    'Accept': 'application/json',
    'User-Agent' : UserAgent
};

export const verifyResponse = (response: Response): Promise<any> => {
    if (response.status >= 200 && response.status <= 300) {
        return response.json();
    }
    else if (response.bodyUsed) {
        return response.json().then(error => {           
            return {
                error: true,
                body: response.body,
                statusCode: response.status,
                message: error,
                url: response.url
            };
        });
    }
    else {
        return new Promise((resolve) => {
            resolve({
                error: true,
                statusCode: response.status,
                uri: response.url
            });
        })

    }
}

// export const search = (query: string): Promise<any> => {
//     return fetch(`https://esi.tech.ccp.is/latest/search/?categories=alliance%2Ccharacter%2Ccorporation&datasource=tranquility&language=en-us&search=${query}&strict=false`, {
//         method: 'GET',
//         headers
//     }).then(verifyResponse);
// }

export const getCharacter = (id: string): Promise<any> => {
    return fetch(`https://esi.tech.ccp.is/latest/characters/${id}`, {
        method: 'GET',
        headers
    }).then(verifyResponse);
}

export const getRoles = (id: string, accessToken: string) => {
    return fetch(`https://esi.tech.ccp.is/v2/characters/${id}/roles/`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            ...headers
        }
    }).then(verifyResponse);
}

export const getTitles = (id: string, accessToken: string) => {
    return fetch(`https://esi.tech.ccp.is/v1/characters/${id}/titles/`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            ...headers
        }
    }).then(verifyResponse)
}

export const getRoute = (origin: string | number, destination: string | number, flag: string): Promise<any> => {
    return fetch(`https://esi.tech.ccp.is/latest/route/${origin}/${destination}/?flag=${flag}`, {
        method: 'GET',
        headers
    }).then(verifyResponse);
}

export const setWaypoint = (character: Character, location, setType): Promise<Response> => {    
    return fetch(`https://esi.tech.ccp.is/latest/ui/autopilot/waypoint/?add_to_beginning=${setType.isFirst}&clear_other_waypoints=${setType.clear}&destination_id=${location.id}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${character.sso.accessToken}`,
            ...headers
        }
    });
}
