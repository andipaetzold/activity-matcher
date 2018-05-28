import { NgModule } from '@angular/core';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BrowserModule } from '@angular/platform-browser';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AngularFireModule } from 'angularfire2';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { NgMathPipesModule } from 'angular-pipes';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';

import { AppComponent } from 'app/app.component';
import { AppRoutingModule } from 'app/app-routing.module';
import { environment } from 'environments/environment';
import { HomeComponent } from './components/home/home.component';
import { NavComponent } from './components/nav/nav.component';
import { StravaAuthService } from './services/strava-auth.service';
import { ActivityLoaderService } from './services/activity-loader.service';
import { AngularFirestoreModule } from 'angularfire2/firestore';
import { ActivitiesComponent } from './components/activities/activities.component';
import { SnapToRoadComponent } from './components/snap-to-road/snap-to-road.component';
import { MapComponent } from './components/map/map.component';
import { StravaAPIService } from './services/strava-api.service';
import { SnapToRoadService } from 'app/services/snap-to-road.service';
import { MapMapboxComponent } from 'app/components/map-mapbox/map-mapbox.component';
import { MapGoogleComponent } from 'app/components/map-google/map-google.component';
import { LapDetectionComponent } from 'app/components/lap-detection/lap-detection.component';
import { CompareRoutesComponent } from 'app/components/compare-routes/compare-routes.component';
import { CompareRoutesService } from 'app/services/compare-routes.service';
import { SimplifyComponent } from './components/simplify/simplify.component';
import { SimplifyService } from './services/simplify.service';
import { LapDetectionService } from 'app/services/lap-detection.service';
import { LiveCompareComponent } from 'app/components/live-compare/live-compare.component';
import { LiveCompareService } from 'app/services/live-compare.service';

@NgModule({
    declarations: [
        AppComponent,
        CompareRoutesComponent,
        NavComponent,
        HomeComponent,
        LapDetectionComponent,
        ActivitiesComponent,
        SnapToRoadComponent,
        SimplifyComponent,
        MapComponent,
        MapGoogleComponent,
        MapMapboxComponent,
        LiveCompareComponent,
    ],
    providers: [
        ActivityLoaderService,
        SnapToRoadService,
        StravaAuthService,
        StravaAPIService,
        CompareRoutesService,
        SimplifyService,
        LapDetectionService,
        LiveCompareService,
    ],
    imports: [
        AppRoutingModule,

        AngularFireModule.initializeApp(environment.firebase),
        AngularFirestoreModule.enablePersistence(),

        BrowserModule,
        BrowserAnimationsModule,
        FormsModule,
        HttpClientModule,

        MatButtonModule,
        MatCardModule,
        MatInputModule,
        MatListModule,
        MatPaginatorModule,
        MatSelectModule,
        MatSidenavModule,
        MatTableModule,
        MatTabsModule,
        MatToolbarModule,

        NgMathPipesModule,
    ],
    bootstrap: [AppComponent]
})
export class AppModule { }
