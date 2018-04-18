import { Injectable } from "@angular/core";
import { StravaAuthService } from "./strava-auth.service";
import { HttpClient } from "@angular/common/http";
import { AngularFirestore, AngularFirestoreDocument, AngularFirestoreCollection } from 'angularfire2/firestore';
import { DetailedAthlete } from "../domain/DetailedAthlete";
import { DetailedActivity } from "../domain/DetailedActivity";
import { LatLng } from "../domain/LatLng";
import { StravaAPIService } from "./strava-api.service";

@Injectable()
export class ActivityLoaderService {
    public constructor(
        private readonly stravaAuthService: StravaAuthService,
        private readonly httpClient: HttpClient,
        private readonly firestore: AngularFirestore,
        private readonly stravaAPIService: StravaAPIService,
    ) {
    }

    public async load() {
        const token = await this.stravaAuthService.getAuthToken();

        await this.loadAthlete();
        await this.loadActivities();
    }

    private async loadAthlete(): Promise<void> {
        const athlete = await this.stravaAPIService.getAthlete();
        await this.firestore.collection('athletes').doc(String(athlete.id)).set(athlete);
    }

    private async loadActivities(): Promise<void> {
        let activities = await this.stravaAPIService.getActivities();
        activities = activities.filter(activity => !!activity.map.summary_polyline);

        for (const activity of activities) {
            await this.loadActivity(activity);
            // await this.loadStreams(activity);
        }
    }

    private async loadActivity(activity: DetailedActivity) {
        const activityDoc = this.firestore.collection('athletes').doc(String(activity.athlete.id)).collection('activities').doc(String(activity.id));
        activity = await this.stravaAPIService.getActivity(activity.id);
        activityDoc.set(activity);
    }

    private async loadStreams(activity: DetailedActivity): Promise<void> {
        const activityDoc = this.firestore.collection('athletes').doc(String(activity.athlete.id)).collection('activities').doc(String(activity.id));
        const dataDoc = activityDoc.collection('data');

        await dataDoc.doc('altitude').set(await this.stravaAPIService.getAltitudeStream(activity.id));

        const heartrate = await this.stravaAPIService.getHeartRateStream(activity.id);
        if (heartrate) {
            await dataDoc.doc('heartrate').set(heartrate);
        }

        await dataDoc.doc('time').set(await this.stravaAPIService.getTimeStream(activity.id));
        await dataDoc.doc('velocity').set(await this.stravaAPIService.getVelocityStream(activity.id));

        const latlngResponse: any = await this.stravaAPIService.getLatlngStream(activity.id);
        latlngResponse.data = latlngResponse.data.map((e: LatLng): any => ({ lat: e[0], lng: e[1] }));
        await dataDoc.doc('coordinates').set(latlngResponse);
    }
}