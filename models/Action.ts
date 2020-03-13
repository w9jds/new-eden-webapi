import { Map } from './Map';
import { User } from './User';
import { System } from './System';
import { Signature } from './Signature';

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
