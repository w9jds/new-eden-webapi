import { Character } from "./character";

export interface Payload {
    iss: string;
    sub: string;
    aud: string;
    mainId: string | number;
    accountId?: string | number;
}

export interface State extends Payload {
    type?: string;
    redirect?: string;
}