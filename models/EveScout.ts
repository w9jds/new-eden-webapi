export type TheraConnection = {
  id: number;
  signatureId: string;
  type: string;
  status: string;
  wormholeMass: string;
  wormholeEol: string;
  wormholeEstimatedEol: string;
  wormholeDestinationSignatureId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string;
  statusUpdatedAt: string;
  createdBy: string;
  createdById: string;
  deletedBy: string;
  deletedById: string;
  wormholeSourceWormholeTypeId: number;
  wormholeDestinationWormholeTypeId: number;
  solarSystemId: number;
  wormholeDestinationSolarSystemId: number;
  sourceWormholeType: {
    id: number;
    name: string;
    src: string;
    dest: string;
    lifetime: number;
    jumpMass: number;
    maxMass: number;
  };
  destinationWormholeType: {
    id: number;
    name: string;
    src: string;
    dest: string;
    lifetime: number;
    jumpMass: number;
    maxMass: number;
  };
  sourceSolarSystem: {
    id: number;
    name: string;
    constellationID: number;
    security: number;
    regionId: number;
    region: {
      id: number;
      name: string;
    };
  };
  destinationSolarSystem: {
    id: number;
    name: string;
    constellationID: number;
    security: number;
    regionId: number;
    region: {
      id: number;
      name: string;
    };
  };
}