import { Component, OnInit } from "@angular/core";
import { StravaAuthService } from "../../services/strava-auth.service";
import { HttpClient } from "@angular/common/http";
import { AngularFirestore } from "angularfire2/firestore";
import { BehaviorSubject } from "rxjs/BehaviorSubject";
import { Observable } from "rxjs/Observable";
import { decode } from 'polyline';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/switch';
import { DetailedActivity } from "../../domain/DetailedActivity";
import { DetailedAthlete } from "../../domain/DetailedAthlete";
import { LatLng } from "../../domain/LatLng";
import { Position } from 'geojson';
import { StravaAPIService } from "../../services/strava-api.service";
import { combineLatest } from 'rxjs/observable/combineLatest';
import { SnapToRoadService } from "../../services/snap-to-road.service";
import { fromPromise } from "rxjs/observable/fromPromise";

@Component({
    selector: 'app-snap-to-road',
    templateUrl: './snap-to-road.component.html',
})
export class SnapToRoadComponent implements OnInit {
    public activities: DetailedActivity[] = [];
    private token: string = undefined;

    private _selectedActivity: BehaviorSubject<DetailedActivity> = new BehaviorSubject<DetailedActivity>(undefined);
    private _selectedQuality: BehaviorSubject<string> = new BehaviorSubject<string>('summary_polyline');
    private _selectedRoute: Observable<Position[]>;
    private _snappedRoute: BehaviorSubject<Position[]> = new BehaviorSubject([]);
    private _selectedSnapType: BehaviorSubject<string> = new BehaviorSubject<string>('none');

    public constructor(
        private readonly stravaAuthService: StravaAuthService,
        private readonly httpClient: HttpClient,
        private readonly firestore: AngularFirestore,
        private readonly stravaAPIService: StravaAPIService,
        private readonly snapToRoadService: SnapToRoadService,
    ) {
        this._selectedRoute = combineLatest(
            this._selectedActivity,
            this._selectedQuality,
        )
            .filter(([a, q]) => !!a)
            .map(([activity, quality]) => {
                if (quality == 'summary_polyline') {
                    return decode(activity.map.summary_polyline);
                } else {
                    return decode(activity.map.polyline);
                }
            })
            .map(route => route.map(p => [p[1], p[0]]))
            .defaultIfEmpty([]);

        combineLatest(
            this._selectedRoute,
            this._selectedSnapType,
        ).subscribe(async ([route, snapType]) => {
            switch (snapType) {
                case 'none':
                    this._snappedRoute.next([]);
                    break;
                case 'google-maps':
                    this._snappedRoute.next(await this.snapToRoadService.snapGoogleMaps(route));
                    break;
                case 'google-maps-interpolate':
                    this._snappedRoute.next(await this.snapToRoadService.snapGoogleMaps(route, true));
                    break;
                case 'mapbox':
                    this._snappedRoute.next(await this.snapToRoadService.snapMapbox(route, true));
                    break;
                case 'mapbox-full':
                    this._snappedRoute.next(await this.snapToRoadService.snapMapbox(route, false));
                    break;
            }
        });
    }

    public async ngOnInit(): Promise<void> {
        const athlete = await this.stravaAPIService.getAthlete();
        this.activities = await this.firestore.collection('athletes').doc(String(athlete.id)).collection<DetailedActivity>('activities').valueChanges().take(1).toPromise();
    }

    public set selectedActivity(activity: DetailedActivity) {
        this._selectedActivity.next(activity);
    }

    public get selectedActivity(): DetailedActivity {
        return this._selectedActivity.value;
    }

    public set selectedQuality(quality: string) {
        this._selectedQuality.next(quality);
    }

    public get selectedQuality(): string {
        return this._selectedQuality.value;
    }

    public set selectedSnapType(snapType: string) {
        this._selectedSnapType.next(snapType);
    }

    public get selectedSnapType(): string {
        return this._selectedSnapType.value;
    }

    public get routes(): Observable<Position[][]> {
        return combineLatest(
            this._selectedRoute,
            this._snappedRoute,
        );
    }
}