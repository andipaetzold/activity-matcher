import { Component, ViewChild, ElementRef, OnInit, Input } from "@angular/core";
import { Map, LngLatBounds, LngLat } from 'mapbox-gl';
import { lineString, Feature, LineString, MultiPolygon, Point, Polygon } from '@turf/helpers';
import { Position } from 'geojson';
import { } from '@types/googlemaps';
import { MapRoute } from "app/domain/MapRoute";

@Component({
    selector: 'app-map-google',
    templateUrl: './map-google.component.html',
})
export class MapGoogleComponent implements OnInit {
    private lines: google.maps.Polyline[] = [];
    private routes: MapRoute[];
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
    public set routeInput(routes: MapRoute[]) {
        this.clear();
        this.routes = routes || [];

        for (const route of this.routes) {
            if (route.path.length >= 2) {
                this.addLineLayer(route);
            }
        }
        this.fitToBounds();
    }

    public addLineLayer(route: MapRoute) {
        const coords = route.path.map(coord => ({ lat: coord[1], lng: coord[0] }));
        coords.forEach(coord => this.bounds.extend(coord));

        const line = new google.maps.Polyline({
            path: coords,
            geodesic: true,
            strokeColor: route.color || 'black',
            strokeOpacity: 1.0,
            strokeWeight: route.width || 1,
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