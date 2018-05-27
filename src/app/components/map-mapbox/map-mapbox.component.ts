import { Component, ViewChild, ElementRef, OnInit, Input } from '@angular/core';
import { Map, LngLatBounds, LngLat, NavigationControl } from 'mapbox-gl';
import { lineString, Feature, LineString, MultiPolygon, Point, Polygon } from '@turf/helpers';
import { Position } from 'geojson';
import { MapRoute } from 'app/domain/MapRoute';

@Component({
    selector: 'app-map-mapbox',
    templateUrl: './map-mapbox.component.html',
})
export class MapMapboxComponent implements OnInit {
    private lastLayerId = 1;
    private layers: number[] = [];
    private routes: MapRoute[];
    private bounds: LngLatBounds;

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

        this.map.addControl(new NavigationControl());
        setTimeout(() => this.map.resize(), 0);
    }

    private clear(): void {
        for (let id of this.layers) {
            this.map.removeLayer(`layer-${id}`);
            this.map.removeSource(`layer-${id}`);
        }
        this.layers = [];
        this.bounds = null;
    }

    private addLayer(layer: mapboxgl.Layer) {
        this.layers.push(this.lastLayerId);
        layer.id = `layer-${this.lastLayerId}`;
        this.map.addLayer(layer);
        ++this.lastLayerId;
    }

    @Input('routes')
    public set routeInput(routes: MapRoute[]) {
        this.clear();
        this.routes = routes || [];

        let colorId = 0;

        for (const route of this.routes) {
            if (route.path.length >= 2) {
                this.addLineLayer(route);
            }
        }
    }

    public addLineLayer(route: MapRoute) {
        this.addLayer({
            "id": null,
            "type": "line",
            "source": {
                "type": "geojson",
                "data": lineString(route.path),
            },
            "layout": {
                "line-join": "round",
                "line-cap": "round"
            },
            "paint": {
                "line-color": route.color || 'black',
                "line-width": route.width || 1
            }
        });

        // Bounds
        if (!this.bounds) {
            this.bounds = new LngLatBounds(route.path[0], route.path[0]);
        }

        for (const coord of route.path) {
            this.bounds.extend(new LngLat(coord[0], coord[1]));
        }
    }

    public fitToBounds() {
        if (!this.bounds) {
            return;
        }

        this.map.fitBounds(this.bounds, {
            padding: 50,
            maxDuration: 1
        });
    }
}
