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
import { AllStreams } from "../domain/AllStreams";
import { StreamResolution } from "../domain/StreamResolutions";

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

        const activities: DetailedActivity[] = [];

        let page = 1;
        while (true) {
            const activitiesPage = await this.httpClient.get<DetailedActivity[]>(`https://www.strava.com/api/v3/athlete/activities?page=${page++}&access_token=${token}`).toPromise();

            if (activitiesPage.length == 0) {
                break;
            }

            activities.push(...activitiesPage);
        }

        return activities;

    }

    public async getActivity(activityId: number): Promise<DetailedActivity> {
        const token = await this.stravaAuthService.getAuthToken();
        return await this.httpClient.get<DetailedActivity>(`https://www.strava.com/api/v3/activities/${activityId}?access_token=${token}`).toPromise();
    }

    public async getStreams(activityId: number, resolution: StreamResolution): Promise<AllStreams> {
        const token = await this.stravaAuthService.getAuthToken();

        const url = `https://www.strava.com/api/v3/activities/${activityId}/streams?resolution=${resolution}&keys=altitude,heartrate,latlng,time,velocity_smooth,distance&access_token=${token}`;
        return await this.httpClient
            .get<AllStreams>(url)
            .toPromise();
    }
}