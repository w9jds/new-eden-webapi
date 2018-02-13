
export const UserAgent = 'Account Management - Chingy Chonga/Jeremy Shore - w9jds@live.com';

export const AccountsOrigin = 'https://accounts.new-eden.io';

export const EveScopes = [
    'esi-ui.write_waypoint.v1',
    'esi-skills.read_skills.v1',
    'esi-characterstats.read.v1',
    'esi-location.read_online.v1',
    'esi-characters.read_titles.v1',
    'esi-location.read_location.v1',
    'esi-location.read_ship_type.v1',
    'esi-characters.read_contacts.v1',
    'esi-wallet.read_character_wallet.v1',
    'esi-industry.read_character_mining.v1',
    'esi-characters.read_corporation_roles.v1',
    'esi-contracts.read_character_contracts.v1',
    'esi-contracts.read_corporation_contracts.v1',
];

export const DatabaseConfig = {
    apiKey: process.env.DATABASE_API_KEY,
    authDomain: process.env.DATABASE_AUTH_DOMAIN,
    databaseURL: process.env.DATABASE_URL,
    projectId: process.env.PROJECT_ID,
    storageBucket: process.env.DATABASE_STORAGE_BUCKET,
    messagingSenderId: process.env.DATABASE_SENDER_ID
};

export const RegisterClientId = process.env.REGISTER_CLIENT_ID;
export const RegisterSecret = process.env.REGISTER_SECRET;
export const RegisterRedirect = process.env.REGISTER_REDIRECT_URI;

export const LoginClientId = process.env.LOGIN_CLIENT_ID;
export const LoginSecret = process.env.LOGIN_SECRET;
export const LoginRedirect = process.env.LOGIN_REDIRECT_URI

export const ForumClientId = process.env.FORUM_CLIENT_ID;
export const ForumSecret = process.env.FORUM_SECRET;
export const ForumRedirect = process.env.FORUM_REDIRECT_URI;