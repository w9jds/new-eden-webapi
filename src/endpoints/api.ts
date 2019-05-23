import { Request, ResponseToolkit, ResponseObject } from 'hapi';
import { badRequest } from 'boom';
import { database } from 'firebase-admin';
import { Esi, Character } from 'node-esi-stackdriver';
import { PostBody } from '../../models/routes';

export default class Api {

    constructor(private firebase: database.Database, private esi: Esi) { }

    public waypointHandler = async (request: Request, h: ResponseToolkit): Promise<ResponseObject> => {
        const body = request.payload as PostBody;
        const credentials = request.auth.credentials.user as Character;

        const response = await this.esi.setWaypoint(credentials, body.location, body.setType);
        if (response.status === 204) {
            return h.response().code(204);
        }

        throw badRequest();
    }
}
