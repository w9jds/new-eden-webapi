import { JwtPayload } from "jsonwebtoken";

export type TokenPayload = JwtPayload & {
  scp?: string[];
  kid?: string;
  azp?: string;
  tenant?: string;
  tier?: string;
  region?: string;
  name?: string;
  owner?: string;
}

export type Verification = {
  characterId: number | string;
  owner: string;
  name: string;
  scopes: string;
}

export type EveTokens = {
  access_token: string;
  expires_in: number;
  token_type: string;
  refresh_token: string;
}