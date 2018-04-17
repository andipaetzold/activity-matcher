import { Component, OnInit } from "@angular/core";
import { Observable } from "rxjs/Observable";
import { of } from 'rxjs/observable/of';
import { ActivatedRoute, Router } from "@angular/router";
import 'rxjs/add/operator/map';

import { environment } from "environments/environment";
import { StravaAuthService } from "../../services/strava-auth.service";
import { ActivityLoaderService } from "../../services/activity-loader.service";

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit {
    public constructor(
        private readonly stravaAuthService: StravaAuthService,
        private readonly activatedRoute: ActivatedRoute,
        private readonly router: Router,
        private readonly activityLoaderService: ActivityLoaderService,
    ) {
    }

    public ngOnInit(): void {
        if (this.activatedRoute.snapshot.queryParamMap.has('code')) {
            this.stravaAuthService.code = this.activatedRoute.snapshot.queryParamMap.get('code');
        }
    }

    public isLoggedIn(): Observable<boolean> {
        return this.stravaAuthService.currentCode.map(code => !!code);
    }

    public get loginUrl(): string {
        return `https://www.strava.com/oauth/authorize?client_id=${environment.strava.clientId}&amp;response_type=code&amp;redirect_uri=${environment.strava.redirectUri}&amp;approval_prompt=force`;
    }

    public logout(): void {
        this.stravaAuthService.code = undefined;
    }

    public async load(): Promise<void> {
        await this.activityLoaderService.load();
    }
}