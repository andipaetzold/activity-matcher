import { Injectable } from "@angular/core";
import { Position } from 'geojson';
import { point, lineString, Units } from '@turf/helpers';
import distance from '@turf/distance';
import length from '@turf/length';
import pointToLineDistance from '@turf/point-to-line-distance';
import nearestPointOnLine from '@turf/nearest-point-on-line';

export interface ComparePoint {
    point: number; part: number;
}

export interface OverlappingPath {
    route1: {
        from: ComparePoint;
        to: ComparePoint;
    };
    route2: {
        from: ComparePoint;
        to: ComparePoint;
    };
};

export interface CompareResult {
    overlappingPaths: OverlappingPath[];
    calculationTime: number;
}

const distanceOptions = {
    units: <Units>'meters',
};

@Injectable()
export class CompareRoutesService {
    public comparePoints(path1: Position[], path2: Position[], maxDistance: number = 0.005): CompareResult {
        const pathCoords1 = path1.map(p => point(p));
        const pathCoords2 = path2.map(p => point(p));

        const overlappingPaths: OverlappingPath[] = [];

        const timeBegin = performance.now();
        for (let indexPath1 = 0; indexPath1 < path1.length - 1; ++indexPath1) {
            for (let indexPath2 = 0; indexPath2 < path2.length - 1; ++indexPath2) {
                const d1 = distance(pathCoords1[indexPath1], pathCoords2[indexPath2], distanceOptions);
                const d2 = distance(pathCoords1[indexPath1 + 1], pathCoords2[indexPath2 + 1], distanceOptions);
                if (d1 < maxDistance && d2 < maxDistance) {
                    overlappingPaths.push({
                        route1: {
                            from: { point: indexPath1, part: 0 },
                            to: { point: indexPath1, part: 1 },
                        },
                        route2: {
                            from: { point: indexPath2, part: 0 },
                            to: { point: indexPath2, part: 1 },
                        }
                    });
                    break;
                }
            }
        }
        const timeEnd = performance.now();

        return {
            overlappingPaths,
            calculationTime: timeEnd - timeBegin,
        };
    }

    public comparePointsWithLine(path1: Position[], path2: Position[], maxDistance: number = 0.005): CompareResult {
        const pathCoords1 = path1.map(p => point(p));
        const pathCoords2 = path2.map(p => point(p));

        const overlappingPaths: OverlappingPath[] = [];

        const timeBegin = performance.now();
        for (let indexPath1 = 0; indexPath1 < path1.length - 1; ++indexPath1) {
            const startPath1 = pathCoords1[indexPath1];
            const stopPath1 = pathCoords1[indexPath1 + 1];

            for (let indexPath2 = 0; indexPath2 < path2.length - 1; ++indexPath2) {
                const line = lineString([path2[indexPath2], path2[indexPath2 + 1]]);

                const startPath2 = nearestPointOnLine(line, startPath1);
                const distanceBetweenStarts = distance(startPath1, startPath2, distanceOptions);

                const stopPath2 = nearestPointOnLine(line, stopPath1);
                const distanceBetweenStops = distance(stopPath1, stopPath2, distanceOptions);

                if (distanceBetweenStarts < maxDistance && distanceBetweenStops < maxDistance) {
                    overlappingPaths.push({
                        route1: {
                            from: { point: indexPath1, part: 0 },
                            to: { point: indexPath1 + 1, part: 0 },
                        },
                        route2: {
                            from: {
                                point: indexPath2,
                                part: distance(path2[indexPath2], startPath2) / length(line)
                            },
                            to: {
                                point: indexPath2,
                                part: distance(path2[indexPath2], stopPath2) / length(line)
                            },
                        },
                    });
                    break;
                }
            }
        }
        const timeEnd = performance.now();

        return {
            overlappingPaths,
            calculationTime: timeEnd - timeBegin,
        };
    }

    public comparePointsWithLines(path1: Position[], path2: Position[], maxDistance: number = 0.005): CompareResult {
        const pathCoords1 = path1.map(p => point(p));
        const pathCoords2 = path2.map(p => point(p));

        const overlappingPaths: OverlappingPath[] = [];

        const timeBegin = performance.now();
        for (let indexPath1 = 0; indexPath1 < path1.length - 1; ++indexPath1) {
            const orgStartPath1 = pathCoords1[indexPath1];
            const orgStopPath1 = pathCoords1[indexPath1 + 1];
            const line1 = lineString([path2[indexPath1], path2[indexPath1 + 1]]);

            for (let indexPath2 = 0; indexPath2 < path2.length - 1; ++indexPath2) {
                const orgStartPath2 = pathCoords2[indexPath2];
                const orgStopPath2 = pathCoords2[indexPath2 + 1];
                const line2 = lineString([path2[indexPath2], path2[indexPath2 + 1]]);

                const startPath2 = nearestPointOnLine(line2, orgStartPath1);
                const stopPath2 = nearestPointOnLine(line2, orgStopPath1);

                const startPath1 = nearestPointOnLine(line1, startPath2);
                const stopPath1 = nearestPointOnLine(line1, stopPath2);

                const distanceBetweenStarts = distance(startPath1, startPath2, distanceOptions);
                const distanceBetweenStops = distance(stopPath2, stopPath2, distanceOptions);

                if (distanceBetweenStarts < maxDistance && distanceBetweenStops < maxDistance) {
                    overlappingPaths.push({
                        route1: {
                            from: {
                                point: indexPath1,
                                part: distance(orgStartPath1, startPath1) / length(line1)
                            },
                            to: {
                                point: indexPath1,
                                part: distance(orgStartPath1, stopPath1) / length(line1)
                            },
                        },
                        route2: {
                            from: {
                                point: indexPath2,
                                part: distance(orgStartPath2, startPath2) / length(line2)
                            },
                            to: {
                                point: indexPath2,
                                part: distance(orgStartPath2, stopPath2) / length(line2)
                            },
                        },
                    });
                    break;
                }
            }
        }


        const timeEnd = performance.now();

        return {
            overlappingPaths,
            calculationTime: timeEnd - timeBegin,
        };
    }
}
