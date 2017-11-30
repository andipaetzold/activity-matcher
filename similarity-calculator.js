import { addMultipleLineLayer } from "./map.js";
import { optionsMaxDistanceForSimilarity } from "./options.js";

export class SimilarityCalculator {
    addLine(p1, p2) {
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
        const maxDistance = optionsMaxDistanceForSimilarity();

        if (routes.length != 2) {
            return;
        }

        routes = routes.map(coordinates => coordinates.map(point => turf.point(point)));

        const route1 = routes[0];
        const route2 = routes[1];

        const usedRoute2 = new Set();

        let lines = [];
        for (let i1 = 0; i1 < route1.length; ++i1) {
            let p1 = route1[i1];

            route2Label:
            for (let i2 = 0; i2 < route2.length; ++i2) {
                let p2 = route2[i2];

                let ii1 = i1;
                let ii2 = i2;

                while (p1 && p2 && !usedRoute2.has(ii2) && turf.distance(p1, p2) <= maxDistance) {
                    p1 = route1[++ii1];
                    p2 = route2[++ii2];
                }

                if (ii1 - i1 >= 2) {
                    let currentLine = [];

                    let i = 0;
                    while (i1 + i < ii1 && i2 + i < ii2) {
                        currentLine.push(turf.midpoint(route1[i1 + i], route2[i2 + i]).geometry.coordinates);
                        usedRoute2.add(i2 + i);
                        ++i;
                    }

                    lines.push(currentLine);
                    break route2Label;
                }
            }
        }
        addMultipleLineLayer(lines, 'blue', 3);
    }
}