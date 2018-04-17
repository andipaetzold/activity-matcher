import { Component, OnInit } from "@angular/core";
import { StravaAuthService } from "../../services/strava-auth.service";
import { HttpClient } from "@angular/common/http";
import { AngularFirestore } from "angularfire2/firestore";
import { BehaviorSubject } from "rxjs/BehaviorSubject";
import { Observable } from "rxjs/Observable";
import { decode } from 'polyline';
import 'rxjs/add/operator/map';
import { DetailedActivity } from "../../domain/DetailedActivity";
import { DetailedAthlete } from "../../domain/DetailedAthlete";
import { LatLng } from "../../domain/LatLng";
import { Position } from 'geojson';
import { StravaAPIService } from "../../services/strava-api.service";

@Component({
    selector: 'app-snap-to-road',
    templateUrl: './snap-to-road.component.html',
})
export class SnapToRoadComponent implements OnInit {
    public activities: DetailedActivity[] = [];
    private token: string = undefined;

    private _selectedActivity: BehaviorSubject<DetailedActivity> = new BehaviorSubject<DetailedActivity>(undefined);
    private _selectedRoute: Observable<Position[]>;

    public constructor(
        private readonly stravaAuthService: StravaAuthService,
        private readonly httpClient: HttpClient,
        private readonly firestore: AngularFirestore,
        private readonly stravaAPIService: StravaAPIService,
    ) {
        this._selectedRoute = this._selectedActivity
            .filter(a => !!a)
            .map(activity => decode(activity.map.polyline))
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

    public get routes(): Observable<Position[][]> {
        return this._selectedRoute.map(r => [r]);
    }
}