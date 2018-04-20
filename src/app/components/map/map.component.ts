import { Component, Input } from "@angular/core";
import { MapRoute } from "app/domain/MapRoute";

@Component({
    selector: 'app-map',
    templateUrl: './map.component.html',
})
export class MapComponent {
    @Input()
    public routes: MapRoute[];

    public get googleLoaded() {
        return google;
    }
}