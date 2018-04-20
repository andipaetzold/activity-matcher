import { Injectable } from "@angular/core";
import { Position } from 'geojson';
import { point } from '@turf/helpers';
import distance from '@turf/distance';

@Injectable()
export class CompareRoutesService {
    public comparePoints(path1: Position[], path2: Position[], maxDistance: number = 0.005): Position[][] {
        const distanceOptions = {
            units: 'kilometers',
        };

        const pathCoords1 = path1.map(p => point(p));
        const pathCoords2 = path2.map(p => point(p));

        const result: Position[][] = [];

        for (let indexPath1 = 0; indexPath1 < path1.length - 1; ++indexPath1) {
            for (let indexPath2 = 0; indexPath2 < path2.length - 1; ++indexPath2) {
                const d1 = distance(pathCoords1[indexPath1], pathCoords2[indexPath2]);
                const d2 = distance(pathCoords1[indexPath1 + 1], pathCoords2[indexPath2 + 1]);
                if (d1 < maxDistance && d2 < maxDistance) {
                    result.push([path1[indexPath1], path1[indexPath1 + 1]]);
                    continue;
                }
            }
        }

        return result;
    }
}