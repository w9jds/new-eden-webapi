import { Character } from "./character";

export interface Profile {
    id: number;
    name: string;
    characters: Character[];
    mainId: number;
    email?: string;
}