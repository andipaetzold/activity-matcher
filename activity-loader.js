import { SimilarityCalculator } from "./similarity-calculator.js";
import { displayLaps } from "./lap-calculator.js";
import { initFirestore } from "./firebase.js";
import { fitToBounds, clearMap, addLineLayer, addPointLayer, addCircleAroudPointsLayer } from "./map.js";
import { getRandomColor } from "./util.js";
import { optionsMaxDistanceForSimilarity, optionsDrawCirclesAroundPoints, optionsCoordinateQuality, optionsCalculateLaps, optionsCalculateSimilarActivities, optionsFitToBounds } from "./options.js";

export class ActivityLoader {
    constructor(token) {
        this.token = token;

        this.firestore = initFirestore();

        this.similarityCalculator = new SimilarityCalculator();

        this.visibleActivities = [];
    }

    async loadActivities() {
        this.firestore.collection('athletes')
            .doc(this.token.athlete.id.toString())
            .collection('activities')
            .orderBy('start_date')
            .onSnapshot(snap => {
                this.clearActivityTable();
                snap.docChanges.forEach(change => {
                    this.addActivityToTable(change.doc.data());
                });
            });

        const ACTIVITIES_URI = `https://www.strava.com/api/v3/athlete/activities?access_token=${this.token.access_token}`;
        let activities = await fetch(ACTIVITIES_URI).then(response => response.json());
        activities = activities.filter(activity => !!activity.map.summary_polyline);

        for (let activity of activities) {
            this.loadActivity(activity.id);
        }
    }

    activityRef(activityId) {
        return this.firestore.collection('athletes').doc(this.token.athlete.id.toString()).collection('activities').doc(activityId.toString());
    }

    async loadActivity(activityId) {
        const docRef = this.activityRef(activityId);
        const doc = await docRef.get();
        if (doc.exists) {
            const docData = doc.data();

            docData.map.polyline = polyline.decode(docData.map.polyline).map(coord => [coord[1], coord[0]]);
            docData.map.summary_polyline = polyline.decode(docData.map.summary_polyline).map(coord => [coord[1], coord[0]]);

            return docData;
        } else {
            const ACTIVITY_URI = `https://www.strava.com/api/v3/activities/${activityId}?access_token=${this.token.access_token}`;
            const activity = await fetch(ACTIVITY_URI).then(response => response.json());
            await docRef.set(activity);
            return activity;
        }
    }

    async loadAltitude(activityId) {
        const docRef = this.activityRef(activityId).collection('data').doc('altitude');
        const doc = await docRef.get();

        if (doc.exists) {
            return data.data();
        } else {
            await this.loadAllData(activityId);
            return this.loadALtitude(activityId);
        }
    }

    async loadVelocity(activityId) {
        const docRef = this.activityRef(activityId).collection('data').doc('velocity');
        const doc = await docRef.get();

        if (doc.exists) {
            return doc.data();
        } else {
            await this.loadAllData(activityId);
            return this.loadVelocity(activityId);
        }
    }

    async loadHeartrate(activityId) {
        const docRef = this.activityRef(activityId).collection('data').doc('heartrate');
        const doc = await docRef.get();

        if (doc.exists) {
            return doc.data();
        } else {
            await this.loadAllData(activityId);
            return this.loadHeartrate(activityId);
        }
    }

    async loadTime(activityId) {
        const docRef = this.activityRef(activityId).collection('data').doc('time');
        const doc = await docRef.get();

        if (doc.exists) {
            return data.data();
        } else {
            await this.loadAllData(activityId);
            return this.loadTime(activityId);
        }
    }

    async loadCoordinates(activityId) {
        const docRef = this.activityRef(activityId).collection('data').doc('coordinates');
        const doc = await docRef.get();

        if (doc.exists) {
            return doc.data().data.map(e => [e.lng, e.lat]);
        } else {
            await this.loadAllData(activityId);
            return this.loadCoordinates(activityId);
        }
    }

