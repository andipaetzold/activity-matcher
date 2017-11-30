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

function addLayer(layer) {
    layers.push(id);
    layer.id = `layer-${id}`;
    map.addLayer(layer);
    ++id;
}

export function addLineLayer(coordinates, color, width) {
    addLayer({
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
}

export function addMultipleLineLayer(coordinates, color, width) {
    addLayer({
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
}

export function addPointLayer(coordinates, color, radius) {
    addLayer({
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
}

export function addCircleAroudPointsLayer(coordinates, borderColor, fillColor, radius) {
    const data = coordinates.map(coord => turf.circle(coord, radius));

    let polygon = data[0];
    for (let i = 1; i < data.length; ++i) {
        polygon = turf.union(polygon, data[i]);
    }

    addLayer({
        "type": "fill",
        "source": {
            "type": "geojson",
            "data": polygon,
        },
        "paint": {
            "fill-color": fillColor,
            "fill-opacity": 0.25,
        }
    });

    addLayer({
        "type": "line",
        "source": {
            "type": "geojson",
            "data": polygon,
        },
        "paint": {
            "line-color": borderColor,
            "line-width": 1,
        }
    });
}

function getFeatureCoordinates(feature) {
    switch (feature.geometry.type) {
        case 'MultiPolygon':
            return [].concat.apply([], feature.geometry.coordinates.map(c => c[0]));

        case 'LineString':
            return feature.geometry.coordinates;

        case 'Point':
            return [feature.geometry.coordinates];

        default:
            console.error('Unknown feature type', feature.geometry.type);
            return [];
    }
}

export function fitToBounds() {
    if (layers.length == 0) {
        return;
    }

    const coordinates = [];
    for (let id of layers) {
        const data = map.getSource(`layer-${id}`)._data;
        if (data.type == 'Feature') {
            coordinates.push(...getFeatureCoordinates(data));
        } else {
            for (let feature of data.features) {
                coordinates.push(...getFeatureCoordinates(feature));
            }
        }
    }

    const bounds = coordinates.reduce((bounds, coord) => bounds.extend(coord), new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
    map.fitBounds(bounds, {
        padding: 50
    });
}