import { Injectable } from "@angular/core";
import { StravaAuthService } from "./strava-auth.service";
import { HttpClient } from "@angular/common/http";
import { AngularFirestore, AngularFirestoreDocument, AngularFirestoreCollection } from 'angularfire2/firestore';
import { DetailedAthlete } from "../domain/DetailedAthlete";
import { DetailedActivity } from "../domain/DetailedActivity";
import { LatLng } from "../domain/LatLng";
import { StravaAPIService } from "./strava-api.service";
import { BehaviorSubject } from "rxjs/BehaviorSubject";
import { Observable } from "rxjs/Observable";
import { StreamResolution, STREAM_RESOLUTIONS } from "../domain/StreamResolutions";
import { LatLngStream } from "../domain/LatLngStream";
import { Position } from 'geojson';
import { SnapToRoadService } from "./snap-to-road.service";

@Injectable()
export class ActivityLoaderService {
    private _logs: BehaviorSubject<string[]> = new BehaviorSubject<string[]>([]);

    public constructor(
        private readonly stravaAuthService: StravaAuthService,
        private readonly httpClient: HttpClient,
        private readonly firestore: AngularFirestore,
        private readonly stravaAPIService: StravaAPIService,
        private readonly snapToRoadService: SnapToRoadService,
    ) {
    }

    public async load() {
        const token = await this.stravaAuthService.getAuthToken();

        await this.loadAthlete();
        await this.loadActivities();
    }

    private async loadAthlete(): Promise<void> {
        this.addLogs('Loading athlete...');
        const athlete = await this.stravaAPIService.getAthlete();

        this.addLogs(`Loaded athlete ${athlete.firstname} ${athlete.lastname}`);
        await this.firestore.collection('athletes').doc(String(athlete.id)).set(athlete);
    }

    private async loadActivities(): Promise<void> {
        this.addLogs('Loading activities...');
        let activities = await this.stravaAPIService.getActivities();
        activities = activities.filter(activity => !!activity.map.summary_polyline);

        this.addLogs(`${activities.length} activities found`);
        let activityCounter = 1;
        for (const activity of activities) {
            this.addLogs(`Loading activity details... [${activityCounter++} of ${activities.length}]`);

            const activityDoc = this.firestore.collection('athletes').doc(String(activity.athlete.id)).collection('activities').doc(String(activity.id));
            const snap = await activityDoc.snapshotChanges().take(1).toPromise();
            if (snap.payload.exists) {
                this.addLogs('Skipped');
            } else {
                await this.loadActivity(activity);
                await this.loadStreams(activity);
            }
        }
    }

    private async loadActivity(activity: DetailedActivity) {
        const activityDoc = this.firestore.collection('athletes').doc(String(activity.athlete.id)).collection('activities').doc(String(activity.id));
        activity = await this.stravaAPIService.getActivity(activity.id);
        activityDoc.set(activity);
    }

    private async loadStreams(activity: DetailedActivity): Promise<void> {
        const activityDoc = this.firestore.collection('athletes').doc(String(activity.athlete.id)).collection('activities').doc(String(activity.id));

        const promises: Promise<any>[] = [];
        for (const resolution of STREAM_RESOLUTIONS) {
            const streams = await this.stravaAPIService.getStreams(activity.id, resolution);

            for (const stream of streams) {
                let data: any = stream.data;
                if ((<any>stream).type === 'latlng') {
                    data = (<LatLng[]>data).map(coord => ({
                        lat: coord[0],
                        lng: coord[1],
                    }));
                }

                promises.push(activityDoc.collection((<any>stream).type).doc(stream.resolution).set({
                    data,
                    series_type: stream.series_type,
                }));
            }
        }

        await Promise.all(promises);
    }

    public addLogs(text: string): void {
        const prevLogs = this._logs.value;
        prevLogs.push(text);
        this._logs.next(prevLogs);
    }

    public get logs(): Observable<string[]> {
        return this._logs.asObservable();
    }
}