
declare module NodeJS {
    interface Global {
        app: import('firebase-admin').app.App;
        esi: import('node-esi-stackdriver').Esi;
        firebase: import('firebase-admin').database.Database;
    }
}

declare const app: import('firebase-admin').app.App;
declare const esi: import('node-esi-stackdriver').Esi;
declare const firebase: import('firebase-admin').database.Database;