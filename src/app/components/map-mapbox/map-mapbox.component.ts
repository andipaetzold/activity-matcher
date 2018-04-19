import { Component, ViewChild, ElementRef, OnInit, Input } from "@angular/core";
import { Map, LngLatBounds, LngLat } from 'mapbox-gl';
import { lineString, Feature, LineString, MultiPolygon, Point, Polygon } from '@turf/helpers';
import { Position } from 'geojson';

const colors = ['black', 'blue', 'red'];

@Component({
    selector: 'app-map-mapbox',
    templateUrl: './map-mapbox.component.html',
})
export class MapMapboxComponent implements OnInit {
    private lastLayerId = 1;
    private layers: number[] = [];
    private routes: Position[][];
    private allPoints: Position[];

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
        setTimeout(() => this.map.resize(), 0);
    }

    private clear(): void {
        for (let id of this.layers) {
            this.map.removeLayer(`layer-${id}`);
            this.map.removeSource(`layer-${id}`);
        }
        this.layers = [];
        this.allPoints = [];
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

        let colorId = 0;

        for (const route of this.routes) {
            if (route.length >= 2) {
                this.addLineLayer(route, colors[colorId++]);
            }
        }
        this.fitToBounds();
    }

    public addLineLayer(coordinates: Position[], color: string, width?: number) {
        this.allPoints.push.apply(this.allPoints, coordinates);

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

        const bounds = this.allPoints.reduce((bounds, coord) => bounds.extend(new LngLat(coord[0], coord[1])), new LngLatBounds(this.allPoints[0], this.allPoints[0]));
        this.map.fitBounds(bounds, {
            padding: 50,
            maxDuration: 1
        });
    }
}