import { Component, Input, ViewChild } from "@angular/core";
import { MapRoute } from "app/domain/MapRoute";
import { MapMapboxComponent } from "../map-mapbox/map-mapbox.component";
import { MapGoogleComponent } from "../map-google/map-google.component";

@Component({
    selector: 'app-map',
    templateUrl: './map.component.html',
})
export class MapComponent {
    @Input()
    public routes: MapRoute[];

    @ViewChild(MapMapboxComponent)
    public mapMapbox: MapMapboxComponent;

    @ViewChild(MapGoogleComponent)
    public mapGoogleMaps: MapGoogleComponent;

    public get googleLoaded() {
        return google;
    }

    public fitToBounds() {
        this.mapMapbox.fitToBounds();
        this.mapGoogleMaps.fitToBounds();
    }
}
