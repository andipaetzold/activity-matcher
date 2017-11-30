import { SimilarityCalculator } from "./similarity-calculator.js";
import { LapCalculator } from "./lap-calculator.js";
import { initFirebaseDatabase, getNodeValue } from "./firebase.js";
import { fitToBounds, clearMap, addLineLayer, addPointLayer, addCircleAroudPointsLayer } from "./map.js";
import { getRandomColor } from "./util.js";
import { optionsMaxDistanceForSimilarity, optionsDrawCirclesAroundPoints } from "./options.js";

export class ActivityLoader {
    constructor(token) {
        this.token = token;

        this.database = initFirebaseDatabase();

        this.similarityCalculator = new SimilarityCalculator();
        this.lapCalculator = new LapCalculator();

        this.visibleActivities = [];
    }

    async loadActivities() {
        const ACTIVITIES_URI = `https://www.strava.com/api/v3/athlete/activities?access_token=${this.token.access_token}`;
        let activities = await fetch(ACTIVITIES_URI).then(response => response.json());
        activities = activities.filter(activity => !!activity.map.summary_polyline);

        this.database.ref(`/${this.token.athlete.id}/activities`)
            .orderByChild('activity/start_date')
            .on('child_added', snapshot => {
                this.addActivityToTable(snapshot.val().activity);
            });

        for (let activity of activities) {
            this.loadActivity(activity.id);
        }
    }

    async loadActivity(activityId) {
        const path = `/${this.token.athlete.id}/activities/${activityId}/activity`;

        try {
            return await getNodeValue(this.database, path);
        } catch (error) {
            const ACTIVITY_URI = `https://www.strava.com/api/v3/activities/${activityId}?access_token=${this.token.access_token}`;
            const activity = await fetch(ACTIVITY_URI).then(response => response.json());
            await this.database.ref(path).set(activity);
            return activity;
        }
    }

    async loadMap(activityId) {
        const path = `/${this.token.athlete.id}/activities/${activityId}/map`;

        try {
            return await getNodeValue(this.database, path);
        } catch (error) {
            const activity = await this.loadActivity(activityId);
            const map = polyline.decode(activity.map.polyline).map(coord => [coord[1], coord[0]]);
            await this.database.ref(path).set(map);
            return map;
        }
    }

    async loadAltitude(activityId) {
        const path = `/${this.token.athlete.id}/activities/${activityId}/altitude`;

        try {
            return await getNodeValue(this.database, path);
        } catch (error) {
            const ALTITUDE_URI = `https://www.strava.com/api/v3/activities/${activityId}/streams/altitude?access_token=${this.token.access_token}`;
            let altitude = await fetch(ALTITUDE_URI).then(response => response.json());
            altitude = altitude.find(e => e.type == 'altitude').data;
            await this.database.ref(path).set(altitudealtitude);
            return altitude;
        }
    }

    async loadVelocity(activityId) {
        const path = `/${this.token.athlete.id}/activities/${activityId}/velocity`;

        try {
            return await getNodeValue(this.database, path);
        } catch (error) {
            const VELOCITY_URI = `https://www.strava.com/api/v3/activities/${activityId}/streams/velocity_smooth?access_token=${this.token.access_token}`;
            let velocity = await fetch(VELOCITY_URI).then(response => response.json());
            velocity = velocity.find(e => e.type == 'velocity_smooth').data;
            await this.database.ref(path).set(velocity);
            return velocity;
        }
    }

    async loadHeartrate(activityId) {
        const path = `/${this.token.athlete.id}/activities/${activityId}/heartrate`;

        try {
            return await getNodeValue(this.database, path);
        } catch (error) {
            const HEARTRATE_URI = `https://www.strava.com/api/v3/activities/${activityId}/streams/heartrate?access_token=${this.token.access_token}`;
            let heartrate = await fetch(HEARTRATE_URI).then(response => response.json());
            heartrate = heartrate.find(e => e.type == 'heartrate').data;
            await this.database.ref(path).set(heartrate);
            return heartrate;
        }
    }

    async loadTime(activityId) {
        const path = `/${this.token.athlete.id}/activities/${activityId}/time`;

        try {
            return await getNodeValue(this.database, path);
        } catch (error) {
            const TIME_URI = `https://www.strava.com/api/v3/activities/${activityId}/streams/time?access_token=${this.token.access_token}`;
            let time = await fetch(TIME_URI).then(response => response.json());
            time = time.find(e => e.type == 'time').data;
            await this.database.ref(path).set(time);
            return time;
        }
    }

    async loadCoordinates(activityId) {
        const path = `/${this.token.athlete.id}/activities/${activityId}/coordinates`;

        try {
            return await getNodeValue(this.database, path);
        } catch (error) {
            const LATLNG_URI = `https://www.strava.com/api/v3/activities/${activityId}/streams/latlng?access_token=${this.token.access_token}`;
            let coordinates = await fetch(LATLNG_URI).then(response => response.json());
            coordinates = coordinates.find(e => e.type == 'latlng').data.map(coord => [coord[1], coord[0]]);
            await this.database.ref(path).set(coordinates);
            return coordinates;
        }
    }

    async loadDistance(activityId) {
        const path = `/${this.token.athlete.id}/activities/${activityId}/distance`;

        try {
            return await getNodeValue(this.database, path);
        } catch (error) {
            const LATLNG_URI = `https://www.strava.com/api/v3/activities/${activityId}/streams?access_token=${this.token.access_token}`;
            let distance = await fetch(LATLNG_URI).then(response => response.json());
            distance = distance.find(e => e.type == 'distance').data;
            await this.database.ref(path).set(distance);
            return distance;
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
        for (let activity of this.visibleActivities) {
            routes.push(await this.loadCoordinates(activity));
        }

        this.similarityCalculator.drawSimilarLines(routes);

        /*
        for (let coordinates of routes) {
            this.lapCalculator.showLap(coordinates);
        }*/
    }

    async displayActivities() {
        for (let activity of this.visibleActivities) {
            const coordinates = await this.loadCoordinates(activity);

            addLineLayer(coordinates, 'black', 1);
            addPointLayer(coordinates[0], 'green');
            addPointLayer(coordinates[coordinates.length - 1], 'red');

        }
    }

    async displayCirclesAroundPoints() {
        if (optionsDrawCirclesAroundPoints()) {
            for (let activity of this.visibleActivities) {
                const coordinates = await this.loadMap(activity);
                addCircleAroudPointsLayer(coordinates, getRandomColor(), 'lightgreen', optionsMaxDistanceForSimilarity());
            }
        }
    }

    async updateMap() {
        clearMap();
        await this.displayCirclesAroundPoints();
        await this.displayActivities();
        await this.displayCalculations();
        fitToBounds();
    }
}