    async loadDistance(activityId) {
        const docRef = this.activityRef(activityId).collection('data').doc('distance');
        const doc = await docRef.get();

        if (doc.exists) {
            return doc.data();
        } else {
            await this.loadAllData(activityId);
            return this.loadDistance(activityId);
        }
    }

    async loadAllData(activityId) {
        const ALTITUDE_URI = `https://www.strava.com/api/v3/activities/${activityId}/streams/altitude?access_token=${this.token.access_token}`;
        const VELOCITY_URI = `https://www.strava.com/api/v3/activities/${activityId}/streams/velocity_smooth?access_token=${this.token.access_token}`;
        const HEARTRATE_URI = `https://www.strava.com/api/v3/activities/${activityId}/streams/heartrate?access_token=${this.token.access_token}`;
        const TIME_URI = `https://www.strava.com/api/v3/activities/${activityId}/streams/time?access_token=${this.token.access_token}`;
        const LATLNG_URI = `https://www.strava.com/api/v3/activities/${activityId}/streams/latlng?access_token=${this.token.access_token}`;

        let responses = [
            fetch(ALTITUDE_URI),
            fetch(HEARTRATE_URI),
            fetch(LATLNG_URI),
            fetch(TIME_URI),
            fetch(VELOCITY_URI),
        ];
        responses = await Promise.all(responses);
        responses = await Promise.all(responses.map(response => response.json()));
        responses = responses.reduce((a, b) => [...a, ...b], []);

        await this.activityRef(activityId).collection('data').doc('distance').set(responses.find(r => r.type === 'distance'));
        await this.activityRef(activityId).collection('data').doc('altitude').set(responses.find(r => r.type === 'altitude'));
        if (responses.find(r => r.type == 'heartrate')) {
            await this.activityRef(activityId).collection('data').doc('heartrate').set(responses.find(r => r.type === 'heartrate'));
        }
        await this.activityRef(activityId).collection('data').doc('time').set(responses.find(r => r.type === 'time'));
        await this.activityRef(activityId).collection('data').doc('velocity').set(responses.find(r => r.type === 'velocity_smooth'));

        const latlngResponse = responses.find(r => r.type === 'latlng');
        latlngResponse.data = latlngResponse.data.map(e => ({ lat: e[0], lng: e[1] }));
        await this.activityRef(activityId).collection('data').doc('coordinates').set(latlngResponse);
    }

    clearActivityTable() {
        const table = document.getElementById('activity-table');
        while (table.hasChildNodes()) {
            table.removeChild(table.firstChild);
        }
    }

    addActivityToTable(activity) {
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

        document.getElementById('activity-table').prepend(row);
    }

    async displayCalculations() {
        const routes = []
        for (let activityId of this.visibleActivities) {
            const coordinates = this.getCoordinates(activityId);

            if (optionsCalculateLaps()) {
                displayLaps(coordinates);
            }

            routes.push(coordinates);
        }

        if (optionsCalculateSimilarActivities()) {
            this.similarityCalculator.drawSimilarLines(routes);
        }
    }

    async getCoordinates(activityId) {
        let activity;
        switch (optionsCoordinateQuality()) {
            case 1:
                activity = await this.loadActivity(activityId);
                return activity.map.summary_polyline;
            case 2:
                activity = await this.loadActivity(activityId);
                return activity.map.polyline;
            case 3:
                return await loadCoordinates(activityId);
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
            for (let activity of this.visibleActivities) {
                const coordinates = (await this.loadActivity(activity)).map.polyline;
                addCircleAroudPointsLayer(coordinates, getRandomColor(), 'lightgreen', optionsMaxDistanceForSimilarity());
            }
        }
    }

    async updateMap() {
        clearMap();
        await this.displayCirclesAroundPoints();
        await this.displayActivities();
        await this.displayCalculations();

        if (optionsFitToBounds()) {
            fitToBounds();
        }
    }
}
