import { SimilarityCalculator } from "./similarity-calculator.js";
import { LapCalculator } from "./lap-calculator.js";
import { initFirebaseDatabase } from "./firebase.js";

export class ActivityLoader {
    constructor(map) {
        this.database = initFirebaseDatabase();

        this.map = map;
        this.similarityCalculator = new SimilarityCalculator(map);
        this.lapCalculator = new LapCalculator(map);

        this.coordinateMap = new Map();
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

    addLayer(id, coordinates) {
        this.map.addLayer({
            "id": `activity-${id}`,
            "type": "line",
            "source": {
                "type": "geojson",
                "data": turf.lineString(coordinates),
            },
            "layout": {
                "line-join": "round",
                "line-cap": "round",
                "visibility": "none"
            },
            "paint": {
                "line-color": "black",
            }
        });
    }

    showLayer(id) {
        this.map.setLayoutProperty(`activity-${id}`, 'visibility', 'visible');
    }

    hideLayer(id) {
        this.map.setLayoutProperty(`activity-${id}`, 'visibility', 'none');
    }

    loadActivity(activity) {
        const coordinates = polyline.decode(activity.map.polyline).map(coord => [coord[1], coord[0]]);

        this.coordinateMap.set(activity.id, coordinates);
        this.addLayer(activity.id, coordinates);

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
                this.hideLayer(activity.id);
            } else {
                buttonDisplay.classList.add('btn-primary');
                this.showLayer(activity.id);
            }
            this.fitToBounds();
            this.displayCalculations();
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

    getVisibleActivities() {
        return this.map.getStyle().layers
            .filter(layer => layer.id.startsWith('activity-'))
            .filter(layer => layer.layout.visibility == 'visible')
            .map(layer => layer.id)
            .map(id => id.substr('activity-'.length))
            .map(id => parseInt(id));
    }

    fitToBounds() {
        const activityIds = this.getVisibleActivities();

        if (activityIds.length == 0) {
            return;
        }

        const coordinates = [];
        for (let id of activityIds) {
            coordinates.push(...this.map.getSource(`activity-${id}`)._data.geometry.coordinates);
        }

        const bounds = coordinates.reduce((bounds, coord) => bounds.extend(coord), new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
        this.map.fitBounds(bounds, {
            padding: 20
        });
    }

    displayCalculations() {
        const activityIds = this.getVisibleActivities();
        const routes = activityIds.map(id => this.coordinateMap.get(id));

        this.similarityCalculator.drawSimilarLines(routes);

        for (let coordinates of routes) {
            this.lapCalculator.showLap(coordinates);
        }
    }
}