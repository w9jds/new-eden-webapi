import {UserAgent} from '../config/config';
import { access } from 'fs';

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

// export const status = (): Promise<any> => {
//     return fetch('https://esi.tech.ccp.is/latest/status/?datasource=tranquility', {
//         method: 'GET',
//         headers
//     }).then(verifyResponse);
// }

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
    return fetch(`https://esi.tech.cpp.is/v1/characters/${id}/titles/`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            ...headers
        }
    }).then(verifyResponse)
}

// export const getCharacterOnline = (character): Promise<any> => {
//     return new Promise((resolve, reject) => {
//         fetch(`https://esi.tech.ccp.is/v2/characters/${character.id}/online/`, {
//             method: 'GET',
//             headers: {
//                 'Authorization': `Bearer ${character.accessToken}`,
//                 ...headers
//             }
//         })
//         .then(verifyResponse)
//         .then(content => {
//             resolve({
//                 id: character.id,
//                 ...content
//             });
//         })
//     }); 
// }

// export const getCharacterLocation = (character): Promise<any> => {
//     return fetch(`https://esi.tech.ccp.is/latest/characters/${character.id}/location/`, {
//         method: 'GET',
//         headers: {
//             'Authorization': `Bearer ${character.accessToken}`,
//             ...headers
//         }
//     })
//     .then(verifyResponse)
//     .then(payload => {
//         return {
//             id: character.id,
//             ...payload
//         };
//     });
// }

// export const getCharacterShip = (character): Promise<any> => {
//     return fetch(`https://esi.tech.ccp.is/latest/characters/${character.id}/ship/`, {
//         method: 'GET',
//         headers: {
//             'Authorization': `Bearer ${character.accessToken}`,
//             ...headers
//         }
//     })
//     .then(verifyResponse)
//     .then(payload => {
//         return {
//             id: character.id,
//             ...payload
//         }
//     });
// }

// export const getUniverse = (): Promise<any> => {
//     return fetch('https://esi.tech.ccp.is/latest/universe/systems/?datasource=tranquility', {
//         method: 'GET',
//         headers
//     }).then(verifyResponse);
// };

export const getCorporation = (id: string): Promise<any> => {
    return fetch(`https://esi.tech.ccp.is/v4/corporations/${id}/`, {
        method: 'GET',
        headers
    }).then(verifyResponse);
}

// export const getSystem = (id: string): Promise<any> => {
//     return fetch(`https://esi.tech.ccp.is/latest/universe/systems/${id}/`, {
//         method: 'GET',
//         headers
//     }).then(verifyResponse);
// }

// export const getRoute = (origin: string | number, destination: string | number, flag: string): Promise<any> => {
//     return fetch(`https://esi.tech.ccp.is/latest/route/${origin}/${destination}/?flag=${flag}`, {
//         method: 'GET',
//         headers
//     }).then(verifyResponse);
// }

// export const getSystemJumps = (): Promise<any> => {
//     return fetch('https://esi.tech.ccp.is/latest/universe/system_jumps/?datasource=tranquility', {
//         method: 'GET',
//         headers
//     }).then(verifyResponse);
// }

// export const getSystemKills = (): Promise<any> => {
//     return fetch('https://esi.tech.ccp.is/latest/universe/system_kills/?datasource=tranquility', {
//         method: 'GET',
//         headers
//     }).then(verifyResponse);
// };

// export const getAffiliations = (ids: string[]): Promise<any> => {
//     return fetch('https://esi.tech.ccp.is/latest/characters/affiliation/?datasource=tranquility', {
//         method: 'POST',
//         body: JSON.stringify(ids),
//         headers: { 
//             'Content-Type': 'application/json',
//             ...headers
//         }
//     }).then(verifyResponse);
// }

// export const setWaypoint = (character: Character, location, setType): Promise<Response> => {    
//     return fetch(`https://esi.tech.ccp.is/latest/ui/autopilot/waypoint/?add_to_beginning=${setType.isFirst}&clear_other_waypoints=${setType.clear}&destination_id=${location.id}`, {
//         method: 'POST',
//         headers: {
//             'Authorization': `Bearer ${character.accessToken}`,
//             ...headers
//         }
//     });
// }

// export const getIds = (names: string[]): Promise<any> => {
//     return fetch('https://esi.tech.ccp.is/v1/universe/ids/', {
//         method: 'POST',
//         body: JSON.stringify(names),
//         headers: {
//             'Content-Type': 'application/json',
//             ...headers
//         }
//     }).then(verifyResponse);
// }

// export const getNames = (ids: string[] | number[]): Promise<any> => {
//     return fetch('https://esi.tech.ccp.is/v2/universe/names/', {
//         method: 'POST',
//         body: JSON.stringify(ids),
//         headers: {
//             'Content-Type': 'application/json',
//             ...headers
//         }
//     }).then(verifyResponse);
// }
