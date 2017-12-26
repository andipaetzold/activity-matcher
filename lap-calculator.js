import { splitLine, getRandomColor } from "./util.js";
import { optionsMaxDistanceForSimilarity } from "./options.js";
import { addLineLayer } from "./map.js";

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
    for (const possibleLap of possibleLaps) {
        let count = 0;

        let i = possibleLap.lapStartIndex;

        lapLoop:
        while (i < possibleLap.lap.length) {
            const currentPoint = turf.point(coordinates[i]);

            for (let lapIndex = possibleLap.lapStartIndex; lapIndex < possibleLap.lapStartIndex + possibleLap.lap.length - 1; ++lapIndex) {
                const lapPoint = turf.point(coordinates[lapIndex]);

                if (turf.distance(lapPoint, currentPoint) > maxDistance) {
                    break lapLoop;
                }

                ++i;
            }

            ++count;
            ++i;
        }

        if (count >= 1) {
            finalLaps.push(possibleLap.lap);
        }
    }

    for (let lap of finalLaps) {
        addLineLayer(lap, getRandomColor(), 5);
    }
}