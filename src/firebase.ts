const admin = require('firebase-admin');
const serviceAccount = require('../metting-82f44-firebase-adminsdk-8e1a5-a09d59fde9.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

export const sendFCM = (message: any) => {
    admin.messaging().send(message);
}

export const sendMultiFCM = (message: any) => {
    admin.messaging().sendMulticast(message);
}