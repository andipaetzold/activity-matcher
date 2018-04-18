import { Component, ViewChild, ElementRef, OnInit, Input } from "@angular/core";
import { Map, LngLatBounds, LngLat } from 'mapbox-gl';
import { lineString, Feature, LineString, MultiPolygon, Point, Polygon } from '@turf/helpers';
import { Position } from 'geojson';
import { } from '@types/googlemaps';

const colors = ['black', 'blue', 'red'];

@Component({
    selector: 'app-map-google',
    templateUrl: './map-google.component.html',
})
export class MapGoogleComponent implements OnInit {
    private lines: google.maps.Polyline[] = [];
    private routes: Position[][];
    private bounds: google.maps.LatLngBounds;

    @ViewChild('map')
    public mapContainer: ElementRef;

    private map: google.maps.Map = undefined;

    public constructor() {
    }

    public ngOnInit(): void {
        this.bounds = new google.maps.LatLngBounds();
        this.map = new google.maps.Map(this.mapContainer.nativeElement, {
            mapTypeId: google.maps.MapTypeId.TERRAIN,
            center: { lat: 0, lng: 0 },
            zoom: 8,
            styles: [
                {
                    featureType: 'poi',
                    stylers: [{ visibility: 'off' }]
                },
                {
                    featureType: 'transit',
                    elementType: 'labels.icon',
                    stylers: [{ visibility: 'off' }]
                }
            ]
        });
    }

    private clear(): void {
        for (let line of this.lines) {
            line.setMap(null);
        }
        this.lines = [];
        this.bounds = new google.maps.LatLngBounds();
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
        const coords = coordinates.map(coord => ({ lat: coord[1], lng: coord[0] }));
        coords.forEach(coord => this.bounds.extend(coord));

        const line = new google.maps.Polyline({
            path: coords,
            geodesic: true,
            strokeColor: color,
            strokeOpacity: 1.0,
            strokeWeight: width || 1
        });
        line.setMap(this.map);

        this.lines.push(line);
    }

    private fitToBounds() {
        if (this.map) {
            this.map.fitBounds(this.bounds, 50);
        }
    }
}