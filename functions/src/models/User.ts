export interface User {
    id: number;
    corpId?: number;
    allianceId?: number;
    name: string;
}

export interface Account {
    errors: boolean;
    id: string;
    mainId: number;
    name: string;
}

export interface DiscordAccount {
    accessToken: string;
    accountId: string;
    email?: string;
    expiresAt: number;
    id: string;
    refreshToken: string;
    scope: string;
    tokenType: string;
    username: string;
}

export interface EventReference extends User {
    time: number;
}