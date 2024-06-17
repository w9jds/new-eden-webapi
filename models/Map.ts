import { UserAccess } from './User';

export interface Map {
  name: string;
  owner: number;
  top: number;
  type: string;
  connections?: Record<string, SystemConnection>;
  systems?: Record<string, SolarSystem>;
  accessList?: Record<number, UserAccess>;
  alerts?: MapAlert[];
}

export interface SystemConnection {
  created: number;
  eol: boolean;
  eolStart: number;
  saveMass: boolean;
  stayOut: boolean;
  frigate: boolean;
  source: number | string;
  target: number | string;
  type: string;
}

export interface SolarSystem {
  name: string;
  connections: string[];
  identifier: string;
  signature?: string;
  signatures?: string[];
  sourceId: number;
  status: string;
}

export interface MapAlert {
  owner: {
    id: string;
    name: string;
  };
  webhook: string;
  watchlist: {
    systems: number[];
    constellations: number[];
    regions: number[];
  }
}