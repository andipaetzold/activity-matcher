import { Injectable } from "@angular/core";
import { Position } from 'geojson';
import pointToLineDistance from '@turf/point-to-line-distance';
import { point, lineString, Coord, Feature, LineString, Units } from '@turf/helpers';
import length from '@turf/length';

export interface SimplifyResult {
    simplifiedPath: Position[];

    originalPoints: number;
    simplifiedPoints: number;
    percentagePoints: number;

    originalDistance: number;
    simplifiedDistance: number;
    percentageDistance: number;

    calculationTime: number;
}

const distanceOptions = {
    units: <Units>'kilometers',
};

@Injectable()
export class SimplifyService {
    public simplify(originalPath: Position[], epsilon: number): SimplifyResult {
        const timeBegin = performance.now();
        const simplifiedPath = this.simplifyRec(originalPath, epsilon);
        const timeEnd = performance.now();

        const originalDistance = length(lineString(originalPath), distanceOptions);
        const simplifiedDistance = length(lineString(simplifiedPath), distanceOptions);

        return {
            simplifiedPath,

            originalPoints: originalPath.length,
            simplifiedPoints: simplifiedPath.length,
            percentagePoints: simplifiedPath.length / originalPath.length,

            originalDistance: originalDistance,
            simplifiedDistance: simplifiedDistance,
            percentageDistance: simplifiedDistance / originalDistance,


            calculationTime: timeEnd - timeBegin,
        };
    }

    public simplifyRec(path: Position[], tolerance: number): Position[] {
        let maxDistance = 0;
        let maxDistanceIndex = -1;

        const end = path.length - 1;
        const line = lineString([path[0], path[end]]);
        for (let i = 1; i < end; ++i) {
            const pt = point(path[i]);
            const d = pointToLineDistance(pt, line, {
                units: 'meters',
                method: 'geodesic'
            });

            if (d > maxDistance) {
                maxDistance = d;
                maxDistanceIndex = i;
            }
        }

        if (maxDistance > tolerance) {
            const recResults1 = this.simplifyRec(path.slice(0, maxDistanceIndex + 1), tolerance);
            const recResults2 = this.simplifyRec(path.slice(maxDistanceIndex), tolerance);
            return [
                ...recResults1.slice(0, -1),
                ...recResults2,
            ];
        } else {
            return [path[0], path[end]];
        }
    }
}
