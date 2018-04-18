import { Injectable } from "@angular/core";
import { DetailedAthlete } from "../domain/DetailedAthlete";
import { DetailedActivity } from "../domain/DetailedActivity";
import { HttpClient } from "@angular/common/http";
import { StravaAuthService } from "./strava-auth.service";
import { HeartrateStream } from "../domain/HeartrateStream";
import { DistanceStream } from "app/domain/DistanceStream";
import { LatLngStream } from "../domain/LatLngStream";
import { AltitudeStream } from "app/domain/AltitudeStream";
import { TimeStream } from "app/domain/TimeStream";
import { SmoothVelocityStream } from "../domain/SmoothVelocityStream";

@Injectable()
export class StravaAPIService {
    public constructor(
        private readonly httpClient: HttpClient,
        private readonly stravaAuthService: StravaAuthService,
    ) {
    }

    public async getAthlete(): Promise<DetailedAthlete> {
        const token = await this.stravaAuthService.getAuthToken();
        return await this.httpClient.get<DetailedAthlete>(`https://www.strava.com/api/v3/athlete?access_token=${token}`).toPromise();
    }

    public async getActivities(): Promise<DetailedActivity[]> {
        const token = await this.stravaAuthService.getAuthToken();
        return await this.httpClient.get<DetailedActivity[]>(`https://www.strava.com/api/v3/athlete/activities?access_token=${token}`).toPromise();
    }

    public async getActivity(activityId: number): Promise<DetailedActivity> {
        const token = await this.stravaAuthService.getAuthToken();
        return await this.httpClient.get<DetailedActivity>(`https://www.strava.com/api/v3/activities/${activityId}?access_token=${token}`).toPromise();
    }

    public async getAltitudeStream(activityId: number): Promise<AltitudeStream> {
        const token = await this.stravaAuthService.getAuthToken();
        return await this.httpClient
            .get<[DistanceStream, AltitudeStream]>(`https://www.strava.com/api/v3/activities/${activityId}/streams/altitude?access_token=${token}`)
            .map(r => r[0])
            .toPromise();;
    }

    public async getHeartRateStream(activityId: number): Promise<HeartrateStream> {
        const token = await this.stravaAuthService.getAuthToken();
        return await this.httpClient
            .get<[DistanceStream, HeartrateStream]>(`https://www.strava.com/api/v3/activities/${activityId}/streams/heartrate?access_token=${token}`)
            .map(r => r[1])
            .toPromise();
    }

    public async getLatlngStream(activityId: number): Promise<LatLngStream> {
        const token = await this.stravaAuthService.getAuthToken();
        return await this.httpClient
            .get<[LatLngStream, DistanceStream]>(`https://www.strava.com/api/v3/activities/${activityId}/streams/latlng?access_token=${token}`)
            .map(r => r[0])
            .toPromise();
    }

    public async getTimeStream(activityId: number): Promise<TimeStream> {
        const token = await this.stravaAuthService.getAuthToken();
        return await this.httpClient
            .get<[DistanceStream, TimeStream]>(`https://www.strava.com/api/v3/activities/${activityId}/streams/time?access_token=${token}`)
            .map(r => r[1])
            .toPromise();
    }

    public async getVelocityStream(activityId: number): Promise<SmoothVelocityStream> {
        const token = await this.stravaAuthService.getAuthToken();
        return await this.httpClient
            .get<[DistanceStream, SmoothVelocityStream]>(`https://www.strava.com/api/v3/activities/${activityId}/streams/velocity_smooth?access_token=${token}`)
            .map(r => r[1])
            .toPromise();
    }

    public async getDistanceStream(activityId: number): Promise<DistanceStream> {
        const token = await this.stravaAuthService.getAuthToken();
        return await this.httpClient
            .get<[DistanceStream, SmoothVelocityStream]>(`https://www.strava.com/api/v3/activities/${activityId}/streams/velocity_smooth?access_token=${token}`)
            .map(r => r[0])
            .toPromise();
    }
}