import { addLineLayer } from "./map.js";

export const maxDistanceForSimilarity = 0.050;

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
        if (routes.length != 2) {
            return;
        }

        routes = routes.map(coordinates => coordinates.map(point => turf.point(point)));

        const route1 = routes[0];
        const route2 = routes[1];

        const usedRoute2 = new Set();

        let currentLine = [];
        for (let i1 = 0; i1 < route1.length; ++i1) {
            let p1 = route1[i1];

            route2Label:
            for (let i2 = 0; i2 < route2.length; ++i2) {
                let p2 = route2[i2];

                let ii1 = i1;
                let ii2 = i2;

                while (p1 && p2 && !usedRoute2.has(ii2) && turf.distance(p1, p2) <= maxDistanceForSimilarity) {
                    usedRoute2.add(ii2);
                    currentLine.push(turf.midpoint(p1, p2).geometry.coordinates);

                    ++ii1;
                    ++ii2;

                    p1 = route1[ii1];
                    p2 = route2[ii2];
                }

                if (currentLine.length >= 2) {
                    addLineLayer(currentLine, 'blue', 3);
                }
                currentLine = [];

                break route2Label;
            }
        }
    }
}