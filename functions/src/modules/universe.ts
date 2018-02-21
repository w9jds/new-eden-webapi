import {database, Event} from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as esi from '../../../lib/esi';


export default class UniverseHandler {

    constructor(private firebase: admin.database.Database) { }

    public onSystemStatsUpdate = database.ref('universe/systems/k_space/{systemId}/statistics').onUpdate((event: Event<database.DeltaSnapshot>) => {
        let data = event.data.val();

        // return firebase.ref('universe/routes')
    });

    public onNewRoute = async (event: Event<database.DeltaSnapshot>) => {
        let hubs = {}, destinations = [30000142, 30002510, 30002187, 30002053, 30002659, 30003794];
        let uniqueIds = [];
        let routes: any[] = await Promise.all(
            destinations.map(hubId => {
                return esi.getRoute(hubId, event.params.systemId, 'shortest')
            })
        );

        routes.forEach((route: any, index: number) => {
            hubs[destinations[index]] = route;

            route.forEach(id => {
                if (uniqueIds.indexOf(id) < 0) {
                    uniqueIds.push(id);
                }
            });
        });

        let snapshots: admin.database.DataSnapshot[] = await Promise.all(
            uniqueIds.map(systemId => this.firebase.ref(`universe/systems/k_space/${systemId}`).once('value'))
        );

        console.info('received system information');

        let systems = snapshots.reduce((end, system) => {
            end[system.key] = system.val();
            return end;
        }, {});

        Object.keys(hubs).forEach(key => {
            let route = hubs[key].map(id => {
                return systems[id];
            });

            if (route[route.length - 1].id == event.params.systemId) {
                route.reverse();
            }

            hubs[key] = {
                shortest: route
            };
        });

        event.data.ref.parent.set({ hubs: hubs });
        console.info('stored hub routes.');
        
        return;
    }
}
