let map;
let layers = new Map();

const AUTH_URL = `https://www.strava.com/oauth/token`;
mapboxgl.accessToken = 'pk.eyJ1IjoiYW5kaXBhZXR6b2xkIiwiYSI6ImNqOWgyY2F5NjBnNnAyeXBodzByemRsbWoifQ.wW4aCiUFv2PLhGB2S75sNg';

const CLIENT_ID = 21035;
const CLIENT_SECRET = 'e0006d0074d5628466f4aca55b6e83ba4fe4b9df';

function getParameterByName(name) {
    const url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    let regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
    results = regex.exec(url);

    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function getAuthCode() {
    return getParameterByName('code');
}

function fetchAccessToken() {
    const formData = new FormData();
    formData.append('client_id', CLIENT_ID);
    formData.append('client_secret', CLIENT_SECRET);
    formData.append('code', getAuthCode());

    fetch(AUTH_URL, { method: 'POST', body: formData })
        .then(response => response.json())
        .then(response => this.loggedIn(response.access_token));    
}

function loggedIn(access_token) {
    const ACTIVITIES_URI = `https://www.strava.com/api/v3/athlete/activities?access_token=${access_token}`
    fetch (ACTIVITIES_URI)
        .then(response => response.json())
        .then(activities => {
            activities.forEach(activity => addActivity(activity));    
        });
}

function addActivity(activity) {
    const coordinates = polyline.decode(activity.map.summary_polyline).map(coord => [coord[1], coord[0]]);
    map.addLayer({
        "id": `activity-${activity.id}`,
        "type": "line",
        "source": {
            "type": "geojson",
            "data": {
                "type": "Feature",
                "properties": {},
                "geometry": {
                    "type": "LineString",
                    "coordinates": coordinates
                }
            }
        },
        "layout": {
            "line-join": "round",
            "line-cap": "round",
            "visibility": "none"
        },
        "paint": {
            "line-color": "red",
            "line-width": 3
        }
    });

    const item = document.createElement('li');
    item.classList.add('list-group-item');
    
    const div = document.createElement('div');
    div.classList.add('form-check');
    item.appendChild(div);

    const label = document.createElement('label');
    div.appendChild(label);
    label.classList.add('form-check-label');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.classList.add('form-check-input');
    label.appendChild(checkbox);
    checkbox.addEventListener('click', () => {
        if (checkbox.checked) {
            map.setLayoutProperty(`activity-${activity.id}`, 'visibility', 'visible');
            layers.set(`activity-${activity.id}`, coordinates);
        } else {
            map.setLayoutProperty(`activity-${activity.id}`, 'visibility', 'none');
            layers.delete(`activity-${activity.id}`);
        }
        fitToBounds();
    });

    const text = `${new Date(activity.start_date).toLocaleDateString()} | ${Math.floor(activity.distance / 1000)}km | ${Math.floor(activity.elapsed_time / 60)}min`;
    const textNode = document.createTextNode(text);
    label.appendChild(textNode);

    document.getElementById('activity-list').appendChild(item);
}

function fitToBounds() {
    const coordinates = [];
    for (let layer of layers) {
        coordinates.push(...layer[1]);
    }

    const bounds = coordinates.reduce((bounds, coord) => bounds.extend(coord), new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
    map.fitBounds(bounds, {
        padding: 20
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (getAuthCode()) {
        document.getElementById('auth').parentNode.removeChild(document.getElementById('auth'));
        fetchAccessToken();

        map = new mapboxgl.Map({
            container: document.getElementById('map'),
            style: 'mapbox://styles/mapbox/streets-v9'
        });
    }
});