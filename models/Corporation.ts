import { User, CharacterRoles } from './User';

export type CorporationConfig = {
  isRecruitmentOpen: boolean;
  enforceScopes: boolean;
  scopes: string[];
};

export type MemberAccount = {
  id: string;
  mainId: number;
  discord?: {
    username: string;
    discriminator?: string;
  };
  characters: Record<number, User & {
    roles?: CharacterRoles;
    titles?: string[];
  }>;
}
