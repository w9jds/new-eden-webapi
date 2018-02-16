import { Request, ResponseToolkit, ResponseObject } from 'hapi';
import { badRequest } from 'boom';
import { database } from 'firebase-admin';
import { setWaypoint } from '../lib/esi';
import { Character } from '../models/character';
import { PostBody } from '../models/routes';

export default class Api {

    constructor(private firebase: database.Database) { }

    public waypointHandler = async (request: Request, h: ResponseToolkit): Promise<ResponseObject> => {
        let body = request.payload as PostBody;
        let credentials = request.auth.credentials as Character;
    
        let response = await setWaypoint(credentials, body.location, body.setType);
        if (response.status === 204) {
            return h.response({ success: true });
        }

        throw badRequest();
    }

    public routesHandler = (request: Request, h: ResponseToolkit) => {

    }
}
