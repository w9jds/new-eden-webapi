// import {SystemKills} from '../models/kills';
// import {verifyResponse} from './esi';
// import config from '../config/config';

// export const getRedisq = (uniqueId: string): Promise<any> => {
//     return fetch(`https://redisq.zkillboard.com/listen.php?queueID=${uniqueId}`, {
//         method: 'GET',
//         keepalive: true
//     }).then(verifyResponse);
// }


// export const getSystemKills = (systemId: number, filter, value): Promise<SystemKills> => {
//     return fetch(`https://zkillboard.com/api/kills/solarSystemID/${systemId}/${filter}/${value}/`, {
//         method: 'GET',
//         headers: {
//             'X-User-Agent' : config.userAgent,
//             'Accept-Encoding': 'gzip',
//             'Accept': 'application/json; charset=utf-8',
//             'Origin': 'https://partymapper-88d4c.appspot.com/'
//         }
//     }).then((response: Response): Promise<SystemKills> => {
//         if (response.status === 200) {
//             return response.json();
//         }
//     });
// }