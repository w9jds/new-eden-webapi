// import * as moment from 'moment';
// import {Request, ReplyNoContinue} from 'hapi';
// import * as CryptoJs from 'crypto-js';

// import {LoginClientId, LoginRedirect} from '../config/config';
// import * as queryString from 'query-string';
// import * as atob from 'atob';
// import * as btoa from 'btoa';

// export default class Discourse {

//     constructor() { }

//     public loginHandler = (request: Request, reply: ReplyNoContinue): void => {
//         this.states[request.query.sig] = queryString.parse(atob(request.query.sso));
//         let hash = CryptoJs.HmacSHA256(request.query.sso, this.secret);

//         if (hash.toString() == request.query.sig) {
//             reply.redirect(`https://login.eveonline.com/oauth/authorize/?response_type=code&redirect_uri=${this.redirect}&client_id=${this.clientId}&state=${request.query.sig}`);
//         }
//         else {
//             reply({}).code(401);
//         } 
//     }

//     public callbackHandler = (request: Request, reply: ReplyNoContinue): void => {
//         this.verify(request, reply, request.query.state);
//     }

//     private verify = (request: Request, reply: ReplyNoContinue, state: string): void => {
//         auth.loginCharacter(request.query.code, this.clientId, this.secret).then(data => {
//             let sso = this.states[state];
//             let query = {
//                 email: `${data.verification.CharacterID}@gmail.com`,
//                 nonce: sso.nonce,
//                 external_id: data.verification.CharacterID,
//                 username: data.character.name.replace(' ', '_'),
//                 name: data.character.name,
//                 avatar_url: `https://imageserver.eveonline.com/Character/${data.verification.CharacterID}_256.jpg`
//             };

//             delete this.states[state];
//             if (data.character.alliance_id == 99006117) {
//                 let payload = btoa(queryString.stringify(query));
//                 let sig = CryptoJs.HmacSHA256(payload, this.secret).toString();
    
//                 reply.redirect(`${sso.return_sso_url}?sso=${payload}&sig=${sig}`);
//             }
//             else {
//                 reply.redirect(sso.return_sso_url).code(403);
//             }
//         }).catch(error => {
//             reply(error).code(403);
//         });
//     }
// }
