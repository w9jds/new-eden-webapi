
declare module NodeJS {
    interface Global {
        app: import('firebase-admin').app.App;
        firebase: import('firebase-admin').database.Database;
    }
}

declare const app: import('firebase-admin').app.App;
declare const firebase: import('firebase-admin').database.Database;