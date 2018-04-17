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

import { AppComponent } from 'app/app.component';
import { AppRoutingModule } from 'app/app-routing.module';
import { environment } from 'environments/environment';
import { HomeComponent } from './components/home/home.component';
import { NavComponent } from './components/nav/nav.component';
import { StravaAuthService } from './services/strava-auth.service';
import { ActivityLoaderService } from './services/activity-loader.service';
import { AngularFirestoreModule } from 'angularfire2/firestore';

@NgModule({
    declarations: [
        AppComponent,
        NavComponent,
        HomeComponent,
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
        MatSidenavModule,
        MatToolbarModule,

        AngularFireModule.initializeApp(environment.firebase),
    ],
    bootstrap: [AppComponent]
})
export class AppModule { }
