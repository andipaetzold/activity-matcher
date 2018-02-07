import * as polyline from 'polyline';
import * as firebase from 'firebase/app';
import { Position } from "@turf/turf";
import 'firebase/firestore';

import { SimilarityCalculator } from "./similarity-calculator";
import { displayLaps } from "./lap-calculator";
import { initFirestore } from "./firebase";
import { fitToBounds, clearMap, addLineLayer, addPointLayer, addCircleAroudPointsLayer } from "./map";
import { getRandomColor } from "./util";
import { optionsMaxDistanceForSimilarity, optionsDrawCirclesAroundPoints, optionsCoordinateQuality, optionsCalculateLaps, optionsCalculateSimilarActivities, optionsFitToBounds } from "./options";
import { showLoading, hideLoading } from "./loading";
import { Coordinate } from "./domain/Coordinate";
import { Activity } from "./domain/Activity";

export class ActivityLoader {
    private visibleActivities: number[] = [];
    private similarityCalculator: SimilarityCalculator = new SimilarityCalculator();
    private firestore = initFirestore();

    constructor(private token: any) {
    }

    async loadActivities() {
        this.firestore.collection('athletes')
            .doc(this.token.athlete.id.toString())
            .collection('activities')
            .orderBy('start_date')
            .onSnapshot(snap => {
                this.clearActivityTable();
                snap.docChanges.forEach(change => {
                    this.addActivityToTable(<Activity>change.doc.data());
                });
            });

        const ACTIVITIES_URI = `https://www.strava.com/api/v3/athlete/activities?access_token=${this.token.access_token}`;
        let activities = await fetch(ACTIVITIES_URI).then(response => response.json());
        activities = activities.filter((activity: any) => !!activity.map.summary_polyline);

        for (let activity of activities) {
            this.loadActivity(activity.id);
        }
    }

    activityRef(activityId: number) {
        return this.firestore.collection('athletes').doc(this.token.athlete.id.toString()).collection('activities').doc(activityId.toString());
    }

    async loadActivity(activityId: number) {
        const docRef = this.activityRef(activityId);
        const doc = await docRef.get();
        if (doc.exists) {
            const docData = doc.data();

            docData.map.polyline = polyline.decode(docData.map.polyline).map((coord: Position): Position => [coord[1], coord[0]]);
            docData.map.summary_polyline = polyline.decode(docData.map.summary_polyline).map((coord: Position): Position => [coord[1], coord[0]]);

            return docData;
        } else {
            const ACTIVITY_URI = `https://www.strava.com/api/v3/activities/${activityId}?access_token=${this.token.access_token}`;
            const activity = await fetch(ACTIVITY_URI).then(response => response.json());
            await docRef.set(activity);
            return activity;
        }
    }

    async loadDoc(activityId: number, docId: string): Promise<firebase.firestore.DocumentData> {
        const docRef = this.activityRef(activityId).collection('data').doc(docId);
        const doc = await docRef.get();

        if (doc.exists) {
            return doc.data();
        } else {
            await this.loadAllData(activityId);
            return this.loadDoc(activityId, docId);
        }
    }

    async loadAltitude(activityId: number) {
        return await this.loadDoc(activityId, 'altitude');
    }

    async loadVelocity(activityId: number) {
        return await this.loadDoc(activityId, 'velocity');
    }

    async loadHeartrate(activityId: number) {
        return await this.loadDoc(activityId, 'heartrate');
    }

    async loadTime(activityId: number) {
        return await this.loadDoc(activityId, 'time');
    }

    async loadCoordinates(activityId: number) {
        return await this.loadDoc(activityId, 'coordinates');
    }

    async loadDistance(activityId: number) {
        return await this.loadDoc(activityId, 'distance');
    }

    async loadAllData(activityId: number) {
        const ALTITUDE_URI = `https://www.strava.com/api/v3/activities/${activityId}/streams/altitude?access_token=${this.token.access_token}`;
        const VELOCITY_URI = `https://www.strava.com/api/v3/activities/${activityId}/streams/velocity_smooth?access_token=${this.token.access_token}`;
        const HEARTRATE_URI = `https://www.strava.com/api/v3/activities/${activityId}/streams/heartrate?access_token=${this.token.access_token}`;
        const TIME_URI = `https://www.strava.com/api/v3/activities/${activityId}/streams/time?access_token=${this.token.access_token}`;
        const LATLNG_URI = `https://www.strava.com/api/v3/activities/${activityId}/streams/latlng?access_token=${this.token.access_token}`;

        let responses: Promise<Response>[] = [
            fetch(ALTITUDE_URI),
            fetch(HEARTRATE_URI),
            fetch(LATLNG_URI),
            fetch(TIME_URI),
            fetch(VELOCITY_URI),
        ];
        const resolvedResponses = await Promise.all(responses);
        let responsesData = await Promise.all(resolvedResponses.map(response => response.json()));
        responsesData = responsesData.reduce((a, b) => [...a, ...b], []);

        await this.activityRef(activityId).collection('data').doc('distance').set(responsesData.find(r => r.type === 'distance'));
        await this.activityRef(activityId).collection('data').doc('altitude').set(responsesData.find(r => r.type === 'altitude'));
        if (responsesData.find(r => r.type == 'heartrate')) {
            await this.activityRef(activityId).collection('data').doc('heartrate').set(responsesData.find(r => r.type === 'heartrate'));
        }
        await this.activityRef(activityId).collection('data').doc('time').set(responsesData.find(r => r.type === 'time'));
        await this.activityRef(activityId).collection('data').doc('velocity').set(responsesData.find(r => r.type === 'velocity_smooth'));

        const latlngResponse = responsesData.find(r => r.type === 'latlng');
        latlngResponse.data = latlngResponse.data.map((e: Position): Coordinate => ({ lat: e[0], lng: e[1] }));
        await this.activityRef(activityId).collection('data').doc('coordinates').set(latlngResponse);
    }

