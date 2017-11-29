import { ActivityLoader } from "./activity-loader.js";
import { fetchToken, getAuthCode } from "./strava-auth.js";
import { getParameterByName } from "./util.js";
import { initMap } from "./map.js";

mapboxgl.accessToken = 'pk.eyJ1IjoiYW5kaXBhZXR6b2xkIiwiYSI6ImNqOWgyY2F5NjBnNnAyeXBodzByemRsbWoifQ.wW4aCiUFv2PLhGB2S75sNg';

document.addEventListener('DOMContentLoaded', async () => {
    initMap();

    if (getAuthCode()) {
        document.getElementById('auth').parentNode.removeChild(document.getElementById('auth'));

        const loader = new ActivityLoader();
        await loader.loadActivities(await fetchToken());
    }
});

window.toggleOverlay = () => {
    const overlay = document.getElementById('overlay');
    const toggle = document.getElementById('overlay-toggle');
    if (overlay.classList.contains('visible')) {
        overlay.classList.remove('visible');
        toggle.classList.remove('btn-primary');
    } else {
        overlay.classList.add('visible');
        toggle.classList.add('btn-primary');
    }
}