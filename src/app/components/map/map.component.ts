import { Component, Input } from "@angular/core";

@Component({
    selector: 'app-map',
    templateUrl: './map.component.html',
})
export class MapComponent {
    @Input()
    public routes: Position[][];

    public get googleLoaded() {
        return google;
    }
}