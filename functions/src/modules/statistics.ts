import {database, EventContext} from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as bigquery from '@google-cloud/bigquery';
import {getCharacter, getRoles, getTitles} from '../../../lib/esi';
import {User} from '../models/User';
import {Signature} from '../models/Signature';
import {Map} from '../models/Map';
import { System } from '../models/System';

interface Action {
    action: string;
    type: string;
    time: number;
    user: User;
    signature?: Signature;
    map?: Map;
    system?: System;
    parent?: System;
}

export default class StatisticsHandlers {
    constructor(private firebase: admin.database.Database) { }

    public onNewAction = (snapshot: database.DataSnapshot, context?: EventContext) => {
        let action = snapshot.val() as Action;

        
    };
}
