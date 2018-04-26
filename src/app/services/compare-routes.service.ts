import { Injectable } from "@angular/core";
import { Position } from 'geojson';
import { point, lineString, Units } from '@turf/helpers';
import distance from '@turf/distance';
import length from '@turf/length';
import pointToLineDistance from '@turf/point-to-line-distance';

export interface CompareResult {
    overlappingPaths: Position[][];
    percentage: number;
    calculationTime: number;
}

@Injectable()
export class CompareRoutesService {
    public comparePoints(path1: Position[], path2: Position[], maxDistance: number = 0.005): CompareResult {
        const distanceOptions = {
            units: <Units>'meters',
        };

        const pathCoords1 = path1.map(p => point(p));
        const pathCoords2 = path2.map(p => point(p));

        const overlappingPaths: Position[][] = [];

        const timeBegin = performance.now();
        for (let indexPath1 = 0; indexPath1 < path1.length - 1; ++indexPath1) {
            for (let indexPath2 = 0; indexPath2 < path2.length - 1; ++indexPath2) {
                const d1 = distance(pathCoords1[indexPath1], pathCoords2[indexPath2], distanceOptions);
                const d2 = distance(pathCoords1[indexPath1 + 1], pathCoords2[indexPath2 + 1], distanceOptions);
                if (d1 < maxDistance && d2 < maxDistance) {
                    overlappingPaths.push([path1[indexPath1], path1[indexPath1 + 1]]);
                    break;
                }
            }
        }
        const timeEnd = performance.now();

        const originalDistance = length(lineString(path1), distanceOptions);
        const resultDistance = overlappingPaths.map(path => length(lineString(path), distanceOptions)).reduce((a, b) => a + b, 0);

        return {
            overlappingPaths,
            percentage: resultDistance / originalDistance,
            calculationTime: timeEnd - timeBegin,
        };
    }

    public comparePointsWithLine(path1: Position[], path2: Position[], maxDistance: number = 0.005): CompareResult {
        const distanceOptions = {
            units: <Units>'meters',
        };

        const pathCoords1 = path1.map(p => point(p));
        const pathCoords2 = path2.map(p => point(p));

        const overlappingPaths: Position[][] = [];

        const timeBegin = performance.now();
        for (let indexPath1 = 0; indexPath1 < path1.length - 1; ++indexPath1) {
            const point1 = pathCoords1[indexPath1];
            const point2 = pathCoords1[indexPath1 + 1];

            for (let indexPath2 = 0; indexPath2 < path2.length - 2; ++indexPath2) {
                const line1 = lineString([path2[indexPath2], path2[indexPath2 + 1]]);
                const line2 = lineString([path2[indexPath2 + 1], path2[indexPath2 + 2]]);

                const d1 = pointToLineDistance(point1, line1, distanceOptions);
                const d2 = Math.min(pointToLineDistance(point2, line1, distanceOptions), pointToLineDistance(point2, line2, distanceOptions));

                if (d1 < maxDistance && d2 < maxDistance) {
                    overlappingPaths.push([path1[indexPath1], path1[indexPath1 + 1]]);
                    break;
                }
            }
        }
        const timeEnd = performance.now();

        const originalDistance = length(lineString(path1), distanceOptions);
        const resultDistance = overlappingPaths.map(path => length(lineString(path), distanceOptions)).reduce((a, b) => a + b, 0);

        return {
            overlappingPaths,
            percentage: resultDistance / originalDistance,
            calculationTime: timeEnd - timeBegin,
        };
    }
}
