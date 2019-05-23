export interface User {
    id: number;
    corpId?: number;
    allianceId?: number;
    name: string;
}


export interface UserAccess {
    read: boolean;
    write: boolean;
    name?: string;
    type: 'character' | 'corporation' | 'alliance';
}

export interface CharacterRoles {
    roles?: string[];
    roles_at_hq?: string[];
    roles_at_other?: string[];
}

export interface Account {
    errors: boolean;
    id: string;
    mainId: number;
    name: string;
}

export interface DiscordAccount {
    id: string;
    accountId: string;
    username: string
    discriminator?: string;
    verified: boolean;
    avatar?: string;
    email?: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    tokenType: string;
    scope: string;
}

export interface EventReference extends User {
    time: number;
}