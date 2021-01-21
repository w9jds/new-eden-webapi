export type EventPayload = {
  type: string;
  action: string;
  user: {
    id: string;
    name: string;
  };
  map?: {
    id: string;
    name: string;
    owner: number;
    type: string;
  };
  system?: {
    id: string;
    name: string;
    status: string;
  };
}