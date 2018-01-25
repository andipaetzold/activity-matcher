import * as firebase from 'firebase/app';
import 'firebase/firestore';

export function initFirestore() {
    const config = {
        apiKey: "AIzaSyDHCdOGIDCKuTAfGjjqqRMczFzpBQF3C-0",
        authDomain: "activity-matcher.firebaseapp.com",
        projectId: "activity-matcher"
    };

    firebase.initializeApp(config);
    firebase.firestore().enablePersistence();
    return firebase.firestore();
}
