export function initFirebaseDatabase() {
    const config = {
        apiKey: "AIzaSyDHCdOGIDCKuTAfGjjqqRMczFzpBQF3C-0",
        authDomain: "activity-matcher.firebaseapp.com",
        databaseURL: "https://activity-matcher.firebaseio.com"
    };

    firebase.initializeApp(config);
    return firebase.database();
}