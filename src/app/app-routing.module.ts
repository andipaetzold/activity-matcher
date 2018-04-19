import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { HomeComponent } from 'app/components/home/home.component';
import { ActivitiesComponent } from './components/activities/activities.component';
import { SnapToRoadComponent } from './components/snap-to-road/snap-to-road.component';
import { LapDetectionComponent } from './components/lap-detection/lap-detection.component';


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
        path: 'snap-to-road',
        component: SnapToRoadComponent,
    },
    {
        path: 'lap-detection',
        component: LapDetectionComponent,
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
