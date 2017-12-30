import { splitLine, getRandomColor } from "./util.js";
import { optionsMaxDistanceForSimilarity, optionsMaxWrongDistance } from "./options.js";
import { addLineLayer, addPointLayer } from "./map.js";

export function displayLaps(coordinates) {
    const maxWrongDist = optionsMaxWrongDistance();
    const maxDistance = optionsMaxDistanceForSimilarity();

    let possibleLaps = [];

    // find possible laps
    for (let lapStartIndex = 0; lapStartIndex < coordinates.length - 1; ++lapStartIndex) {
        const lap = [coordinates[lapStartIndex + 1]];

        const startLine = turf.lineString([coordinates[lapStartIndex], coordinates[lapStartIndex + 1]]);

        for (let j = lapStartIndex + 1; j < coordinates.length; ++j) {
            const p2 = coordinates[j];

            const result = turf.nearestPointOnLine(startLine, turf.point(p2));
            if (lap.length >= 2 &&
                result.properties.dist <= maxDistance &&
                turf.length(turf.lineString(lap)) >= 0.25) {
                lap.unshift(result.geometry.coordinates);
                possibleLaps.push({
                    lap,
                    nextLapStartIndex: j
                });
                break;
            } else {
                lap.push(p2);
            }
        }
    }

    // minimum 2 laps
    const finalLaps = [];
    possibleLaps = [possibleLaps.filter(l => turf.length(turf.lineString(l.lap)) < 10)[0]];
    for (const possibleLap of possibleLaps) {
        let lapCount = 1;

        let i = possibleLap.nextLapStartIndex;

        let prevOnLap = 0;

        const lap = turf.lineString(possibleLap.lap);
        const doubleLap = possibleLap.lap.concat(possibleLap.lap);

        let curWrongDist = 0;
        while (i < coordinates.length) {

            let match = false;

            let j = 0;
            let checkDist = 0;
            while (checkDist < maxDistance) {
                const line = [doubleLap[prevOnLap + j], doubleLap[prevOnLap + j + 1]];
                const dist = turf.pointToLineDistance(coordinates[i], turf.lineString(line));

                if (dist < maxDistance) {
                    prevOnLap += j;
                    match = true;
                    break;
                }

                checkDist += turf.length(turf.lineString(line));

                ++j
            }

            if (!match) {
                const line = [coordinates[j - 1], coordinates[j]];
                const dist = turf.length(turf.lineString(line));
                curWrongDist += dist;

                if (curWrongDist > maxWrongDist) {
                    break;
                }

                ++prevOnLap;
            } else {
                curWrongDist = 0;
            }

            if (prevOnLap + 1 >= possibleLap.lap.length) {
                prevOnLap -= possibleLap.lap.length;
                prevOnLap = Math.max(0, prevOnLap);
                ++lapCount;
            }

            ++i;
        }

        if (lapCount >= 2) {
            finalLaps.push(possibleLap.lap);
        }
    }

    for (let lap of finalLaps) {
        lap.push(lap[0]);
        addLineLayer(lap, 'purple', 5);
    }
}
