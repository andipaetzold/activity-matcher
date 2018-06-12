import { Component, OnInit } from '@angular/core';
import { DetailedActivity } from 'app/domain/DetailedActivity';
import { StravaAuthService } from 'app/services/strava-auth.service';
import { HttpClient } from '@angular/common/http';
import { AngularFirestore } from 'angularfire2/firestore';
import { StravaAPIService } from 'app/services/strava-api.service';
import { SnapToRoadService } from 'app/services/snap-to-road.service';
import { Position } from 'geojson';
import { MapRoute } from '../../domain/MapRoute';
import { Router, ActivatedRoute } from '@angular/router';
import { Lap } from '../../services/lap-detection.service';
import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import { filter, mergeMap, map, defaultIfEmpty, first, withLatestFrom } from 'rxjs/operators';
import { LiveLapDetectionService } from '../../services/live-lap-detection.service';

type QualityType = 'low' | 'medium' | 'high';

@Component({
    selector: 'app-live-lap-detection',
    templateUrl: './live-lap-detection.component.html',
})
export class LiveLapDetectionComponent implements OnInit {
    public activities: DetailedActivity[] = [];

    private selectedActivity$: BehaviorSubject<DetailedActivity> = new BehaviorSubject<DetailedActivity>(undefined);
    private selectedPath$: BehaviorSubject<Position[]> = new BehaviorSubject<Position[]>(null);
    private selectedQuality$: BehaviorSubject<QualityType> = new BehaviorSubject<QualityType>('high');
    private pathPointId$: BehaviorSubject<number> = new BehaviorSubject<number>(0);
    private liveSelectedPath$: Observable<Position[]> = combineLatest(
        this.selectedPath$,
        this.pathPointId$
    ).pipe(
        filter(([path, id]) => !!path),
        map(([path, id]) => path.slice(0, id))
    );

    private routes$: Observable<MapRoute[]>;
    private maxDistance$: BehaviorSubject<number> = new BehaviorSubject<number>(10);
    private minLength$: BehaviorSubject<number> = new BehaviorSubject<number>(200);

    public constructor(
        private readonly stravaAuthService: StravaAuthService,
        private readonly httpClient: HttpClient,
        private readonly firestore: AngularFirestore,
        private readonly stravaAPIService: StravaAPIService,
        private readonly snapToRoadService: SnapToRoadService,
        private readonly router: Router,
        private readonly route: ActivatedRoute,
        private readonly liveLapDetectionService: LiveLapDetectionService,
    ) {

        combineLatest(
            this.maxDistance$,
            this.minLength$,
            this.selectedPath$
        ).subscribe(([maxDistance, minLength]) => {
            this.liveLapDetectionService.reset(maxDistance, minLength);
            this.pathPointId$.next(0);
        });

        combineLatest(
            this.selectedActivity$.pipe(filter(a => !!a)),
            this.selectedQuality$,
        ).pipe(
            mergeMap(([activity, quality]) => this.firestore
                .collection('athletes').doc(String(activity.athlete.id))
                .collection('activities').doc(String(activity.id))
                .collection('latlng').doc(quality).valueChanges()),
            filter(o => !!o),
            map(o => (<any>o).data.map((coord: any): Position => [coord.lng, coord.lat])),
            defaultIfEmpty([])
        ).subscribe(this.selectedPath$);

        this.routes$ = this.liveSelectedPath$
            .pipe(
                filter(path => !!path),
                map(path => [{ path }])
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
        this.selectedActivity$.next(activity);
        this.router.navigate([], {
            queryParams: {
                ...this.route.snapshot.queryParams,
                'activity': String(activity.id),
            },
        });
    }

    public get selectedActivity(): DetailedActivity {
        return this.selectedActivity$.value;
    }

    public set selectedQuality(quality: QualityType) {
        this.selectedQuality$.next(quality);
    }

    public get selectedQuality(): QualityType {
        return this.selectedQuality$.value;
    }

    public get maxDistance(): number {
        return this.maxDistance$.value;
    }

    public set maxDistance(d: number) {
        this.maxDistance$.next(d);
    }

    public get minLength(): number {
        return this.minLength$.value;
    }

    public set minLength(d: number) {
        this.minLength$.next(d);
    }

    public get routes(): Observable<MapRoute[]> {
        return this.routes$;
    }

    public nextPathPoint(): void {
        const position = this.selectedPath$.getValue()[this.pathPointId$.getValue()];
        if (position) {
            this.liveLapDetectionService.addPoint(position);

            this.pathPointId$.next(this.pathPointId$.getValue() + 1);
        }
    }

    public startActivity(): void {
        console.log(this.pathPointId$);
        while (this.selectedPath$.getValue()[this.pathPointId$.getValue()]) {
            this.nextPathPoint();
        }
    }
}
