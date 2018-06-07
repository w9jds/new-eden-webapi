export interface Payload {
    iss: string;
    sub: string;
    aud: string;
    mainId: string | number;
    scopes?: string[];
    accountId?: string | number;
}

export interface State extends Payload {
    response_type?: string;
    type?: string;
    redirect?: string;
}