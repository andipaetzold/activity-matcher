import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef } from "@angular/core";
import { AngularFirestore } from "angularfire2/firestore";
import { StravaAuthService } from "../../services/strava-auth.service";
import { Observable } from "rxjs/Observable";
import { HttpClient } from "@angular/common/http";
import { PageEvent } from "@angular/material/paginator";
import { DetailedActivity } from "../../domain/DetailedActivity";
import { DistanceStream } from "app/domain/DistanceStream";
import { ActivityType } from "../../domain/ActivityType";
@Component({
    selector: 'app-activities',
    templateUrl: './activities.component.html'
})
export class ActivitiesComponent implements OnInit {
    public displayedColumns = ['name', 'date', 'distance', 'duration', 'dataPoints', 'speed', 'avgDataPointGap', 'link'];
    public activities: DetailedActivity[] = [];
    public displayedActivities: any[] = [];

    public activityTypes: ActivityType[] = ['Run', 'Ride', 'InlineSkate', 'AlpineSki', 'BackcountrySki', 'Canoeing', 'Crossfit', 'EBikeRide', 'Elliptical', 'Hike', 'IceSkate', 'Kayaking', 'Kitesurf', 'NordicSki', 'RockClimbing', 'RollerSki', 'Rowing', 'Snowboard', 'Snowshoe', 'StairStepper', 'StandUpPaddling', 'Surfing', 'Swim', 'VirtualRide', 'Walk', 'WeightTraining', 'Windsurf', 'Workout', 'YogaSwim', 'VirtualRide', 'Walk', 'WeightTraining', 'Windsurf', 'Workout', 'Yoga'];

    private _selectedActivity: DetailedActivity = undefined;
    public selectedActivityType: ActivityType | 'all' = 'all';

    public constructor(
        private readonly stravaAuthService: StravaAuthService,
        private readonly firestore: AngularFirestore,
        private readonly httpClient: HttpClient,
        private readonly cdr: ChangeDetectorRef,
    ) {
    }

    public async ngOnInit(): Promise<void> {
        await this.stravaAuthService.refreshToken();

        if (this.stravaAuthService.token) {
            const athlete: any = await this.httpClient.get(`https://www.strava.com/api/v3/athlete?access_token=${this.stravaAuthService.token}`).toPromise();

            this.activities = await this.firestore
                .collection('athletes').doc(String(athlete.id))
                .collection<DetailedActivity>('activities', ref => ref.orderBy('start_date'))
                .valueChanges()
                .map(a => a.reverse())
                .take(1).toPromise();

            this.pageChanged({
                pageIndex: 0,
                pageSize: 10,
                length: this.activities.length,
            });
            this.cdr.detectChanges();

            for (let activity of this.activities) {
                (<any>activity).dataPoints = await this.firestore
                    .collection('athletes').doc(String(athlete.id))
                    .collection('activities').doc(String(activity.id))
                    .collection('distance').doc<DistanceStream>('high')
                    .valueChanges()
                    .take(1)
                    .map(stream => stream.data.length)
                    .toPromise();
                this.cdr.detectChanges();
            }
        }
    }

    public pageChanged(event: PageEvent) {
        this.displayedActivities = this.activities.slice(event.pageIndex * event.pageSize, (event.pageIndex + 1) * event.pageSize);
    }

    public get statisticsActivities(): DetailedActivity[] {
        return this.activities.filter(a => a.type === this.selectedActivityType || this.selectedActivityType === 'all');
    }

    public get totalDataPoints() {
        return this.statisticsActivities.map(a => (<any>a).dataPoints).reduce((prev, cur) => prev + cur, 0);
    }

    public get totalDistance() {
        return this.statisticsActivities.map(a => a.distance).reduce((prev, cur) => prev + cur, 0);
    }

    public get totalDuration() {
        return this.statisticsActivities.map(a => a.elapsed_time).reduce((prev, cur) => prev + cur, 0);
    }
}