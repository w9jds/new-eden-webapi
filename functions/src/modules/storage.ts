import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as gcs from '@google-cloud/storage';

export default class StorageHandlers {

    constructor(private storage: admin.storage.Storage) { }

    public saveLocation = functions.storage.bucket('backgrounds').object().onChange((event) => {
        //   const object = event.data;
        //   const bucket = 
    });


    // exports fileUploaded = functions.storage.object().onChange(event => {

    //     const object = event.data; 
    //     const bucket = gcs.bucket(object.bucket);
    //     const signedUrlConfig = { action: 'read', expires: '03-17-2025' };
    
    //     var fileURLs = [];
    //     const folderPath = "a/path/you/want/its/folder/size/calculated";
    
    //     bucket.getFiles({ prefix: folderPath }, function(err, files) {
    
    //         files.forEach(function(file) {
    //             file.getSignedUrl(config, function(err, fileURL) {
    //             console.log(fileURL);
    //             fileURLs.push(fileURL);
    //             });
    //         });
    
    //     });
    // });
}
