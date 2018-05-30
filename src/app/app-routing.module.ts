import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { HomeComponent } from 'app/components/home/home.component';
import { ActivitiesComponent } from 'app/components/activities/activities.component';
import { SnapToRoadComponent } from 'app/components/snap-to-road/snap-to-road.component';
import { LapDetectionComponent } from 'app/components/lap-detection/lap-detection.component';
import { CompareRoutesComponent } from 'app/components/compare-routes/compare-routes.component';
import { SimplifyComponent } from 'app/components/simplify/simplify.component';
import { LiveCompareComponent } from 'app/components/live-compare/live-compare.component';
import { LiveLapDetectionComponent } from 'app/components/live-lap-detection/live-lap-detection.component';


const routes: Routes = [
    {
        path: '',
        component: HomeComponent,
    },
    {
        path: 'activities',
        component: ActivitiesComponent,
    },
    {
        path: 'compare-routes',
        component: CompareRoutesComponent,
    },
    {
        path: 'snap-to-road',
        component: SnapToRoadComponent,
    },
    {
        path: 'simplify',
        component: SimplifyComponent,
    },
    {
        path: 'lap-detection',
        component: LapDetectionComponent,
    },
    {
        path: 'live-compare',
        component: LiveCompareComponent,
    },
    {
        path: 'live-lap-detection',
        component: LiveLapDetectionComponent,
    },
    {
        path: '**',
        redirectTo: '',
        pathMatch: 'full'
    },
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule { }
