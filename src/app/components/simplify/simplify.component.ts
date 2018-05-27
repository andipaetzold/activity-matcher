import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { StravaAuthService } from '../../services/strava-auth.service';
import { HttpClient } from '@angular/common/http';
import { AngularFirestore } from 'angularfire2/firestore';
import { DetailedActivity } from '../../domain/DetailedActivity';
import { DetailedAthlete } from '../../domain/DetailedAthlete';
import { Position } from 'geojson';
import { StravaAPIService } from '../../services/strava-api.service';
import { MapRoute } from 'app/domain/MapRoute';
import { ActivatedRoute, Router } from '@angular/router';
import { SimplifyService, SimplifyResult } from '../../services/simplify.service';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { filter, mergeMap, map, defaultIfEmpty, distinctUntilChanged, first } from 'rxjs/operators';

@Component({
    selector: 'app-simplify',
    templateUrl: './simplify.component.html',
})
export class SimplifyComponent implements OnInit {
    public activities: DetailedActivity[] = [];

    private _selectedActivity: BehaviorSubject<DetailedActivity> = new BehaviorSubject<DetailedActivity>(undefined);
    private _epsilon: BehaviorSubject<number> = new BehaviorSubject<number>(5);
    private _selectedPath: Observable<Position[]>;
    private _simplifyResult: Observable<SimplifyResult>;
    private _simplifiedPath: Observable<Position[]>;
    private _routes: Observable<MapRoute[]>;

    public constructor(
        private readonly stravaAuthService: StravaAuthService,
        private readonly httpClient: HttpClient,
        private readonly firestore: AngularFirestore,
        private readonly stravaAPIService: StravaAPIService,
        private readonly router: Router,
        private readonly route: ActivatedRoute,
        private readonly simplifyService: SimplifyService,
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

        this._simplifyResult =
            combineLatest(this._selectedPath, this._epsilon)
                .pipe(
                    distinctUntilChanged(),
                    map(([route, epsilon]) => this.simplifyService.simplify(route, epsilon))
                );

        this._simplifiedPath = this._simplifyResult.pipe(map(r => r.simplifiedPath));

        this._routes = combineLatest(
            this._selectedPath.pipe(map(path => ({ path }))),
            this._simplifiedPath.pipe(map(path => ({ path, color: 'blue' }))),
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

    public set epsilon(e: number) {
        this._epsilon.next(e);
    }

    public get epsilon(): number {
        return this._epsilon.value;
    }

    public get routes(): Observable<MapRoute[]> {
        return this._routes;
    }

    public get simplifyResult(): Observable<SimplifyResult> {
        return this._simplifyResult;
    }
}
