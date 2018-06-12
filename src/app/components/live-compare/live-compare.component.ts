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
import { BehaviorSubject, Observable, combineLatest, Subject } from 'rxjs';
import { map, filter, mergeMap, defaultIfEmpty, first, tap } from 'rxjs/operators';
import { LiveCompareService, OverlappingPath } from 'app/services/live-compare.service';

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
    private livePathPointId: BehaviorSubject<number> = new BehaviorSubject<number>(0);
    private liveSelectedPath2$: Observable<Position[]> = combineLatest(this.selectedPath2$, this.livePathPointId).pipe(map(([path, id]) => path.slice(0, id)));

    private selectedQuality$: BehaviorSubject<QualityType> = new BehaviorSubject<QualityType>('high');
    private routes$: Observable<MapRoute[]>;

    private overlappingPathsResult$: BehaviorSubject<OverlappingPath[]> = new BehaviorSubject<OverlappingPath[]>([]);
    private overlappingPaths$: Observable<[Position[], Position[]][]>;

    private maxDistance$: BehaviorSubject<number> = new BehaviorSubject<number>(10);

    public constructor(
        private readonly stravaAuthService: StravaAuthService,
        private readonly httpClient: HttpClient,
        private readonly firestore: AngularFirestore,
        private readonly stravaAPIService: StravaAPIService,
        private readonly snapToRoadService: SnapToRoadService,
        private readonly router: Router,
        private readonly route: ActivatedRoute,
        private readonly compareRoutesService: CompareRoutesService,
        private readonly liveCompareService: LiveCompareService,
    ) {
        combineLatest(
            this.selectedActivity1$.pipe(filter(a => !!a)),
            this.selectedQuality$,
        ).pipe(
            mergeMap(([activity, quality]) => this.firestore
                .collection('athletes').doc(String(activity.athlete.id))
                .collection('activities').doc(String(activity.id))
                .collection('latlng').doc(quality).valueChanges()
            ),
            filter(o => !!o),
            map(o => (<any>o).data.map((coord: any): Position => [coord.lng, coord.lat])),
            defaultIfEmpty([])
        ).subscribe(this.selectedPath1$);

        combineLatest(
            this.selectedActivity2$.pipe(filter(a => !!a)),
            this.selectedQuality$,
        ).pipe(
            mergeMap(([activity, quality]) => this.firestore
                .collection('athletes').doc(String(activity.athlete.id))
                .collection('activities').doc(String(activity.id))
                .collection('latlng').doc(quality).valueChanges()),
            filter(o => !!o),
            map(o => (<any>o).data.map((coord: any): Position => [coord.lng, coord.lat])),
            defaultIfEmpty([]),
        ).subscribe(this.selectedPath2$);

        combineLatest(
            this.selectedPath1$,
            this.selectedPath2$,
            this.maxDistance$,
        ).subscribe(([path1, path2, maxDistance]) => this.liveCompareService.reset(path2, maxDistance));

        this.overlappingPaths$ = combineLatest(
            this.overlappingPathsResult$,
            this.selectedPath1$,
            this.selectedPath2$,
        ).pipe(
            map(
                ([result, path1, path2]) => result.map((r): [Position[], Position[]] => ([
                    this.compareRoutesService.linePart(path1, r.route1[0].point, r.route1[0].part, r.route1[r.route1.length - 1].point, r.route1[r.route1.length - 1].part),
                    this.compareRoutesService.linePart(path2, r.route2[0].point, r.route2[0].part, r.route2[r.route2.length - 1].point, r.route2[r.route2.length - 1].part),
                ]))
            ),
            map(paths => paths.filter(pair => pair[0].length >= 2 && pair[1].length >= 2))
        );

        this.routes$ = combineLatest(
            this.selectedPath1$,
            this.liveSelectedPath2$,
            this.overlappingPaths$.pipe(defaultIfEmpty([]))
        ).pipe(
            map(([selectedPath1, selectedPath2, overlappingPaths]) => {
                const routes: MapRoute[] = [
                    { path: selectedPath1, color: 'red' },
                    { path: selectedPath2, color: 'green', width: 2 },
                    ...overlappingPaths.map(pair => ({ path: pair[0], color: 'blue', width: 2 })),
                    ...overlappingPaths.map(pair => ({ path: pair[1], color: 'purple', width: 2 })),
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

    public nextLivePathPoint(): void {
        const position = this.selectedPath1$.getValue()[this.livePathPointId.getValue()];
        if (position) {
            const result = this.liveCompareService.addPoint(position);

            if (result) {
                console.log(result);
                this.overlappingPathsResult$.next([...this.overlappingPathsResult$.getValue(), result])
            }

            this.livePathPointId.next(this.livePathPointId.getValue() + 1);
        }
    }

    public startActivity(): void {
        while (this.selectedPath1$.getValue()[this.livePathPointId.getValue()]) {
            this.nextLivePathPoint();
        }
    }
}