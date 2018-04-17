import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef } from "@angular/core";
import { AngularFirestore } from "angularfire2/firestore";
import { StravaAuthService } from "../../services/strava-auth.service";
import { Observable } from "rxjs/Observable";
import { HttpClient } from "@angular/common/http";
import { PageEvent } from "@angular/material/paginator";
@Component({
    selector: 'app-activities',
    templateUrl: './activities.component.html'
})
export class ActivitiesComponent implements OnInit {
    public displayedColumns = ['name', 'date', 'distance', 'duration', 'link'];
    public activities: any[] = [];
    public displayedActivities: any[] = [];

    private token: string = undefined;
    private _selectedActivity: any = undefined;

    public constructor(
        private readonly stravaAuthService: StravaAuthService,
        private readonly firestore: AngularFirestore,
        private readonly httpClient: HttpClient,
        private readonly cdr: ChangeDetectorRef,
    ) {
    }

    public async ngOnInit(): Promise<void> {
        this.token = await this.stravaAuthService.getAuthToken();

        if (this.token) {
            const athlete: any = await this.httpClient.get(`https://www.strava.com/api/v3/athlete?access_token=${this.token}`).toPromise();

            this.activities = await this.firestore.collection('athletes').doc(String(athlete.id)).collection('activities').valueChanges().take(1).toPromise();
            this.pageChanged({
                pageIndex: 0,
                pageSize: 10,
                length: this.activities.length,
            });
            this.cdr.detectChanges();
        }
    }

    public pageChanged(event: PageEvent) {
        this.displayedActivities = this.activities.slice(event.pageIndex * event.pageSize, (event.pageIndex + 1) * event.pageSize);
    }
}