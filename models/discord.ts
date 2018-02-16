export interface Tokens {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
}

export interface User {
    id: string;
    username: string;
    discriminator: string;
    avatar?: string;
    bot?: boolean;
    mfa_enabled?: boolean; // whether the user has two factor enabled on their account
    verified?: boolean; // whether the email on this account has been verified
    email?: boolean; // the user's email
}