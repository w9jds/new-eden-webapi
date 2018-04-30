import { Request, ResponseToolkit, ResponseObject } from 'hapi';
import { badRequest, internal } from 'boom';
import { database } from 'firebase-admin';
import { Esi } from 'node-esi-stackdriver';
import { Character } from 'node-esi-stackdriver'
import { PostBody } from '../models/routes';

interface RoutesPayload {
    end: string | number,
    start: any[],
    type: string
}

export default class Api {

    constructor(private firebase: database.Database, private esi: Esi) { }

    public waypointHandler = async (request: Request, h: ResponseToolkit): Promise<ResponseObject> => {
        let body = request.payload as PostBody;
        let credentials = request.auth.credentials as Character;
    
        let response = await this.esi.setWaypoint(credentials, body.location, body.setType);
        if (response.status === 204) {
            return h.response().code(204);
        }

        throw badRequest();
    }

    public loggingHandler = async (request: Request, h: ResponseToolkit): Promise<ResponseObject> => {
        let log = request.payload;
        let credentials = request.auth.credentials as Character;

        

        return h.response().code(204);
    }

    public routesHandler = async (request: Request, h: ResponseToolkit) => {
        let body = request.payload as RoutesPayload;
        let starts = {}, finished = {}, uniqueIds = [], systems = new Map();

        try {
            if (body.start && body.end) {
                let routes = await Promise.all(
                    body.start.map((start: string | number) => this.esi.getRoute(start, body.end, body.type))
                );

                routes.forEach((route: any[], index: number) => {
                    route.forEach(id => {
                        if (uniqueIds.indexOf(id) < 0) {
                            uniqueIds.push(id);
                        }

                        starts[body.start[index]] = route;
                    });
                });

                let metadata = await Promise.all(
                    uniqueIds.map(systemId => this.firebase
                        .ref(`universe/systems/k_space/${systemId}`).once('value'))
                );

                metadata.forEach((system: database.DataSnapshot) => {
                    systems.set(system.key, system.val());
                });

                Object.keys(starts).forEach(key => {
                    let route = starts[key].map(id => {
                        return systems.get(id.toString());
                    });
        
                    if (route[route.length - 1].id != body.end) {
                        route.reverse();
                    }
        
                    finished[route[0].name] = route;
                });

                return finished;
            }
            else {
                return badRequest('Invalid request. Requires a "end" system, and an array of "start" systems');
            }
        }
        catch(error) {
            return internal();
        }
    }
}
