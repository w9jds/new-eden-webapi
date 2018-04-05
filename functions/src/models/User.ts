export interface User {
    id: number;
    corpId?: number;
    allianceId?: number;
    name: string;
}

export interface EventReference extends User {
    time: number;
}