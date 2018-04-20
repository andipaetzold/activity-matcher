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
import { MapRoute } from "app/domain/MapRoute";
import { Router, ActivatedRoute } from "@angular/router";

@Component({
    selector: 'app-compare-routes',
    templateUrl: './compare-routes.component.html',
})
export class CompareRoutesComponent implements OnInit {
    public activities: DetailedActivity[] = [];

    private _selectedActivity1: BehaviorSubject<DetailedActivity> = new BehaviorSubject<DetailedActivity>(undefined);
    private _selectedActivity2: BehaviorSubject<DetailedActivity> = new BehaviorSubject<DetailedActivity>(undefined);
    private _selectedPath1: Observable<Position[]>;
    private _selectedPath2: Observable<Position[]>;
    private _selectedSnapType: BehaviorSubject<string> = new BehaviorSubject<string>('none');
    private _routes: Observable<MapRoute[]>;

    public constructor(
        private readonly stravaAuthService: StravaAuthService,
        private readonly httpClient: HttpClient,
        private readonly firestore: AngularFirestore,
        private readonly stravaAPIService: StravaAPIService,
        private readonly snapToRoadService: SnapToRoadService,
        private readonly router: Router,
        private readonly route: ActivatedRoute,
    ) {
        this._selectedPath1 =
            combineLatest(
                this._selectedActivity1
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

        this._selectedPath2 =
            combineLatest(
                this._selectedActivity2
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

        this._routes = combineLatest(
            this._selectedPath1.map(path => ({ path, color: 'red' })),
            this._selectedPath2.map(path => ({ path, color: 'green' }))
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

        if (this.route.snapshot.queryParamMap.has('activity1')) {
            this.selectedActivity1 = this.activities.find(a => a.id === Number.parseInt(this.route.snapshot.queryParamMap.get('activity1')))
        }

        if (this.route.snapshot.queryParamMap.has('activity2')) {
            this.selectedActivity2 = this.activities.find(a => a.id === Number.parseInt(this.route.snapshot.queryParamMap.get('activity2')))
        }
    }

    public set selectedActivity1(activity: DetailedActivity) {
        this._selectedActivity1.next(activity);
        this.router.navigate([], {
            queryParams: {
                ...this.route.snapshot.queryParams,
                'activity1': String(activity.id),
            },
        });
    }

    public get selectedActivity1(): DetailedActivity {
        return this._selectedActivity1.value;
    }

    public set selectedActivity2(activity: DetailedActivity) {
        this._selectedActivity2.next(activity);
        this.router.navigate([], {
            queryParams: {
                ...this.route.snapshot.queryParams,
                'activity2': String(activity.id),
            },
        });
    }

    public get selectedActivity2(): DetailedActivity {
        return this._selectedActivity2.value;
    }

    public set selectedSnapType(snapType: string) {
        this._selectedSnapType.next(snapType);
    }

    public get selectedSnapType(): string {
        return this._selectedSnapType.value;
    }

    public get routes(): Observable<MapRoute[]> {
        return this._routes;
    }
}