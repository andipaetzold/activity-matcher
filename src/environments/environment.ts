import { FirebaseAppConfig } from 'angularfire2';

export const environment = {
    production: false,
    firebase: <FirebaseAppConfig>{
        apiKey: 'AIzaSyDHCdOGIDCKuTAfGjjqqRMczFzpBQF3C',
        storageBucket: 'activity-matcher.appspot.com',
        projectId: 'activity-matcher',
    },
    strava: {
        clientId: '21035',
        clientSecret: 'e0006d0074d5628466f4aca55b6e83ba4fe4b9df',
        redirectUri: 'https://localhost:4200'
    },
    mapbox: {
        accessToken: 'pk.eyJ1IjoiYW5kaXBhZXR6b2xkIiwiYSI6ImNqOWgyY2F5NjBnNnAyeXBodzByemRsbWoifQ.wW4aCiUFv2PLhGB2S75sNg',
    },
    googleMaps: {
        key: 'AIzaSyB-fdWUHhDXoXikdPm5puhS0QD-j6HBWSo',
    },
};
