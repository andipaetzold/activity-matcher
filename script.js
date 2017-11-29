import { ActivityLoader } from "./activity-loader.js";
import { fetchToken, getAuthCode } from "./strava-auth.js";
import { getParameterByName } from "./util.js";
import { initMap } from "./map.js";

let map;

mapboxgl.accessToken = 'pk.eyJ1IjoiYW5kaXBhZXR6b2xkIiwiYSI6ImNqOWgyY2F5NjBnNnAyeXBodzByemRsbWoifQ.wW4aCiUFv2PLhGB2S75sNg';


document.addEventListener('DOMContentLoaded', async () => {
    if (getAuthCode()) {
        document.getElementById('auth').parentNode.removeChild(document.getElementById('auth'));

        initMap();

        const loader = new ActivityLoader();
        await loader.loadActivities(await fetchToken());
    }
});