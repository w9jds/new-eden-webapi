import type { Database } from 'firebase-admin';
import type { Esi } from 'node-esi-stackdriver';
import type { RedisClientType } from 'redis';
import type { App } from 'firebase-admin/app';

declare global {
  namespace NodeJS {
    interface Global {
      esi: Esi;
      firebase: Database;
      redis: RedisClientType;
      app: App;
    }
  }
}

export {};
