import { Injectable } from '@angular/core';
import { Position } from 'geojson';
import distance from '@turf/distance';
import distancePointToLine from '@turf/point-to-line-distance';
import { lineString, Units } from '@turf/helpers';
import { CompareRoutesService } from './compare-routes.service';

export interface Lap {
    from: number;
    to: number;
    count?: number;
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

        return laps;
    }
}