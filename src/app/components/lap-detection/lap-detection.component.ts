import { Component, OnInit } from "@angular/core";
import { Observable } from "rxjs/Observable";
import { BehaviorSubject } from "rxjs/BehaviorSubject";
import { DetailedActivity } from "app/domain/DetailedActivity";
import { combineLatest } from "rxjs/observable/combineLatest";
import { StravaAuthService } from "app/services/strava-auth.service";
import { HttpClient } from "@angular/common/http";
import { AngularFirestore } from "angularfire2/firestore";
import { StravaAPIService } from "app/services/strava-api.service";
import { SnapToRoadService } from "app/services/snap-to-road.service";
import { Position } from 'geojson';
import { of } from "rxjs/observable/of";

@Component({
    selector: 'app-lap-detection',
    templateUrl: './lap-detection.component.html',
})
export class LapDetectionComponent implements OnInit {
    public activities: DetailedActivity[] = [];
    private token: string = undefined;

    private _selectedActivity: BehaviorSubject<DetailedActivity> = new BehaviorSubject<DetailedActivity>(undefined);
    private _selectedQuality: BehaviorSubject<string> = new BehaviorSubject<string>('summary_polyline');
    private _selectedRoute: Observable<Position[]>;
    private _selectedSnapType: BehaviorSubject<string> = new BehaviorSubject<string>('none');
    private _routes: Observable<Position[][]>;

    public constructor(
        private readonly stravaAuthService: StravaAuthService,
        private readonly httpClient: HttpClient,
        private readonly firestore: AngularFirestore,
        private readonly stravaAPIService: StravaAPIService,
        private readonly snapToRoadService: SnapToRoadService,
    ) {

        this._selectedRoute =
            combineLatest(
                this._selectedActivity
                    .filter(activity => !!activity)
                    .mergeMap(activity => this.firestore
                        .collection('athletes').doc(String(activity.athlete.id))
                        .collection('activities').doc(String(activity.id))
                        .collection('latlng').doc('low').valueChanges())
                    .filter(o => !!o)
                    .map(o => (<any>o).data.map((coord: any): Position => [coord.lng, coord.lat])),
                this._selectedSnapType,
            ).mergeMap(([route, snapType]) => {
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
                        return of(route);
                }
            })
                .defaultIfEmpty([]);

        this._routes = this._selectedRoute.map(r => [r]);
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