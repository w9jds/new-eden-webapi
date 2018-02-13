import * as moment from 'moment';
import * as jwt from 'jsonwebtoken';

import { database, auth } from 'firebase-admin';
import { internal, badRequest, unauthorized } from 'boom';
import { Request, ResponseToolkit } from 'hapi';
import { setWaypoint } from '../lib/esi';
import { Character } from '../models/character';
import { PostBody } from '../models/routes';

export default class Api {

    constructor(private firebase: database.Database) { }

    public waypointHandler = (request: Request, h: ResponseToolkit) => {
        let body = request.payload as PostBody;
        let credentials = request.auth.credentials as Character;
    
        setWaypoint(credentials, body.location, body.setType).then(response => {
            if (response.status === 204) {
                return h.response({ success: true });
            }
            else {
                throw badRequest();
            }
        });
    }

    public routesHandler = (request: Request, h: ResponseToolkit) => {

    }
}
