// import * as sinon from 'sinon';
// import * as admin from 'firebase-admin';
// import { Esi } from 'node-esi-stackdriver';
// import AccessLists from './accesslists';

// const test = require('firebase-functions-test')();

// describe('Access Lists', () => {
//   let functions, initEsi, initAdmin;

//   before(() => {
//     initEsi = sinon.stub(Esi);
//     initAdmin = sinon.stub(admin, 'initializeApp').returns({
//       name: '',
//       options: {},
//       auth: sinon.stub(),
//       delete: sinon.stub(),
//       storage: sinon.stub(),
//       database: sinon.stub(),
//       messaging: sinon.stub(), 
//       firestore: sinon.stub(),
//       instanceId: sinon.stub(), 
//       remoteConfig: sinon.stub(),
//       securityRules: sinon.stub(),
//       machineLearning: sinon.stub(), 
//       projectManagement: sinon.stub(),
//     });
    
//     // global.app = admin.initializeApp();
//     // global.firebase = app.database();

//     // functions = new AccessLists();
//   });

//   after(() => {
//     initAdmin.restore();
//     // initEsi.restore();
//     test.cleanup();
//   });

//   it('onAccessGroupCreated', () => {


//     return true;
//   });
// });

