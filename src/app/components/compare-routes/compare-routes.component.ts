import { Component, OnInit } from '@angular/core';
import { DetailedActivity } from 'app/domain/DetailedActivity';
import { StravaAuthService } from 'app/services/strava-auth.service';
import { HttpClient } from '@angular/common/http';
import { AngularFirestore } from 'angularfire2/firestore';
import { StravaAPIService } from 'app/services/strava-api.service';
import { SnapToRoadService } from 'app/services/snap-to-road.service';
import { Position } from 'geojson';
import { MapRoute } from 'app/domain/MapRoute';
import { Router, ActivatedRoute } from '@angular/router';
import { CompareRoutesService, CompareResult, ICompareRouteData } from '../../services/compare-routes.service';
import length from '@turf/length';
import { point, lineString } from '@turf/helpers';
import distance from '@turf/distance';
import { BehaviorSubject, Observable, combineLatest, of, Subject, interval } from 'rxjs';
import { filter, map, mergeMap, defaultIfEmpty, first, withLatestFrom, tap, distinctUntilChanged, distinct, debounceTime } from 'rxjs/operators';
import { SmoothVelocityStream } from 'app/domain/SmoothVelocityStream';
import { LatLngStream } from '../../domain/LatLngStream';
import { SimplifyService } from '../../services/simplify.service';

type QualityType = 'low' | 'medium' | 'high';

@Component({
    selector: 'app-compare-routes',
    templateUrl: './compare-routes.component.html',
})
export class CompareRoutesComponent implements OnInit {
    public activities: DetailedActivity[] = [];

    private selectedActivity1$: BehaviorSubject<DetailedActivity> = new BehaviorSubject<DetailedActivity>(undefined);
    private selectedActivity2$: BehaviorSubject<DetailedActivity> = new BehaviorSubject<DetailedActivity>(undefined);
    private selectedPath1$: Subject<Position[]> = new BehaviorSubject(undefined);
    private selectedPath2$: Subject<Position[]> = new BehaviorSubject(undefined);
    private selectedVelocity1$: Subject<number[]> = new BehaviorSubject<number[]>(undefined);
    private selectedVelocity2$: Subject<number[]> = new BehaviorSubject<number[]>(undefined);
    private selectedQuality$: BehaviorSubject<QualityType> = new BehaviorSubject<QualityType>('low');
    private selectedSnapType$: BehaviorSubject<string> = new BehaviorSubject<string>('none');
    private selectedCompareType$: BehaviorSubject<string> = new BehaviorSubject<string>('points-lines-2');
    private routes$: Observable<MapRoute[]>;

    private compareResult$: Subject<CompareResult> = new BehaviorSubject<CompareResult>(null);
    private overlappingPaths$: Observable<[Position[], Position[]][]>;

    private maxDistance$: BehaviorSubject<number> = new BehaviorSubject<number>(10);
    private chartOverlappingId$: BehaviorSubject<number> = new BehaviorSubject<number>(0);

    private simplifyEpsilon$: BehaviorSubject<number> = new BehaviorSubject<number>(0);

    public data: Observable<ICompareRouteData[]> = combineLatest(
        this.compareResult$.pipe(filter(cr => !!cr)),
        this.selectedVelocity1$.pipe(filter(v => !!v)),
        this.selectedVelocity2$.pipe(filter(v => !!v)),
        this.chartOverlappingId$.pipe(filter(id => !!id)),
    ).pipe(
        map(([result, velocity1, velocity2, chartOverlappingId]) => this.compareRoutesService.createVelocityChartData(result.overlappingPaths[chartOverlappingId], velocity1, velocity2))
    );

