import { EventReference } from './User';

export interface Signature {
    classId?: string;
    distance?: string;
    edited?: EventReference;
    created?: EventReference;
    group: string;
    id: string;
    name: string;
    percentage?: string;
}

