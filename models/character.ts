export interface Character {
    id: number;
    name: string;
    accountId: string;
    allianceId?: number;
    corpId?: number;
    hash: string;
    sso?: Permissions;
}

export interface Permissions {
    accessToken: string;
    refreshToken: string;
    scope: string;
    expiresAt: number;
}