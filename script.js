import { ActivityLoader } from "./activity-loader.js";
import { fetchToken, getAuthCode } from "./strava-auth.js";
import { getParameterByName } from "./util.js";
import { initMap } from "./map.js";
import { hideLoading } from "./loading.js";

mapboxgl.accessToken = 'pk.eyJ1IjoiYW5kaXBhZXR6b2xkIiwiYSI6ImNqOWgyY2F5NjBnNnAyeXBodzByemRsbWoifQ.wW4aCiUFv2PLhGB2S75sNg';

document.addEventListener('DOMContentLoaded', async () => {
    initMap();

    if (getAuthCode()) {
        document.getElementById('activities-toggle').addEventListener('click', () => toggleOverlay());

        document.getElementById('auth').parentNode.removeChild(document.getElementById('auth'));
        const loader = new ActivityLoader(await fetchToken());
        await loader.loadActivities();

        document.getElementById('options-circles-around-points').addEventListener('change', () => loader.updateMap());
        document.getElementById('options-fit-to-bounds').addEventListener('change', () => loader.updateMap());
        document.getElementById('options-distance-similarity').addEventListener('input', () => loader.updateMap());
        document.getElementById('options-calculate-laps').addEventListener('change', () => loader.updateMap());
        document.getElementById('options-calculate-similar-activities').addEventListener('change', () => loader.updateMap());
        document.getElementById('options-coordinate-quality').addEventListener('change', () => loader.updateMap());

    } else {
        document.getElementById('options').style.display = 'none';
    }

    hideLoading();
});

function toggleOverlay() {
    const overlay = document.getElementById('activities');
    const toggle = document.getElementById('activities-toggle');
    if (overlay.classList.contains('visible')) {
        overlay.classList.remove('visible');
        toggle.classList.remove('btn-primary');
    } else {
        overlay.classList.add('visible');
        toggle.classList.add('btn-primary');
    }
}
