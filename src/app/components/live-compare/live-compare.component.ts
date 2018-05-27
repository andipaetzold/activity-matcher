import { Component, ChangeDetectionStrategy } from '@angular/core';
import { DetailedActivity } from 'app/domain/DetailedActivity';
import { MapRoute } from 'app/domain/MapRoute';
import { CompareResult, CompareRoutesService } from 'app/services/compare-routes.service';
import { StravaAuthService } from 'app/services/strava-auth.service';
import { HttpClient } from '@angular/common/http';
import { AngularFirestore } from 'angularfire2/firestore';
import { StravaAPIService } from 'app/services/strava-api.service';
import { SnapToRoadService } from 'app/services/snap-to-road.service';
import { Router, ActivatedRoute } from '@angular/router';
import { Position } from 'geojson';
import { lineString } from '@turf/helpers';
import length from '@turf/length';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, filter, mergeMap, defaultIfEmpty, first } from 'rxjs/operators';

type QualityType = 'low' | 'medium' | 'high';

@Component({
    selector: 'live-compare',
    templateUrl: './live-compare.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiveCompareComponent {
    public activities: DetailedActivity[] = [];

    private selectedActivity1$: BehaviorSubject<DetailedActivity> = new BehaviorSubject<DetailedActivity>(undefined);
    private selectedActivity2$: BehaviorSubject<DetailedActivity> = new BehaviorSubject<DetailedActivity>(undefined);
    private selectedPath1$: BehaviorSubject<Position[]> = new BehaviorSubject([]);
    private selectedPath2$: BehaviorSubject<Position[]> = new BehaviorSubject([]);
    private path2PointId$: BehaviorSubject<number> = new BehaviorSubject<number>(0);
    private liveSelectedPath2$: Observable<Position[]> = combineLatest(this.selectedPath2$, this.path2PointId$).pipe(map(([path, id]) => path.slice(0, id)));

    private selectedQuality$: BehaviorSubject<QualityType> = new BehaviorSubject<QualityType>('low');
    private routes$: Observable<MapRoute[]>;

    private overlappingPaths$: Observable<[Position[], Position[]][]>;

    private maxDistance$: BehaviorSubject<number> = new BehaviorSubject<number>(5);

    public constructor(
        private readonly stravaAuthService: StravaAuthService,
        private readonly httpClient: HttpClient,
        private readonly firestore: AngularFirestore,
        private readonly stravaAPIService: StravaAPIService,
        private readonly snapToRoadService: SnapToRoadService,
        private readonly router: Router,
        private readonly route: ActivatedRoute,
        private readonly compareRoutesService: CompareRoutesService,
    ) {
        combineLatest(
            this.selectedActivity1$.pipe(filter(a => !!a)),
            this.selectedQuality$,
        )
            .pipe(
                mergeMap(([activity, quality]) => this.firestore
                    .collection('athletes').doc(String(activity.athlete.id))
                    .collection('activities').doc(String(activity.id))
                    .collection('latlng').doc(quality).valueChanges()
                ),
                filter(o => !!o),
                map(o => (<any>o).data.map((coord: any): Position => [coord.lng, coord.lat])),
                defaultIfEmpty([])
            )
            .subscribe(this.selectedPath1$);

        combineLatest(
            this.selectedActivity2$.pipe(filter(a => !!a)),
            this.selectedQuality$,
        )
            .pipe(
                mergeMap(([activity, quality]) => this.firestore
                    .collection('athletes').doc(String(activity.athlete.id))
                    .collection('activities').doc(String(activity.id))
                    .collection('latlng').doc(quality).valueChanges()),
                filter(o => !!o),
                map(o => (<any>o).data.map((coord: any): Position => [coord.lng, coord.lat])),
                defaultIfEmpty([]),
        )
            .subscribe(this.selectedPath2$);

        this.routes$ = combineLatest(
            this.selectedPath1$,
            this.liveSelectedPath2$,
            // this.overlappingPaths$.defaultIfEmpty([])
        )
            .pipe(map(([selectedPath1, selectedPath2]) => {
                const routes: MapRoute[] = [
                    { path: selectedPath1, color: 'red' },
                    { path: selectedPath2, color: 'green', width: 2 },
                    // ...overlappingPaths.map(pair => ({ path: pair[0], color: 'blue', width: 2 })),
                    // ...overlappingPaths.map(pair => ({ path: pair[1], color: 'purple', width: 2 })),
                ];

                return routes;
            })
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

        if (this.route.snapshot.queryParamMap.has('activity1')) {
            this.selectedActivity1 = this.activities.find(a => a.id === Number.parseInt(this.route.snapshot.queryParamMap.get('activity1')))
        }

        if (this.route.snapshot.queryParamMap.has('activity2')) {
            this.selectedActivity2 = this.activities.find(a => a.id === Number.parseInt(this.route.snapshot.queryParamMap.get('activity2')))
        }
    }

    public set selectedActivity1(activity: DetailedActivity) {
        this.selectedActivity1$.next(activity);
        this.router.navigate([], {
            queryParams: {
                ...this.route.snapshot.queryParams,
                'activity1': String(activity.id),
            },
        });
    }

    public get selectedActivity1(): DetailedActivity {
        return this.selectedActivity1$.value;
    }

    public set selectedActivity2(activity: DetailedActivity) {
        this.selectedActivity2$.next(activity);
        this.router.navigate([], {
            queryParams: {
                ...this.route.snapshot.queryParams,
                'activity2': String(activity.id),
            },
        });
    }

    public get selectedActivity2(): DetailedActivity {
        return this.selectedActivity2$.value;
    }

    public set selectedQuality(quality: QualityType) {
        this.selectedQuality$.next(quality);
    }

    public get selectedQuality(): QualityType {
        return this.selectedQuality$.value;
    }

    public get routes(): Observable<MapRoute[]> {
        return this.routes$;
    }

    public get maxDistance(): number {
        return this.maxDistance$.value;
    }

    public set maxDistance(d: number) {
        this.maxDistance$.next(d);
    }

    public nextPath2Point(): void {
        this.path2PointId$.next(this.path2PointId$.getValue() + 1);
    }
}