import {database, Event} from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as esi from '../../../lib/esi';


export default class UniverseHandler {

    constructor(private firebase: admin.database.Database) { }

}
