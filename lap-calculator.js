import { splitLine } from "./util.js";

export class LapCalculator {
    constructor(map) {
        this.map = map;
    }

    showLap(coordinates) {
        const distance = 0.025;
        coordinates = splitLine(coordinates, 0.01);
        console.log(coordinates.length);

        let possibleLaps = [];

        // find possible laps
        for (let lapStartIndex = 0; lapStartIndex < coordinates.length; ++lapStartIndex) {
            const lapStart = turf.point(coordinates[lapStartIndex]);
            const lap = [coordinates[lapStartIndex]];
            
            for (let j = lapStartIndex + 1; j < coordinates.length; ++j) {
                const p2 = coordinates[j];

                if (turf.distance(lapStart, turf.point(p2)) <= distance) {
                    possibleLaps.push({ lapStartIndex, lap });
                    break;
                } else {
                    lap.push(p2);
                }
            }
        }

        // minimum 100m per lap
        possibleLaps = possibleLaps
            .filter(possibleLap => possibleLap.lap.length >= 2)
            .filter(possibleLap => turf.length(turf.lineString(possibleLap.lap)) >= 0.1);

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

                    if (turf.distance(lapPoint, currentPoint) > distance) {
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

        console.log(finalLaps);
    }
}