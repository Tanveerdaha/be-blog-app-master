import admin from 'firebase-admin';

let initialized = false;

const initFirebaseAdmin = () => {
    if (initialized || admin.apps.length > 0) {
        initialized = true;
        return;
    }

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    } else {
        admin.initializeApp({
            projectId: process.env.FIREBASE_PROJECT_ID || 'tech-blog-35852',
        });
    }

    initialized = true;
};

export const verifyFirebaseIdToken = async (idToken) => {
    initFirebaseAdmin();
    return admin.auth().verifyIdToken(idToken);
};
