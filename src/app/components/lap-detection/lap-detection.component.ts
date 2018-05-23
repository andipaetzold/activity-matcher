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
import { MapRoute } from "../../domain/MapRoute";
import { Router, ActivatedRoute } from "@angular/router";

type QualityType = 'low' | 'medium' | 'high';

@Component({
    selector: 'app-lap-detection',
    templateUrl: './lap-detection.component.html',
})
export class LapDetectionComponent implements OnInit {
    public activities: DetailedActivity[] = [];

    private _selectedActivity: BehaviorSubject<DetailedActivity> = new BehaviorSubject<DetailedActivity>(undefined);
    private _selectedPath: Observable<Position[]>;
    private _selectedQuality: BehaviorSubject<QualityType> = new BehaviorSubject<QualityType>('low');
    private _selectedSnapType: BehaviorSubject<string> = new BehaviorSubject<string>('none');
    private _routes: Observable<MapRoute[]>;
    private _maxDistance: BehaviorSubject<number> = new BehaviorSubject<number>(5);

    public constructor(
        private readonly stravaAuthService: StravaAuthService,
        private readonly httpClient: HttpClient,
        private readonly firestore: AngularFirestore,
        private readonly stravaAPIService: StravaAPIService,
        private readonly snapToRoadService: SnapToRoadService,
        private readonly router: Router,
        private readonly route: ActivatedRoute,
    ) {

        this._selectedPath =
            combineLatest(
                combineLatest(
                    this._selectedActivity.filter(a => !!a),
                    this._selectedQuality,
                )
                    .mergeMap(([activity, quality]) => this.firestore
                        .collection('athletes').doc(String(activity.athlete.id))
                        .collection('activities').doc(String(activity.id))
                        .collection('latlng').doc(quality).valueChanges())
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

        this._routes = this._selectedPath.map(path => [{ path }]);
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

        if (this.route.snapshot.queryParamMap.has('activity')) {
            this.selectedActivity = this.activities.find(a => a.id === Number.parseInt(this.route.snapshot.queryParamMap.get('activity')))
        }
    }

    public set selectedActivity(activity: DetailedActivity) {
        this._selectedActivity.next(activity);
        this.router.navigate([], {
            queryParams: {
                ...this.route.snapshot.queryParams,
                'activity': String(activity.id),
            },
        });
    }

    public get selectedActivity(): DetailedActivity {
        return this._selectedActivity.value;
    }

    public set selectedQuality(quality: QualityType) {
        this._selectedQuality.next(quality);
    }

    public get selectedQuality(): QualityType {
        return this._selectedQuality.value;
    }

    public set selectedSnapType(snapType: string) {
        this._selectedSnapType.next(snapType);
    }

    public get selectedSnapType(): string {
        return this._selectedSnapType.value;
    }

    public get maxDistance(): number {
        return this._maxDistance.value;
    }

    public set maxDistance(d: number) {
        this._maxDistance.next(d);
    }

    public get routes(): Observable<MapRoute[]> {
        return this._routes;
    }
}