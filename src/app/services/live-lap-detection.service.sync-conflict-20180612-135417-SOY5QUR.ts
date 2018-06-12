import { Injectable } from '@angular/core';
import { Position } from 'geojson';
import nearestPointOnLine from '@turf/nearest-point-on-line';
import length from '@turf/length';
import distance from '@turf/distance';
import distancePointToLine from '@turf/point-to-line-distance';
import { lineString, Units } from '@turf/helpers';

const distanceOptions = {
    units: <Units>'meters',
};

export interface Lap {
    from: number;
    to: number;

    cur: number;
    occurences: [
        {
            from: number;
            to: number;
        }
    ],
}

@Injectable()
export class LiveLapDetectionService {
    private maxDistance: number;
    private minLength: number;

    private path: Position[];
    private smallestStartIndex: number;
    private laps: Lap[];

    public reset(maxDistance: number, minLength: number) {
        this.maxDistance = maxDistance;
        this.minLength = minLength;
        this.smallestStartIndex = 0;
        this.path = [];
        this.laps = [];
    }

    public addPoint(position: Position): void {
        console.group();
        this.path.push(position);

        const stopLine = lineString([this.path[this.path.length - 2], this.path[this.path.length - 1]]);
        let lapDistance = 0;
        for (let lapStartIndex = this.path.length - 2; lapStartIndex >= this.smallestStartIndex; --lapStartIndex) {
            lapDistance += distance(this.path[lapStartIndex], this.path[lapStartIndex + 1], distanceOptions);

            if (lapDistance < this.minLength) {
                continue;
            }

            if (distancePointToLine(this.path[lapStartIndex], stopLine, distanceOptions) <= this.maxDistance) {
                this.smallestStartIndex = this.path.length;
                this.laps.push({
                    from: lapStartIndex,
                    to: this.path.length - 1,
                    cur: 0,
                    occurences: [
                        {
                            from: lapStartIndex,
                            to: this.path.length - 1,
                        }
                    ]
                });
                console.log("lap found")
                break;
            }
        }

        //////// COUNT LAPS
        for (const lap of this.laps) {
            const lapPath = this.path.slice(lap.from, lap.to + 1);

            for (let lapStartIndex = lap.occurences[lap.occurences.length - 1].to; lapStartIndex < this.path.length; ++lapStartIndex) {
                while (lapStartIndex < this.path.length) {
                    const points = this.compare(this.path.slice(lapStartIndex - 1), lapPath, this.maxDistance);
                    if (!points) {
                        break;
                    }

                    lap.occurences.push({
                        from: lapStartIndex,
                        to: lapStartIndex + points,
                    });

                    lapStartIndex += points;

                    console.log('new lap done');
                    break;
                }
            }
        }

        //// Remove overlapping potential laps

        console.log(this.laps);
        console.groupEnd();
    }

    private compare(path: Position[], lap: Position[], maxDistance: number): number {
        if (path.length < 2 || lap.length < 2) {
            return 0;
        }

        let pathIndex1 = 0;

        const back1 = () => path[pathIndex1];
        const front1 = () => path[pathIndex1 + 1];
        const line1 = () => lineString([back1(), front1()]);

        let pathIndex2 = 0;
        const back2 = () => lap[pathIndex2];
        const front2 = () => lap[pathIndex2 + 1];
        const line2 = () => lineString([back2(), front2()]);

        let pointOnLine1 = nearestPointOnLine(line1(), back2());
        let pointOnLine2 = nearestPointOnLine(line2(), back1());

        let distanceToLine1 = distance(back2(), pointOnLine1, distanceOptions);
        let distanceToLine2 = distance(back1(), pointOnLine2, distanceOptions);

        if (Math.min(distanceToLine1, distanceToLine2) > maxDistance) {
            return 0;
        }

        while (pathIndex1 < path.length - 1 && pathIndex2 < lap.length - 1) {
            pointOnLine1 = nearestPointOnLine(line1(), front2());
            pointOnLine2 = nearestPointOnLine(line2(), front1());

            distanceToLine1 = distance(front2(), pointOnLine1, distanceOptions);
            distanceToLine2 = distance(front1(), pointOnLine2, distanceOptions);

            if (Math.min(distanceToLine1, distanceToLine2) > maxDistance) {
                return 0;
            }

            if (distanceToLine1 < distanceToLine2) {
                ++pathIndex2;
            } else {
                ++pathIndex1;
            }
        }

        if (pathIndex1 >= path.length - 1) {
            return 0;
        }

        return pathIndex1;
    }
}
