import { splitLine, getRandomColor } from "./util.js";
import { optionsMaxDistanceForSimilarity } from "./options.js";
import { addLineLayer, addPointLayer } from "./map.js";

export function displayLaps(coordinates) {
    const maxDistance = optionsMaxDistanceForSimilarity();

    let possibleLaps = [];

    // find possible laps
    for (let lapStartIndex = 0; lapStartIndex < coordinates.length; ++lapStartIndex) {
        const lapStart = turf.point(coordinates[lapStartIndex]);
        const lap = [coordinates[lapStartIndex]];

        for (let j = lapStartIndex + 1; j < coordinates.length; ++j) {
            const p2 = coordinates[j];

            if (lap.length >= 2 &&
                turf.distance(lapStart, turf.point(p2)) <= maxDistance &&
                turf.length(turf.lineString(lap)) >= 0.25) {
                possibleLaps.push({ lapStartIndex, lap });
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
        let count = 1;

        let i = possibleLap.lapStartIndex + possibleLap.lap.length;

        const lap = turf.lineString(possibleLap.lap);

        let prevOnLap = 0;
        const doubleLap = possibleLap.lap.concat(possibleLap.lap);

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
                break;
            }

            if (prevOnLap + 1 >= possibleLap.lap.length) {
                prevOnLap -= possibleLap.lap.length;
                prevOnLap = Math.max(0, prevOnLap);
                ++count;
            }

            ++i;
        }

        if (count >= 2) {
            finalLaps.push(possibleLap.lap);
        }
    }

    for (let lap of finalLaps) {
        lap.push(lap[0]);
        addLineLayer(lap, getRandomColor(), 5);
    }
}
