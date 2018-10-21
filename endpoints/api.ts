import { Request, ResponseToolkit, ResponseObject } from 'hapi';
import { badRequest, internal } from 'boom';
import { database } from 'firebase-admin';
import { Esi, ErrorResponse, Reference, Character, Order } from 'node-esi-stackdriver';
import { PostBody } from '../models/routes';

interface RoutesPayload {
    end: string | number,
    start: any[],
    type: string
}

interface MarketOrder extends Order {
    system_name?: string;
}

export default class Api {

    constructor(private firebase: database.Database, private esi: Esi) { }

    public waypointHandler = async (request: Request, h: ResponseToolkit): Promise<ResponseObject> => {
        const body = request.payload as PostBody;
        const credentials = request.auth.credentials as Character;

        const response = await this.esi.setWaypoint(credentials, body.location, body.setType);
        if (response.status === 204) {
            return h.response().code(204);
        }

        throw badRequest();
    }

    public routesHandler = async (request: Request, h: ResponseToolkit) => {
        const body = request.payload as RoutesPayload;
        const starts = {}, finished = {}, uniqueIds = [], systems = new Map();

        try {
            if (body.start && body.end) {
                const routes = await Promise.all(
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

                const metadata = await Promise.all(
                    uniqueIds.map(systemId => this.firebase
                        .ref(`universe/systems/k_space/${systemId}`).once('value'))
                );

                for (const system of metadata) {
                    systems.set(system.key, system.val());
                }

                for (const key in starts) {
                    const route = starts[key].map(id => systems.get(id.toString()));

                    if (route[route.length - 1].id !== body.end) {
                        route.reverse();
                    }

                    finished[route[0].name] = route;
                }

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

    public regionOrdersHandler = async (request: Request, h: ResponseToolkit) => {
        const response = await this.esi.getRegionOrders(request.params.regionId, request.params.typeId);

        if (response instanceof Array) {
            const orders = await this.populateSystemNames(response);
            return h.response(orders);
        }

        throw badRequest('ErrorResponse', response);
    }

    private populateSystemNames = async (orders: MarketOrder[]): Promise<MarketOrder[] | ErrorResponse> => {
        const ids: number[] = [];

        for (const order of orders) {
            if (ids.indexOf(order.system_id) < 0) {
                ids.push(order.system_id);
            }
        }

        const names = await this.esi.getNames(ids);

        if (names instanceof Array) {
            const map = names.reduce((end, name: Reference) => {
                return end[name.id] = name, end
            }, {});

            for (const order of orders) {
                if (map[order.system_id]) {
                    order.system_name = map[order.system_id].name;
                }
            }

            return orders;
        }

        throw badRequest('ErrorResponse', names);
    }
}
