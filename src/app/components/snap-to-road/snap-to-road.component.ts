import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { StravaAuthService } from '../../services/strava-auth.service';
import { HttpClient } from '@angular/common/http';
import { AngularFirestore } from 'angularfire2/firestore';
import { DetailedActivity } from '../../domain/DetailedActivity';
import { DetailedAthlete } from '../../domain/DetailedAthlete';
import { LatLng } from '../../domain/LatLng';
import { Position } from 'geojson';
import { StravaAPIService } from '../../services/strava-api.service';
import { SnapToRoadService } from '../../services/snap-to-road.service';
import { MapRoute } from 'app/domain/MapRoute';
import { ActivatedRoute, Router } from '@angular/router';
import length from '@turf/length';
import { lineString } from '@turf/helpers';
import { of, BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { distinctUntilChanged, mergeMap, defaultIfEmpty, filter, first, map } from 'rxjs/operators';

@Component({
    selector: 'app-snap-to-road',
    templateUrl: './snap-to-road.component.html',
})
export class SnapToRoadComponent implements OnInit {
    public activities: DetailedActivity[] = [];
    private _selectedActivity: BehaviorSubject<DetailedActivity> = new BehaviorSubject<DetailedActivity>(undefined);
    private _selectedPath: Observable<Position[]>;
    private _snappedPath: Observable<Position[]> = of([]);
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
        this._selectedPath = this._selectedActivity
            .pipe(
                filter(activity => !!activity),
                mergeMap(activity => this.firestore
                    .collection('athletes').doc(String(activity.athlete.id))
                    .collection('activities').doc(String(activity.id))
                    .collection('latlng').doc('high').valueChanges()),
                filter(o => !!o),
                map(o => (<any>o).data.map((coord: any): Position => [coord.lng, coord.lat])),
                defaultIfEmpty([])
            );

        this._snappedPath =
            combineLatest(
                this._selectedPath,
                this._selectedSnapType,
            )
                .pipe(
                    distinctUntilChanged(),
                    mergeMap(([route, snapType]) => {
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
                    }),
                    defaultIfEmpty([])
                );

        combineLatest(
            this._selectedPath,
            this._snappedPath,
        ).subscribe(([selectedPath, snappedPath]) => {
            console.group();

            console.group('Original');
            console.log(selectedPath.length);
            console.log(length(lineString(selectedPath)));
            console.groupEnd();

            if (snappedPath.length) {
                console.group('Snapped');
                console.log(snappedPath.length);
                console.log(length(lineString(snappedPath)));
                console.groupEnd();
            }

            console.groupEnd();
        });

        this._routes = combineLatest(
            this._selectedPath.pipe(map(path => ({ path }))),
            this._snappedPath.pipe(map(path => ({ path, color: 'blue' }))),
        );
    }

    public async ngOnInit(): Promise<void> {
        await this.stravaAuthService.refreshToken();

        const athlete = await this.stravaAPIService.getAthlete();
        this.activities = await this.firestore
            .collection('athletes').doc(String(athlete.id))
            .collection<DetailedActivity>('activities', ref => ref.orderBy('start_date'))
            .valueChanges()
            .pipe(
                map(a => a.reverse()),
                first()
            )
            .toPromise();

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
