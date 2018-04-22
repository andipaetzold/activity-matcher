import { Injectable } from "@angular/core";
import { Position } from 'geojson';
import pointToLineDistance from '@turf/point-to-line-distance';
import { point, lineString, Coord, Feature, LineString, Units } from '@turf/helpers';

export interface SimplifyResult {
    simplifiedPath: Position[];
    originalPoints: number;
    simplifiedPoints: number;
    percentage: number;
    calculationTime: number;
}

@Injectable()
export class SimplifyService {
    public simplify(originalPath: Position[], epsilon: number): SimplifyResult {
        const timeBegin = performance.now();
        const simplifiedPath = this.simplifyRec(originalPath, epsilon);
        const timeEnd = performance.now();

        return {
            simplifiedPath,
            originalPoints: originalPath.length,
            simplifiedPoints: simplifiedPath.length,
            percentage: simplifiedPath.length / originalPath.length,
            calculationTime: timeEnd - timeBegin,
        };
    }

    public simplifyRec(path: Position[], epsilon: number): Position[] {
        let dmax = 0;
        let index = 0;
        let end = path.length - 1;

        const line = lineString([path[0], path[end]]);
        for (let i = 1; i <= end; ++i) {
            const pt = point(path[i]);
            const d = pointToLineDistance(pt, line, {
                units: 'meters',
                method: 'geodesic'
            });

            if (d > dmax) {
                index = i;
                dmax = d;
            }
        }

        if (dmax > epsilon) {
            return [
                ...this.simplifyRec(path.slice(0, index), epsilon),
                ...this.simplifyRec(path.slice(index), epsilon)
            ];
        } else {
            return [path[0], path[end]];
        }
    }
}
