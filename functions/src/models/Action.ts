import {Map} from '../models/Map';
import {User} from '../models/User';
import {System} from '../models/System';
import {Signature} from '../models/Signature';

export interface Action {
    action: string;
    type: string;
    time: number;
    user: User;
    signature?: Signature;
    map?: Map;
    system?: System;
    parent?: System;
}
