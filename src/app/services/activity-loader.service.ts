import { Injectable } from "@angular/core";
import { StravaAuthService } from "./strava-auth.service";
import { HttpClient } from "@angular/common/http";
import { AngularFirestore, AngularFirestoreDocument, AngularFirestoreCollection } from 'angularfire2/firestore';
import { DetailedAthlete } from "../domain/DetailedAthlete";
import { DetailedActivity } from "../domain/DetailedActivity";
import { LatLng } from "../domain/LatLng";

@Injectable()
export class ActivityLoaderService {
    public constructor(
        private readonly stravaAuthService: StravaAuthService,
        private readonly httpClient: HttpClient,
        private readonly firestore: AngularFirestore,
    ) {
    }

    public async load() {
        const token = await this.stravaAuthService.getAuthToken();

        await this.loadAthlete(token);
        await this.loadActivities(token);
    }

    private async loadAthlete(token: string): Promise<void> {
        const athlete = await this.httpClient.get<DetailedAthlete>(`https://www.strava.com/api/v3/athlete?access_token=${token}`).toPromise();
        await this.firestore.collection('athletes').doc(String(athlete.id)).set(athlete);
    }

    private async loadActivities(token: string): Promise<void> {
        let activities = await this.httpClient.get<DetailedActivity[]>(`https://www.strava.com/api/v3/athlete/activities?access_token=${token}`).toPromise();
        activities = activities.filter(activity => !!activity.map.summary_polyline);

        for (const activity of activities) {
            await this.loadActivity(token, activity);
            await this.loadStreams(token, activity);
        }
    }

    private async loadActivity(token: string, activity: DetailedActivity) {
        const activityDoc = this.firestore.collection('athletes').doc(String(activity.athlete.id)).collection('activities').doc(String(activity.id));
        activity = await this.httpClient.get<DetailedActivity>(`https://www.strava.com/api/v3/activities/${activity.id}?access_token=${token}`).toPromise();
        activityDoc.set(activity);
    }

    private async loadStreams(token: string, activity: DetailedActivity) {
        const activityDoc = this.firestore.collection('athletes').doc(String(activity.athlete.id)).collection('activities').doc(String(activity.id));
        const dataDoc = activityDoc.collection('data');

        const ALTITUDE_URI = `https://www.strava.com/api/v3/activities/${activity.id}/streams/altitude?access_token=${token}`;
        const VELOCITY_URI = `https://www.strava.com/api/v3/activities/${activity.id}/streams/velocity_smooth?access_token=${token}`;
        const HEARTRATE_URI = `https://www.strava.com/api/v3/activities/${activity.id}/streams/heartrate?access_token=${token}`;
        const TIME_URI = `https://www.strava.com/api/v3/activities/${activity.id}/streams/time?access_token=${token}`;
        const LATLNG_URI = `https://www.strava.com/api/v3/activities/${activity.id}/streams/latlng?access_token=${token}`;

        let responses: Promise<any>[] = [
            this.httpClient.get(ALTITUDE_URI).toPromise(),
            this.httpClient.get(HEARTRATE_URI).toPromise(),
            this.httpClient.get(LATLNG_URI).toPromise(),
            this.httpClient.get(TIME_URI).toPromise(),
            this.httpClient.get(VELOCITY_URI).toPromise(),
        ];
        let responsesData = await Promise.all(responses);
        responsesData = responsesData.reduce((a, b) => [...a, ...b], []);

        await dataDoc.doc('distance').set(responsesData.find(r => r.type === 'distance'));
        await dataDoc.doc('altitude').set(responsesData.find(r => r.type === 'altitude'));
        if (responsesData.find(r => r.type == 'heartrate')) {
            await dataDoc.doc('heartrate').set(responsesData.find(r => r.type === 'heartrate'));
        }
        await dataDoc.doc('time').set(responsesData.find(r => r.type === 'time'));
        await dataDoc.doc('velocity').set(responsesData.find(r => r.type === 'velocity_smooth'));

        const latlngResponse = responsesData.find(r => r.type === 'latlng');
        latlngResponse.data = latlngResponse.data.map((e: LatLng): any => ({ lat: e[0], lng: e[1] }));
        await dataDoc.doc('coordinates').set(latlngResponse);
    }
}