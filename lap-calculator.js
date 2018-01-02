import { splitLine, getRandomColor } from "./util.js";
import { optionsMaxDistanceForSimilarity } from "./options.js";
import { addLineLayer, addPointLayer } from "./map.js";

export function displayLaps(coordinates) {
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
                lap.push(result.geometry.coordinates);
                possibleLaps.push({
                    lap,
                    nextLapStartIndex: j,
                    lapCount: 1
                });
                break;
            } else {
                lap.push(p2);
            }
        }
    }

    // minimum 2 laps
    for (const possibleLap of possibleLaps) {
        let i = possibleLap.nextLapStartIndex;

        lapLoop:
        while (i < coordinates.length - 1) {
            const doubleLap = possibleLap.lap.concat(possibleLap.lap);
            let pointOnLapIndex = 0;
            let skipped = false;
            while (pointOnLapIndex < possibleLap.lap.length - 1 && i < coordinates.length - 1) {
                const lapLinePoints = [doubleLap[pointOnLapIndex], doubleLap[pointOnLapIndex + 1]];
                const lapLine = turf.lineString(lapLinePoints);

                const matchLinePoints = [coordinates[i], coordinates[i + 1]];
                const matchLine = turf.lineString(matchLinePoints);

                const coordFrontMatch = turf.pointToLineDistance(turf.point(coordinates[i + 1]), lapLine) <= maxDistance;
                const coordBackMatch = turf.pointToLineDistance(turf.point(coordinates[i]), lapLine) <= maxDistance;
                const lapFrontMatch = turf.pointToLineDistance(doubleLap[pointOnLapIndex + 1], matchLine) <= maxDistance;
                const lapBackMatch = turf.pointToLineDistance(doubleLap[pointOnLapIndex], matchLine) <= maxDistance;

                if (lapFrontMatch && !lapBackMatch) {
                    ++pointOnLapIndex;
                } else if (coordFrontMatch && !coordBackMatch) {
                    ++i;
                } else if (coordFrontMatch && coordBackMatch) {
                    ++i;
                } else if (lapFrontMatch && lapBackMatch) {
                    ++pointOnLapIndex;
                } else if (!coordFrontMatch && coordBackMatch) {
                    ++pointOnLapIndex;
                } else if (!lapFrontMatch && lapBackMatch) {
                    ++i;
                } else {
                    if (skipped) {
                        break lapLoop;
                    }

                    skipped = true;
                    ++pointOnLapIndex;

                    continue;
                }
                skipped = false;
            }
            ++possibleLap.lapCount;
        }
    }

    for (let possibleLap of possibleLaps.filter(p => p.lapCount >= 2)) {
        addLineLayer(possibleLap.lap, 'purple', 5);
    }
}
