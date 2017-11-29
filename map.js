let map;

let id = 1;
let layers = [];

export function initMap() {
    map = new mapboxgl.Map({
        container: document.getElementById('map'),
        style: 'mapbox://styles/mapbox/streets-v9'
    });
}

export function clearMap() {
    for (let id of layers) {
        map.removeLayer(`layer-${id}`);
        map.removeSource(`layer-${id}`);
    }
    layers = [];
}

export function addLineLayer(coordinates, color, width) {
    layers.push(id);
    map.addLayer({
        "id": `layer-${id}`,
        "type": "line",
        "source": {
            "type": "geojson",
            "data": turf.lineString(coordinates),
        },
        "layout": {
            "line-join": "round",
            "line-cap": "round"
        },
        "paint": {
            "line-color": color,
            "line-width": width | 1
        }
    });
    ++id;
}

export function addMultipleLineLayer(coordinates, color, width) {
    layers.push(id);
    map.addLayer({
        "id": `layer-${id}`,
        "type": "line",
        "source": {
            "type": "geojson",
            "data": turf.featureCollection(coordinates.map(route => turf.lineString(route))),
        },
        "layout": {
            "line-join": "round",
            "line-cap": "round"
        },
        "paint": {
            "line-color": color,
            "line-width": width | 1
        }
    });
    ++id;
}

export function addPointLayer(coordinates, color, radius) {
    layers.push(id);
    map.addLayer({
        "id": `layer-${id}`,
        "type": "circle",
        "source": {
            "type": "geojson",
            "data": turf.point(coordinates),
        },
        "paint": {
            "circle-color": color,
            "circle-radius": radius | 5
        }
    });
    ++id;
}

export function fitToBounds() {
    if (layers.length == 0) {
        return;
    }

    const coordinates = [];
    for (let id of layers) {
        const data = map.getSource(`layer-${id}`)._data;
        if (data.type == 'Feature') {
            coordinates.push(...data.geometry.coordinates);
        } else {
            for (let feature of data.features) {
                coordinates.push(...feature.geometry.coordinates);
            }
        }
    }

    const bounds = coordinates.reduce((bounds, coord) => bounds.extend(coord), new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
    map.fitBounds(bounds, {
        padding: 20
    });
}