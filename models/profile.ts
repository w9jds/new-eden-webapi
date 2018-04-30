import { Character } from "node-esi-stackdriver";

export interface Profile {
    id: number;
    name: string;
    characters: Character[];
    mainId: number;
    email?: string;
}