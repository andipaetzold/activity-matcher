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

import { AppComponent } from 'app/app.component';
import { AppRoutingModule } from 'app/app-routing.module';
import { environment } from 'environments/environment';
import { HomeComponent } from './components/home/home.component';
import { NavComponent } from './components/nav/nav.component';
import { StravaAuthService } from './services/strava-auth.service';
import { ActivityLoaderService } from './services/activity-loader.service';
import { AngularFirestoreModule } from 'angularfire2/firestore';
import { ActivitiesComponent } from './components/activities/activities.component';

@NgModule({
    declarations: [
        AppComponent,
        NavComponent,
        HomeComponent,
        ActivitiesComponent,
    ],
    providers: [
        ActivityLoaderService,
        StravaAuthService,
    ],
    imports: [
        AppRoutingModule,

        AngularFireModule.initializeApp(environment.firebase),
        AngularFirestoreModule,

        BrowserModule,
        BrowserAnimationsModule,
        HttpClientModule,

        MatButtonModule,
        MatCardModule,
        MatListModule,
        MatPaginatorModule,
        MatSidenavModule,
        MatTableModule,
        MatToolbarModule,

        NgMathPipesModule,
    ],
    bootstrap: [AppComponent]
})
export class AppModule { }
