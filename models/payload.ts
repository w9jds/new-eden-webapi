import { Character } from "./character";

export interface Payload {
    id: number;
    name: string;
    accountId: string;
    firebase_token: string;
}