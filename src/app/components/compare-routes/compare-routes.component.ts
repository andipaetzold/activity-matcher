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
import { CompareRoutesService, CompareResult } from '../../services/compare-routes.service';
import length from '@turf/length';
import { point, lineString } from '@turf/helpers';
import distance from '@turf/distance';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { filter, map, mergeMap, defaultIfEmpty, first, withLatestFrom } from 'rxjs/operators';

type QualityType = 'low' | 'medium' | 'high';

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
    private _selectedQuality: BehaviorSubject<QualityType> = new BehaviorSubject<QualityType>('low');
    private _selectedSnapType: BehaviorSubject<string> = new BehaviorSubject<string>('none');
    private _selectedCompareType: BehaviorSubject<string> = new BehaviorSubject<string>('points');
    private _routes: Observable<MapRoute[]>;

    private _compareResult: Observable<CompareResult>;
    private _overlappingPaths: Observable<[Position[], Position[]][]>;

    private _totalDistance: Observable<number>;
    private _overlappingDistance: Observable<number>;
    private _overlappingPercentage: Observable<number>;

    private _maxDistance: BehaviorSubject<number> = new BehaviorSubject<number>(5);

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
        this._selectedPath1 =
            combineLatest(
                this._selectedActivity1.pipe(filter(a => !!a)),
                this._selectedQuality,
            )
                .pipe(
                    mergeMap(([activity, quality]) => this.firestore
                        .collection('athletes').doc(String(activity.athlete.id))
                        .collection('activities').doc(String(activity.id))
                        .collection('latlng').doc(quality).valueChanges()),
                    filter(o => !!o),
                    map(o => (<any>o).data.map((coord: any): Position => [coord.lng, coord.lat])),
                    withLatestFrom(this._selectedSnapType),
                    mergeMap(([route, snapType]) => this.convertRoute(route, snapType)),
                    defaultIfEmpty([])
                );

        this._selectedPath2 =
            combineLatest(
                this._selectedActivity2.pipe(filter(a => !!a)),
                this._selectedQuality,
            )
                .pipe(
                    mergeMap(([activity, quality]) => this.firestore
                        .collection('athletes').doc(String(activity.athlete.id))
                        .collection('activities').doc(String(activity.id))
                        .collection('latlng').doc(quality).valueChanges()),
                    filter(o => !!o),
                    map(o => (<any>o).data.map((coord: any): Position => [coord.lng, coord.lat])),
                    withLatestFrom(this._selectedSnapType),
                    mergeMap(([route, snapType]) => this.convertRoute(route, snapType)),
                    defaultIfEmpty([])
                );

        this._compareResult = combineLatest(
            this._selectedPath1,
            this._selectedPath2,
            this._maxDistance,
            this._selectedCompareType,
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
            })
        );

        this._overlappingPaths = combineLatest(
            this._compareResult.pipe(map(r => r.overlappingPaths)),
            this._selectedPath1,
            this._selectedPath2,
        ).pipe(
            map(
                ([result, path1, path2]) => result.map((r): [Position[], Position[]] => ([
                    this.compareRoutesService.linePart(path1, r.route1.from.point, r.route1.from.part, r.route1.to.point, r.route1.to.part),
                    this.compareRoutesService.linePart(path2, r.route2.from.point, r.route2.from.part, r.route2.to.point, r.route2.to.part),
                ]))
            ),
            map(paths => paths.filter(pair => pair[0].length >= 2 && pair[1].length >= 2))
        );

        this._routes = combineLatest(
            this._selectedPath1,
            this._selectedPath2,
            this._overlappingPaths.pipe(defaultIfEmpty([]))
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

        this._totalDistance = combineLatest(this._selectedPath1, this._selectedPath2)
            .pipe(
                map(([path1, path2]) => [lineString(path1), lineString(path2)]),
                map(([path1, path2]) => length(path1) + length(path2))
            );

        this._overlappingDistance = this._overlappingPaths
            .pipe(
                map(paths => paths.map(pair => [lineString(pair[0]), lineString(pair[1])])),
                map(paths => paths.map(pair => length(pair[0]) + length(pair[1]))),
                map(paths => paths.reduce((a, b) => a + b, 0))
            );

        this._overlappingPercentage = combineLatest(
            this._totalDistance,
            this._overlappingDistance
        ).pipe(
            map(([total, overlapping]) => overlapping / total)
        );
    }

    private convertRoute(route: Position[], snapType: string): Promise<Position[]> {
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

    public set selectedCompareType(compareType: string) {
        this._selectedCompareType.next(compareType);
    }

    public get selectedCompareType(): string {
        return this._selectedCompareType.value;
    }

    public get routes(): Observable<MapRoute[]> {
        return this._routes;
    }

    public get maxDistance(): number {
        return this._maxDistance.value;
    }

    public set maxDistance(d: number) {
        this._maxDistance.next(d);
    }

    public get compareResult(): Observable<CompareResult> {
        return this._compareResult;
    }

    public get overlappingPercentage(): Observable<number> {
        return this._overlappingPercentage;
    }
}