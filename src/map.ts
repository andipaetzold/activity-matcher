import * as turf from '@turf/turf';
import * as mapboxgl from 'mapbox-gl';
import { Position, Feature, Polygon, LineString, MultiPolygon, Point } from '@turf/turf';

let map: mapboxgl.Map;

let id = 1;
let layers: number[] = [];

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

export function addLayer(layer: mapboxgl.Layer) {
    layers.push(id);
    layer.id = `layer-${id}`;
    map.addLayer(layer);
    ++id;
}

export function addLineLayer(coordinates: Position[], color: string, width?: number) {
    addLayer({
        "id": null,
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

export function addMultipleLineLayer(coordinates: Position[][], color: string, width?: number) {
    const lineStringRoutes = coordinates.map(route => turf.lineString(route));
    const featureCollection = turf.featureCollection(lineStringRoutes);

    addLayer({
        "id": null,
        "type": "line",
        "source": {
            "type": "geojson",
            "data": <any>featureCollection,
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

export function addPointLayer(coordinates: Position, color: string, radius?: number) {
    addLayer({
        "id": null,
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

export function addCircleAroudPointsLayer(coordinates: Position[], borderColor: string, fillColor: string, radius?: number) {
    const data = coordinates.map(coord => turf.circle(coord, radius));

    let polygon: Feature<Polygon> = null;
    for (let i = 1; i < data.length; ++i) {
        const prev = polygon == null ? data[0] : polygon;
        polygon = <Feature<Polygon>>turf.union(prev, data[i]);
    }

    addLayer({
        "id": null,
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
        "id": null,
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

function getFeatureCoordinates(feature: Feature<LineString | MultiPolygon | Point | Polygon>) {
    switch (feature.geometry.type) {
        case 'MultiPolygon':
            return [].concat.apply([], feature.geometry.coordinates.map(c => c[0]));

        case 'LineString':
            return feature.geometry.coordinates;

        case 'Point':
            return [feature.geometry.coordinates];

        case 'Polygon':
            const coordinates = [];
            for (let coords of feature.geometry.coordinates) {
                coordinates.push(...coords);
            }
            return coordinates;

        default:
            console.error('Unknown feature type', (<any>feature).geometry.type);
            return [];
    }
}

export function fitToBounds() {
    if (layers.length == 0) {
        return;
    }

    const coordinates = [];
    for (let id of layers) {
        const data = (<any>map.getSource(`layer-${id}`))._data;
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
