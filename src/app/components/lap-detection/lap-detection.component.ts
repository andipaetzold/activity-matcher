import { Component, OnInit } from "@angular/core";
import { decode } from 'polyline';
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

@Component({
    selector: 'app-lap-detection',
    templateUrl: './lap-detection.component.html',
})
export class LapDetectionComponent implements OnInit {
    public activities: DetailedActivity[] = [];
    private token: string = undefined;

    private _selectedActivity: BehaviorSubject<DetailedActivity> = new BehaviorSubject<DetailedActivity>(undefined);
    private _selectedQuality: BehaviorSubject<string> = new BehaviorSubject<string>('summary_polyline');
    private _selectedRoute: Observable<Position[]>;

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
}