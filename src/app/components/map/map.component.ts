import { Component, ViewChild, ElementRef, OnInit, Input } from "@angular/core";
import { Map, LngLatBounds } from 'mapbox-gl';
import { lineString, Feature, LineString, MultiPolygon, Point, Polygon } from '@turf/helpers';
import { LatLng } from '../../domain/LatLng';
import { Position } from 'geojson';

@Component({
    selector: 'app-map',
    templateUrl: './map.component.html',
})
export class MapComponent implements OnInit {
    private lastLayerId = 1;
    private layers: number[] = [];
    private routes: Position[][];

    @ViewChild('map')
    public mapContainer: ElementRef;

    private map: Map = undefined;

    public constructor() {
    }

    public ngOnInit(): void {
        this.map = new Map({
            container: this.mapContainer.nativeElement,
            style: 'mapbox://styles/mapbox/streets-v9'
        });
    }

    private clear(): void {
        for (let id of this.layers) {
            this.map.removeLayer(`layer-${id}`);
            this.map.removeSource(`layer-${id}`);
        }
        this.layers = [];
    }

    private addLayer(layer: mapboxgl.Layer) {
        this.layers.push(this.lastLayerId);
        layer.id = `layer-${this.lastLayerId}`;
        this.map.addLayer(layer);
        ++this.lastLayerId;
    }

    @Input('routes')
    public set routeInput(routes: Position[][]) {
        this.clear();
        this.routes = routes || [];
        for (const route of this.routes) {
            this.addLineLayer(route, 'black');
        }
        this.fitToBounds();
    }

    public addLineLayer(coordinates: Position[], color: string, width?: number) {
        this.addLayer({
            "id": null,
            "type": "line",
            "source": {
                "type": "geojson",
                "data": lineString(coordinates),
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

    private fitToBounds() {
        if (this.layers.length == 0) {
            return;
        }

        const coordinates = [];
        for (let id of this.layers) {
            const data = (<any>this.map.getSource(`layer-${id}`))._data;
            if (data.type == 'Feature') {
                coordinates.push(...this.getFeatureCoordinates(data));
            } else {
                for (let feature of data.features) {
                    coordinates.push(...this.getFeatureCoordinates(feature));
                }
            }
        }

        const bounds = coordinates.reduce((bounds, coord) => bounds.extend(coord), new LngLatBounds(coordinates[0], coordinates[0]));
        this.map.fitBounds(bounds, {
            padding: 50
        });
    }


    private getFeatureCoordinates(feature: Feature<LineString | MultiPolygon | Point | Polygon>) {
        switch (feature.geometry.type) {
            case 'MultiPolygon':
                return [].concat.apply([], feature.geometry.coordinates.map((c: any) => c[0]));

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
}