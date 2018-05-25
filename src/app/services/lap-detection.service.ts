import { Injectable } from '@angular/core';
import { Position } from 'geojson';
import distance from '@turf/distance';
import distancePointToLine from '@turf/point-to-line-distance';
import { lineString, Units } from '@turf/helpers';
import { CompareRoutesService } from './compare-routes.service';
import nearestPointOnLine from '@turf/nearest-point-on-line';
import length from '@turf/length';

export interface Lap {
    from: number;
    to: number;
}

const distanceOptions = {
    units: <Units>'meters',
};

@Injectable()
export class LapDetectionService {
    public constructor(
        private readonly compareRouteService: CompareRoutesService,
    ) {
    }

    public findLaps(path: Position[], maxDistance: number, minLength: number): Lap[] {
        const laps: Lap[] = [];
        for (let startIndex = 0; startIndex < path.length; ++startIndex) {
            const startLine = lineString([path[startIndex], path[startIndex + 1]]);

            let lapDistance = 0;
            for (let stopIndex = startIndex + 1; stopIndex < path.length; ++stopIndex) {
                lapDistance += distance(path[stopIndex - 1], path[stopIndex], distanceOptions);

                if (lapDistance < minLength) {
                    continue;
                }

                if (distancePointToLine(path[stopIndex], startLine, distanceOptions) <= maxDistance) {
                    laps.push({
                        from: startIndex,
                        to: stopIndex,
                    });
                    break;
                }
            }
        }

        return this.filterPotentialLaps(laps);
    }

    private filterPotentialLaps(laps: Lap[]): Lap[] {
        const newLaps: Lap[] = [];

        const sortedLaps = laps.sort((a, b) => a.to - b.to);

        let i = 0;
        while (true) {
            const lap = sortedLaps[i++];
            newLaps.push(lap);

            while (sortedLaps[i].from < lap.to) {
                ++i;

                if (!sortedLaps[i]) {
                    return newLaps;
                }
            }
        }
    }

    public countLaps(path: Position[], lapFrom: number, lapTo: number, maxDistance: number) {
        const lapCounts: number[] = [];
        const lap = path.slice(lapFrom, lapTo + 1);
        for (let lapStartIndex = 0; lapStartIndex < path.length; ++lapStartIndex) {
            let laps = 0;
            while (lapStartIndex < path.length) {
                const points = this.compare(path.slice(lapStartIndex), lap, maxDistance);
                if (!points) {
                    break;
                }
                lapStartIndex += points - 1;
                ++laps;
            }

            if (laps > 1) {
                lapCounts.push(laps);
            }
        }

        return lapCounts;
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

        return pathIndex1;
    }
}