import { Component, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { StravaAuthService } from "../../services/strava-auth.service";
import { HttpClient } from "@angular/common/http";
import { AngularFirestore } from "angularfire2/firestore";
import { BehaviorSubject } from "rxjs/BehaviorSubject";
import { Observable } from "rxjs/Observable";
import 'rxjs/add/operator/map';
import { DetailedActivity } from "../../domain/DetailedActivity";
import { DetailedAthlete } from "../../domain/DetailedAthlete";
import { LatLng } from "../../domain/LatLng";
import { Position } from 'geojson';
import { StravaAPIService } from "../../services/strava-api.service";
import { combineLatest } from 'rxjs/observable/combineLatest';
import { SnapToRoadService } from "../../services/snap-to-road.service";
import { fromPromise } from "rxjs/observable/fromPromise";
import { of } from "rxjs/observable/of";

@Component({
    selector: 'app-snap-to-road',
    templateUrl: './snap-to-road.component.html',
})
export class SnapToRoadComponent implements OnInit {
    public activities: DetailedActivity[] = [];
    private token: string = undefined;

    private _selectedActivity: BehaviorSubject<DetailedActivity> = new BehaviorSubject<DetailedActivity>(undefined);
    private _selectedRoute: Observable<Position[]>;
    private _snappedRoute: Observable<Position[]> = of([]);
    private _selectedSnapType: BehaviorSubject<string> = new BehaviorSubject<string>('none');
    private _routes: Observable<Position[][]>;

    public constructor(
        private readonly stravaAuthService: StravaAuthService,
        private readonly httpClient: HttpClient,
        private readonly firestore: AngularFirestore,
        private readonly stravaAPIService: StravaAPIService,
        private readonly snapToRoadService: SnapToRoadService,
    ) {
        this._selectedRoute = this._selectedActivity
            .filter(activity => !!activity)
            .mergeMap(activity => this.firestore
                .collection('athletes').doc(String(activity.athlete.id))
                .collection('activities').doc(String(activity.id))
                .collection('latlng').doc('low').valueChanges())
            .filter(o => !!o)
            .map(o => (<any>o).data.map((coord: any): Position => [coord.lng, coord.lat]))
            .defaultIfEmpty([]);

        this._snappedRoute =
            combineLatest(
                this._selectedRoute,
                this._selectedSnapType,
            )
                .distinctUntilChanged()
                .mergeMap(([route, snapType]) => {
                    switch (snapType) {
                        case 'google-maps':
                            return this.snapToRoadService.snapGoogleMaps(route);
                        case 'google-maps-interpolate':
                            return this.snapToRoadService.snapGoogleMaps(route, true);
                        case 'mapbox':
                            return this.snapToRoadService.snapMapbox(route, true);
                        case 'mapbox-full':
                            return this.snapToRoadService.snapMapbox(route, false);
                        case 'none':
                        default:
                            return of([]);
                    }
                })
                .defaultIfEmpty([]);

        this._routes = combineLatest(
            this._selectedRoute,
            this._snappedRoute,
        );
    }

    public async ngOnInit(): Promise<void> {
        await this.stravaAuthService.refreshToken();

        const athlete = await this.stravaAPIService.getAthlete();
        this.activities = await this.firestore
            .collection('athletes').doc(String(athlete.id))
            .collection<DetailedActivity>('activities', ref => ref.orderBy('start_date'))
            .valueChanges()
            .map(a => a.reverse())
            .take(1).toPromise();
    }

    public set selectedActivity(activity: DetailedActivity) {
        this._selectedActivity.next(activity);
    }

    public get selectedActivity(): DetailedActivity {
        return this._selectedActivity.value;
    }

    public set selectedSnapType(snapType: string) {
        this._selectedSnapType.next(snapType);
    }

    public get selectedSnapType(): string {
        return this._selectedSnapType.value;
    }

    public get routes(): Observable<Position[][]> {
        return this._routes;
    }
}