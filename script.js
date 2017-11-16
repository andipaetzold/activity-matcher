import { ActivityLoader } from "./activity-loader.js";
import { StravaAuth } from "./strava-auth.js";
import { getParameterByName } from "./util.js";

let map;

mapboxgl.accessToken = 'pk.eyJ1IjoiYW5kaXBhZXR6b2xkIiwiYSI6ImNqOWgyY2F5NjBnNnAyeXBodzByemRsbWoifQ.wW4aCiUFv2PLhGB2S75sNg';


document.addEventListener('DOMContentLoaded', async () => {
    if (StravaAuth.getAuthCode()) {
        document.getElementById('auth').parentNode.removeChild(document.getElementById('auth'));
        
        map = new mapboxgl.Map({
            container: document.getElementById('map'),
            style: 'mapbox://styles/mapbox/streets-v9'
        });
        const loader = new ActivityLoader(map);

        const access_token = await StravaAuth.fetchAccessToken();
        await loader.loadActivities(access_token);
    }
});