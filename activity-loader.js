import { SimilarityCalculator } from "./similarity-calculator.js";
import { LapCalculator } from "./lap-calculator.js";
import { initFirebaseDatabase } from "./firebase.js";
import { fitToBounds, clearMap, addLineLayer } from "./map.js";

export class ActivityLoader {
    constructor() {
        this.database = initFirebaseDatabase();

        this.similarityCalculator = new SimilarityCalculator();
        this.lapCalculator = new LapCalculator();

        this.coordinateMap = new Map();
        this.visibleActivities = [];
    }

    async loadActivities(token) {
        const ACTIVITIES_URI = `https://www.strava.com/api/v3/athlete/activities?access_token=${token.access_token}`;
        let activities = await fetch(ACTIVITIES_URI).then(response => response.json());
        activities = activities.filter(activity => !!activity.map.summary_polyline);

        this.database.ref(`/${token.athlete.id}`)
            .orderByChild('start_date')
            .on('child_added', snapshot => {
                this.loadActivity(snapshot.val());
            });

        for (let activity of activities) {
            await this.loadToFirebase(token, activity);
        }
    }

    async loadToFirebase(token, activity) {
        this.database
            .ref(`/${token.athlete.id}/${activity.id}`)
            .once('value')
            .then(async snapshot => {
                if (!snapshot.val()) {
                    const ACTIVITY_URI = `https://www.strava.com/api/v3/activities/${activity.id}?access_token=${token.access_token}`;
                    activity = await fetch(ACTIVITY_URI).then(response => response.json());

                    this.database
                        .ref(`/${token.athlete.id}/${activity.id}`)
                        .set(activity);
                }
            });
    }

    loadActivity(activity) {
        const coordinates = polyline.decode(activity.map.polyline).map(coord => [coord[1], coord[0]]);
        this.coordinateMap.set(activity.id, coordinates);

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
        buttonDisplay.addEventListener('click', () => {
            if (buttonDisplay.classList.contains('btn-primary')) {
                buttonDisplay.classList.remove('btn-primary');
                this.visibleActivities.splice(this.visibleActivities.indexOf(activity.id), 1);
            } else {
                buttonDisplay.classList.add('btn-primary');
                this.visibleActivities.push(activity.id);
            }

            clearMap();
            this.displayActivities();
            this.displayCalculations();
            fitToBounds();
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

    displayCalculations() {
        const routes = this.visibleActivities.map(id => this.coordinateMap.get(id));

        this.similarityCalculator.drawSimilarLines(routes);

        /*
        for (let coordinates of routes) {
            this.lapCalculator.showLap(coordinates);
        }*/
    }

    displayActivities() {
        for (let activity of this.visibleActivities) {
            addLineLayer(this.coordinateMap.get(activity), 'black');
        }
    }
}