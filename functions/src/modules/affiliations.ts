// import { database } from 'firebase-admin';
// import { parse, differenceInCalendarDays } from 'date-fns';
// import { Roles, Title, Affiliation, ErrorResponse, CorporationHistory } from 'node-esi-stackdriver';

// export const updateAffiliations = async (snapshot: database.DataSnapshot): Promise<void> => {
//   const promises: Promise<ErrorResponse | Affiliation[]>[] = [];
//   let characters: database.DataSnapshot[] = [];
//   let characterIds: string[] = Object.keys(snapshot.val());
//   let affiliations = [];

//   while (characterIds.length > 0) {
//     let partial = characterIds.slice(0, 500);

//     promises.push(esi.getAffiliations(partial));
//     characterIds = characterIds.slice(500);
//   }

//   const results = await Promise.all(promises);

//   for (let result of results) {
//     if (result instanceof Array) {
//       affiliations = affiliations.concat(result);
//     }
//   }

//   snapshot.forEach(snapshot => {
//     characters.push(snapshot)
//   });

//   await map(affiliations, updateAffiliation, concurrency);
//   await map(characters, getCharacterDetails, concurrency);

//   return;
// }

// const updateAffiliation = (affiliation: Affiliation) =>
//   firebase.ref(`characters/${affiliation.character_id}`).update({
//     corpId: affiliation.corporation_id,
//     allianceId: affiliation.alliance_id ? affiliation.alliance_id : null
//   });

// const getCharacterDetails = async (character: database.DataSnapshot) => {
//   if (!character.hasChild('sso')) {
//     return await character.ref.update({
//       roles: null,
//       titles: null,
//       isNewbro: null
//     });
//   }

//   const scopes: string[] = character.hasChild('sso/scope') ?
//     character.child('sso/scope').val().split(' ') : [];

//   let rolePosition, titlePosition;
//   let requests: Promise<any>[] = [
//     esi.getCharacterHistory(character.key, character.child(`sso/accessToken`).val())
//   ];

//   if (scopes.indexOf('esi-characters.read_corporation_roles.v1')) {
//     rolePosition = requests.push(esi.getCharacterRoles(character.key, character.child(`sso/accessToken`).val())) - 1;
//   } else {
//     character.child('roles').ref.remove();
//   }

//   if (scopes.indexOf('esi-characters.read_titles.v1')) {
//     titlePosition = requests.push(esi.getCharacterTitles(character.key, character.child(`sso/accessToken`).val())) - 1;
//   } else {
//     character.child('titles').ref.remove();
//   }

//   const response = await Promise.all(requests).catch(error => console.log(error));

//   if (response) {
//     const history: CorporationHistory[] | ErrorResponse = response[0];
//     const roles: Roles | ErrorResponse = rolePosition ? response[rolePosition] : null;
//     const titles: Title[] | ErrorResponse = titlePosition ? response[titlePosition] : null;
//     let updates = {};

//     if (roles && !('error' in roles)) {
//       updates['roles'] = {
//         roles: roles.roles.length > 0 ? roles.roles : null,
//         roles_at_base: roles.roles_at_base.length > 0 ? roles.roles_at_base : null,
//         roles_at_hq: roles.roles_at_hq.length > 0 ? roles.roles_at_hq : null,
//         roles_at_other: roles.roles_at_other.length > 0 ? roles.roles_at_other : null
//       }
//     }

//     if (titles && !('error' in titles)) {
//       await character.child('titles').ref.set(titles.reduce((current, title) => {
//         current[title.title_id] = title.name
//         return current;
//       }, {}));
//     }

//     if (history && !('error' in history)) {
//       updates['memberFor'] = calculateMembership(character, history);
//     }

//     await character.ref.update(updates);
//   }
// }

// const calculateMembership = (character: database.DataSnapshot, history: CorporationHistory[]) => {
//   const corporations: Record<string, CorporationHistory> = history.reduce((current, item) => {
//     current[item.corporation_id] = item;
//     return current;
//   }, {});

//   const current = corporations[character.child('corpId').val()];
//   if (current) {
//     const joined = parse(current.start_date, "yyyy-MM-dd'T'HH:mm:ss'Z'", Date.now());

//     return differenceInCalendarDays(Date.now(), joined);
//   }

//   return null;
// }