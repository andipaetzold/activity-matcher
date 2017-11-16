export class ActivityLoader {
    constructor(map) {
        this.map = map;
    }

    async loadActivities(accessToken) {
        const ACTIVITIES_URI = `https://www.strava.com/api/v3/athlete/activities?access_token=${accessToken}`
        const activities = await fetch(ACTIVITIES_URI).then(response => response.json());
        activities.forEach(activity => this.loadActivity(activity));
    }

    loadActivity(activity) {
        const coordinates = polyline.decode(activity.map.summary_polyline).map(coord => [coord[1], coord[0]]);

        this.map.addLayer({
            "id": `activity-${activity.id}`,
            "type": "line",
            "source": {
                "type": "geojson",
                "data": {
                    "type": "Feature",
                    "properties": {},
                    "geometry": {
                        "type": "LineString",
                        "coordinates": coordinates
                    }
                }
            },
            "layout": {
                "line-join": "round",
                "line-cap": "round",
                "visibility": "none"
            },
            "paint": {
                "line-color": "red",
                "line-width": 3
            }
        });

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
                this.map.setLayoutProperty(`activity-${activity.id}`, 'visibility', 'none');
                this.fitToBounds();
            } else {
                buttonDisplay.classList.add('btn-primary');
                this.map.setLayoutProperty(`activity-${activity.id}`, 'visibility', 'visible');
                this.fitToBounds();
            }
        });
        cellDisplay.appendChild(buttonDisplay);

        row.appendChild(cellDate);
        row.appendChild(cellDistance);
        row.appendChild(cellDuration);
        row.appendChild(cellType);
        row.appendChild(cellCommute);
        row.appendChild(cellDisplay);

        document.getElementById('activity-table').appendChild(row);
    }
    

    fitToBounds() {
        const layerIds = this.map.getStyle().layers
            .filter(layer => layer.id.startsWith('activity-'))
            .filter(layer => layer.layout.visibility == 'visible')
            .map(layer => layer.id);

        if (layerIds.length == 0) {
            return;
        }

        const coordinates = [];
        for (let id of layerIds) {
            coordinates.push(...this.map.getSource(id)._data.geometry.coordinates);
        }

        const bounds = coordinates.reduce((bounds, coord) => bounds.extend(coord), new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
        this.map.fitBounds(bounds, {
            padding: 20
        });
    }
}