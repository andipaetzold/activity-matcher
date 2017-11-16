import { randomID } from "./util.js";

export class SimilarityCalculator {
    constructor(map) {
        this.map = map;
        this.layers = [];
    }

    clear() {
        for (let layer of this.layers) {
            this.map.setLayoutProperty(layer, 'visibility', 'none');
        }
    }

    createData(coordinates) {
        return ;
    }

    addLine(p1, p2) {
        const layerName = `similar-${randomID()}`;
        this.layers.push(layerName);

        this.map.addLayer({
            "id": layerName,
            "type": "line",
            "source": { 
                type: 'geojson',
                data: turf.lineString([p1.geometry.coordinates, p2.geometry.coordinates]),
            },
            "layout": {
                "line-join": "round",
                "line-cap": "round"
            },
            "paint": {
                "line-color": "blue",
                "line-width": 3
            }
        });
    }

    getLines(coordinates) {
        const lines = [];
        for (let i = 1; i < coordinates.length; ++i) {
            lines.push({
                from: coordinates[i - 1], 
                to: coordinates[i]
            });
        }
        return lines;
    }

    drawSimilarLines(routes) {
        this.clear();

        if (routes.length != 2) {
            return;
        }

        routes = routes.map(coordinates => coordinates.map(point => turf.point(point)));
        
        const route1 = routes[0];
        const route2 = routes[1];
        
        const lines1 = this.getLines(route1);
        const lines2 = this.getLines(route2);

        const maxDistance = 0.050;
        for (let l1 of lines1) {
            for (let l2 of lines2) {
                if (turf.distance(l1.from, l2.from) <= maxDistance && turf.distance(l1.to, l2.to) <= maxDistance) {
                    this.addLine(turf.midpoint(l1.from, l2.from), turf.midpoint(l1.to, l2.to));
                }
            }
        }
    }
}