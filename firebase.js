export function initFirebaseDatabase() {
    const config = {
        apiKey: "AIzaSyDHCdOGIDCKuTAfGjjqqRMczFzpBQF3C-0",
        authDomain: "activity-matcher.firebaseapp.com",
        databaseURL: "https://activity-matcher.firebaseio.com"
    };

    firebase.initializeApp(config);
    return firebase.database();
}

export async function nodeExists(database, path) {
    return new Promise((resolve, reject) => {
        database.ref(path).once('value').then(snapshot => {
            if (snapshot.val()) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
}