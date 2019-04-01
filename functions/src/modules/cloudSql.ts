import { database, EventContext, config } from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as pg from 'pg';

enum EventType {
    CREATE = 'google.firebase.database.ref.create',
    DELETE = 'google.firebase.database.ref.delete',
    UPDATE = 'google.firebase.database.ref.update'
}

export default class CloudSql {
    private pgPool: pg.Pool;

    constructor(private firebase: admin.database.Database) {
        this.pgPool = new pg.Pool({
            max: 1,
            host: `/cloudsql/${config().postgres.connection}`,
            user: config().postgres.user,
            password: config().postgres.password,
            database: config().postgres.database
        })
    }

    private insertMap = `INSERT INTO maps (id, name, owner_id, type) VALUES ($1, $2, $3, $4)`;
    private insertSystem = 'INSERT INTO systems (id, map_id, name, identifier, status) VALUES ($1, $2, $3, $4, $5);';

    private deleteMap = 'DELETE FROM maps WHERE id=$1;';
    private deleteSystem = 'DELETE FROM systems WHERE id=$1 and map_id=$2;';

    public onSystemEvent = async (snapshot: database.DataSnapshot, context?: EventContext) => {
        const map = await this.firebase.ref(`maps/${context.params.mapId}/`).once('value');

        if (!isNaN(Number(snapshot.key))) {
            switch (context.eventType) {
                case EventType.CREATE:
                    return Promise.all([
                        this.onMapCreate(map),
                        this.onSystemCreate(context.params.mapId, snapshot)
                    ]);
                case EventType.DELETE:
                    return this.onSystemDelete(context.params.mapId, snapshot);
            }
        }
    }
    
    private onSystemCreate = async (mapId: string, snapshot: database.DataSnapshot) => {
        await this.pgPool.query(this.insertSystem, [
            snapshot.key, mapId,
            snapshot.child('name').val(),
            snapshot.child('identifier').val(),
            snapshot.child('status').val()
        ]);
    }
    
    private onSystemDelete = async (mapId: string, snapshot: database.DataSnapshot) => {
        await this.pgPool.query(this.deleteSystem, [ snapshot.key, mapId ]);
    }

    public onMapEvent = async(snapshot: database.DataSnapshot, context?: EventContext) => {
        switch (context.eventType) {
            case EventType.CREATE:
                return this.onMapCreate(snapshot);
            case EventType.DELETE:
                return this.onMapDelete(snapshot);
        }
    }
    
    private onMapCreate = async (snapshot: database.DataSnapshot | admin.database.DataSnapshot) => {
        await this.pgPool.query(this.insertMap, [
            snapshot.key,
            snapshot.child('name').val(),
            snapshot.child('owner').val(),
            snapshot.child('type').val()
        ]);
    }

    private onMapDelete = async (snapshot: database.DataSnapshot | admin.database.DataSnapshot) => {
        await this.pgPool.query(this.deleteMap, [ snapshot.key ]);
    }
}