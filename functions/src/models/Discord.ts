export interface FirebaseGuild {
    allianceId?: number;
    corpId: number;
    defaultChannel: string;
    id: number;
}

export interface PatchGuildMember {
    nick?: string;
    roles?: string[];
    mute?: boolean;
    deaf?: boolean;
    channel_id?: number;
}

export interface AddGuildMember {
    access_token: string;
    nick: string;
    roles: string[];
    mute?: boolean;
    deaf?: boolean;
}

export interface GuildMember {
    user: object;
    nick?: string;
    roles: string[]
    joined_at: string;
    deaf: boolean;
    mute: boolean;
}

export interface DiscordUser {
    id: string;
    username: string;
    discriminator: string;
    avatar?: string;
    bot?: boolean;
    mfa_enabled?: boolean;
    verified?: boolean;
    email?: string;
}

export interface GuildRole {
    id: string;
    name: string;
    color: number;
    hoist: boolean;
    position: number;
    permissions: number;
    managed: boolean;
    mentionable: boolean;
}

export interface Guild {
    id: string;
    name: string;
    icon: string;
    owner: boolean;
    permissions: number;
}