    public constructor(
        private readonly stravaAuthService: StravaAuthService,
        private readonly httpClient: HttpClient,
        private readonly firestore: AngularFirestore,
        private readonly stravaAPIService: StravaAPIService,
        private readonly snapToRoadService: SnapToRoadService,
        private readonly router: Router,
        private readonly route: ActivatedRoute,
        private readonly compareRoutesService: CompareRoutesService,
        private readonly simplifyService: SimplifyService,
    ) {
        const selectedOriginalPath1$ =
            combineLatest(
                this.selectedActivity1$.pipe(filter(a => !!a)),
                this.selectedQuality$,
            ).pipe(
                mergeMap(([activity, quality]) => this.getRoute(activity, quality))
            );

        const selectedOriginalPath2$ =
            combineLatest(
                this.selectedActivity2$.pipe(filter(a => !!a)),
                this.selectedQuality$,
            ).pipe(
                mergeMap(([activity, quality]) => this.getRoute(activity, quality))
            );

        const selectedSnappedPath1 = combineLatest(
            selectedOriginalPath1$,
            this.selectedSnapType$
        ).pipe(
            mergeMap(([route, snapType]) => this.snapRoute(route, snapType)),
            defaultIfEmpty([]),
        );

        const selectedSnappedPath2 = combineLatest(
            selectedOriginalPath2$,
            this.selectedSnapType$
        ).pipe(
            mergeMap(([route, snapType]) => this.snapRoute(route, snapType)),
            defaultIfEmpty([]),
        );

        combineLatest(
            selectedSnappedPath1,
            this.simplifyEpsilon$.pipe(distinctUntilChanged()),
        ).pipe(
            map(([route, epsilon]) => this.simplifyService.simplify(route, epsilon)),
            map(r => r.simplifiedPath),
            defaultIfEmpty([])
        ).subscribe(this.selectedPath1$);

        combineLatest(
            selectedSnappedPath2,
            this.simplifyEpsilon$.pipe(distinctUntilChanged()),
        ).pipe(
            map(([route, epsilon]) => this.simplifyService.simplify(route, epsilon)),
            map(r => r.simplifiedPath),
            defaultIfEmpty([]),
        ).subscribe(this.selectedPath2$);

        combineLatest(
            this.selectedActivity1$.pipe(filter(a => !!a)),
            this.selectedQuality$.pipe(distinctUntilChanged()),
        ).pipe(
            mergeMap(([activity, quality]) => this.getVelocity(activity, quality)),
        ).subscribe(this.selectedVelocity1$);

        combineLatest(
            this.selectedActivity2$.pipe(filter(a => !!a)),
            this.selectedQuality$.pipe(distinctUntilChanged()),
        ).pipe(
            mergeMap(([activity, quality]) => this.getVelocity(activity, quality)),
        ).subscribe(this.selectedVelocity2$);

        combineLatest(
            this.selectedPath1$.pipe(filter(p => !!p)),
            this.selectedPath2$.pipe(filter(p => !!p)),
            this.maxDistance$.pipe(distinctUntilChanged()),
            this.selectedCompareType$.pipe(distinctUntilChanged()),
        ).pipe(
            map(([path1, path2, maxDistance, compareType]) => {
                switch (compareType) {
                    case 'points':
                        return this.compareRoutesService.comparePoints(path1, path2, maxDistance);
                    case 'points-line':
                        return this.compareRoutesService.comparePointsWithLine(path1, path2, maxDistance);
                    case 'points-lines':
                        return this.compareRoutesService.comparePointsWithLines(path1, path2, maxDistance);
                    case 'points-lines-2':
                        return this.compareRoutesService.comparePointsWithLines2(path1, path2, maxDistance);
                }
            }),
            filter(cr => !!cr),
        ).subscribe(this.compareResult$);

        this.overlappingPaths$ = combineLatest(
            this.compareResult$.pipe(filter(cr => !!cr), map(r => r.overlappingPaths)),
            this.selectedPath1$.pipe(filter(p => !!p)),
            this.selectedPath2$.pipe(filter(p => !!p)),
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
            this.selectedPath2$,
            this.overlappingPaths$.pipe(defaultIfEmpty([]))
        ).pipe(
            map(([selectedPath1, selectedPath2, overlappingPaths]) => {
                const routes: MapRoute[] = [
                    { path: selectedPath1, color: 'red' },
                    { path: selectedPath2, color: 'green' },
                    ...overlappingPaths.map(pair => ({ path: pair[0], color: 'blue', width: 2 })),
                    ...overlappingPaths.map(pair => ({ path: pair[1], color: 'purple', width: 2 })),
                ];

                return routes;
            })
        );

        combineLatest(
            this.compareResult$,
            this.overlappingPaths$.pipe(filter(p => !!p)),
            this.selectedPath1$.pipe(filter(p => !!p)),
            this.selectedPath2$.pipe(filter(p => !!p)),
        ).pipe(
            debounceTime(250),
        ).subscribe(([cr, op, sp1, sp2]) => {
            const totalDistance = length(lineString(sp1)) + length(lineString(sp2));
            const overlappingDistance = op.map(pair => length(lineString(pair[0])) + length(lineString(pair[1]))).reduce((a, b) => a + b, 0);

            console.group();
            console.log('Total Distance', totalDistance);
            console.log('Overlapping Distance', overlappingDistance);
            console.log('Overlapping Percentage', overlappingDistance / totalDistance);

            console.log('Points Path 1', sp1.length);
            console.log('Points Path 2', sp2.length);

            console.log('Calculation Time', cr.calculationTime, 'ms');
            console.groupEnd();
        });
    }

    private snapRoute(route: Position[], snapType: string): Promise<Position[]> {
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
                return Promise.resolve(route);
        }
    }

    private getRoute(activity: DetailedActivity, quality: string): Observable<Position[]> {
        return this.firestore
            .collection('athletes').doc(String(activity.athlete.id))
            .collection('activities').doc(String(activity.id))
            .collection('latlng').doc<LatLngStream>(quality)
            .valueChanges()
            .pipe(
                filter(o => !!o),
                map(o => o.data.map((coord: any): Position => [coord.lng, coord.lat])),
                defaultIfEmpty([]),
        );
    }

    private getVelocity(activity: DetailedActivity, quality: string): Observable<number[]> {
        return this.firestore
            .collection('athletes').doc(String(activity.athlete.id))
            .collection('activities').doc(String(activity.id))
            .collection('velocity_smooth').doc<SmoothVelocityStream>(quality)
            .valueChanges()
            .pipe(
                filter(o => !!o),
                map(o => o.data),
                defaultIfEmpty([]),
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

    public set selectedSnapType(snapType: string) {
        this.selectedSnapType$.next(snapType);
    }

    public get selectedSnapType(): string {
        return this.selectedSnapType$.value;
    }

    public set selectedCompareType(compareType: string) {
        this.selectedCompareType$.next(compareType);
    }

    public get selectedCompareType(): string {
        return this.selectedCompareType$.value;
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

    public set chartOverlappingId(id: number) {
        this.chartOverlappingId$.next(id);
    }

    public get chartOverlappingId(): number {
        return this.chartOverlappingId$.getValue();
    }

    public get simplifyEpsilon(): number {
        return this.simplifyEpsilon$.value;
    }

    public set simplifyEpsilon(d: number) {
        this.simplifyEpsilon$.next(d);
    }
}