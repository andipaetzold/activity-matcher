export function initFirestore() {
    const config = {
        apiKey: "AIzaSyDHCdOGIDCKuTAfGjjqqRMczFzpBQF3C-0",
        authDomain: "activity-matcher.firebaseapp.com",
        projectId: "activity-matcher"
    };

    firebase.initializeApp(config);
    return firebase.firestore();
}
