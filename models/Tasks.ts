
export type ScheduledTask = {
  name: string;
  scheduleTime: string;
}

export enum AccessChangeTypes {
  LEAVE = 'leave',
  LOCATION = 'location',
}

export type AccessListChange = {
  type: AccessChangeTypes;
  mapId: string;
  value?: boolean;
}