    clearActivityTable() {
        const table = document.getElementById('activity-table');
        while (table.hasChildNodes()) {
            table.removeChild(table.firstChild);
        }
    }

    addActivityToTable(activity: Activity) {
        if (!activity) {
            return;
        }

        const row = document.createElement('tr');

        const cellDate = document.createElement('td');
        cellDate.innerText = new Date(activity.start_date).toLocaleDateString();

        const cellDistance = document.createElement('td');
        cellDistance.innerText = `${Math.floor(activity.distance / 1000)}km`;

        const cellDuration = document.createElement('td');
        cellDuration.innerText = `${Math.floor(activity.elapsed_time / 60)}min`;

        const cellType = document.createElement('td');
        cellType.innerText = activity.type;

        const cellCommute = document.createElement('td');
        cellCommute.innerText = activity.commute ? 'Yes' : 'No';

        const cellDisplay = document.createElement('td');
        const buttonDisplay = document.createElement('button');
        buttonDisplay.innerText = "Display";
        buttonDisplay.type = "button";
        buttonDisplay.classList.add('btn');
        buttonDisplay.classList.add('btn-sm');
        buttonDisplay.addEventListener('click', async () => {
            if (buttonDisplay.classList.contains('btn-primary')) {
                buttonDisplay.classList.remove('btn-primary');
                this.visibleActivities.splice(this.visibleActivities.indexOf(activity.id), 1);
            } else {
                buttonDisplay.classList.add('btn-primary');
                this.visibleActivities.push(activity.id);
            }

            await this.updateMap();
        });
        cellDisplay.appendChild(buttonDisplay);

        row.appendChild(cellDate);
        row.appendChild(cellDistance);
        row.appendChild(cellDuration);
        row.appendChild(cellType);
        row.appendChild(cellCommute);
        row.appendChild(cellDisplay);

        document.getElementById('activity-table').insertBefore(row, document.getElementById('activity-table').childNodes[0]);
    }

    async getCoordinates(activityId: number) {
        let activity;
        switch (optionsCoordinateQuality()) {
            case 1:
                activity = await this.loadActivity(activityId);
                return activity.map.summary_polyline;
            case 2:
                activity = await this.loadActivity(activityId);
                return activity.map.polyline;
            case 3:
                const coordinateData = await this.loadCoordinates(activityId);
                return coordinateData.data.map((coord: Coordinate): Position => [coord.lng, coord.lat]);
        }
    }

    async displayCalculations() {
        const routes = []
        for (let activityId of this.visibleActivities) {
            const coordinates = await this.getCoordinates(activityId);

            if (optionsCalculateLaps()) {
                displayLaps(coordinates);
            }

            routes.push(coordinates);
        }

        if (optionsCalculateSimilarActivities()) {
            this.similarityCalculator.drawSimilarLines(routes);
        }
    }

    async displayActivities() {
        for (const activityId of this.visibleActivities) {
            const coordinates = await this.getCoordinates(activityId);
            addLineLayer(coordinates, 'black', 1);
            addPointLayer(coordinates[0], 'green');
            addPointLayer(coordinates[coordinates.length - 1], 'red');
        }
    }

    async displayCirclesAroundPoints() {
        if (optionsDrawCirclesAroundPoints()) {
            for (let activityId of this.visibleActivities) {
                const coordinates = await this.getCoordinates(activityId);
                addCircleAroudPointsLayer(coordinates, getRandomColor(), 'lightgreen', optionsMaxDistanceForSimilarity());
            }
        }
    }

    async updateMap() {
        showLoading();

        clearMap();
        await this.displayCirclesAroundPoints();
        await this.displayActivities();
        await this.displayCalculations();

        if (optionsFitToBounds()) {
            fitToBounds();
        }

        hideLoading();
    }
}
