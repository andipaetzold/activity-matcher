import { Injectable } from "@angular/core";
import { Position } from 'geojson';
import { point, lineString, Units } from '@turf/helpers';
import distance from '@turf/distance';
import length from '@turf/length';
import pointToLineDistance from '@turf/point-to-line-distance';
import nearestPointOnLine from '@turf/nearest-point-on-line';
import lineSliceAlong from '@turf/line-slice-along';

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

    public comparePointsWithLines(path1: Position[], path2: Position[], maxDistance: number = 0.005, merge: boolean = true): CompareResult {
        const pathCoords1 = path1.map(p => point(p));
        const pathCoords2 = path2.map(p => point(p));

        let overlappingPaths: OverlappingPath[] = [];

        const timeBegin = performance.now();
        for (let indexPath1 = 0; indexPath1 < path1.length - 1; ++indexPath1) {
            const startPath1 = pathCoords1[indexPath1];
            const stopPath1 = pathCoords1[indexPath1 + 1];

            for (let indexPath2 = 0; indexPath2 < path2.length - 2; ++indexPath2) {
                const line1 = lineString([path2[indexPath2], path2[indexPath2 + 1]]);
                const line2 = lineString([path2[indexPath2 + 1], path2[indexPath2 + 2]]);

                const startPath2 = nearestPointOnLine(line1, startPath1, distanceOptions);
                const distanceToStart = distance(startPath1, startPath2, distanceOptions);

                const stopPath2_1 = nearestPointOnLine(line1, stopPath1, distanceOptions);
                const stopPath2_2 = nearestPointOnLine(line2, stopPath1, distanceOptions);

                const distanceToStop1 = distance(stopPath2_1, stopPath1, distanceOptions);
                const distanceToStop2 = distance(stopPath2_2, stopPath1, distanceOptions);

                const stopPath2 = distanceToStop1 < distanceToStop2 ? stopPath2_1 : stopPath2_2;
                const distanceToStop = Math.min(distanceToStop1, distanceToStop2);

                if (distanceToStart < maxDistance && distanceToStop < maxDistance) {
                    const sameLine = distanceToStop === distanceToStop1;
                    const route2StopId = indexPath2 + (sameLine ? 0 : 1);

                    overlappingPaths.push({
                        route1: {
                            from: {
                                point: indexPath1,
                                part: 0,
                            },
                            to: {
                                point: indexPath1 + 1,
                                part: 0
                            },
                        },
                        route2: {
                            from: {
                                point: indexPath2,
                                part: distance(path2[indexPath2], startPath2) / length(line1),
                            },
                            to: {
                                point: route2StopId,
                                part: distance(path2[route2StopId], stopPath2) / length(sameLine ? line1 : line2)
                            },
                        },
                    });
                    break;
                }
            }
        }

        if (merge) {
            const newOverlappingPaths: OverlappingPath[] = [];
            opLoop: for (let i1 = 0; i1 < overlappingPaths.length; ++i1) {
                const op1 = overlappingPaths[i1];
                for (let i2 = i1 + 1; i2 < overlappingPaths.length; ++i2) {
                    const op2 = overlappingPaths[i2];

                    const linePart1 = this.linePart(path1, op1.route1.to.point, op1.route1.to.part, op2.route1.from.point, op2.route1.from.part);
                    const linePart2 = this.linePart(path2, op1.route2.to.point, op1.route2.to.part, op2.route2.from.point, op2.route2.from.part);

                    if (linePart1.length === 0 || linePart2.length === 0) {
                        continue;
                    }

                    const d1 = length(lineString(linePart1), distanceOptions);
                    const d2 = length(lineString(linePart2), distanceOptions);

                    if (d1 < 50 && d2 < 50) {
                        newOverlappingPaths.push({
                            route1: {
                                from: op1.route1.from,
                                to: op2.route1.to,
                            },
                            route2: {
                                from: op1.route2.from,
                                to: op2.route2.to,
                            }
                        })
                        continue opLoop;
                    }
                }

                newOverlappingPaths.push(op1);
            }

            console.log(overlappingPaths, newOverlappingPaths);
            overlappingPaths = newOverlappingPaths;
        }

        const timeEnd = performance.now();

        return {
            overlappingPaths: [],
            calculationTime: timeEnd - timeBegin,
        };
    }

    public linePart(path, from: number, fromPart: number, to: number, toPart: number): Position[] {
        if (from === to && fromPart === toPart) {
            return [];
        }

        if (from > to || (from === to && fromPart > toPart)) {
            let tmp = from;
            from = to;
            to = tmp;

            tmp = fromPart;
            fromPart = toPart;
            toPart = tmp;
        }

        const pointIds = [];
        for (let i = from; i <= to + 1; ++i) {
            pointIds.push(i);
        }

        const points = pointIds.map(id => path[id]);
        const line = lineString(points);
        const lineLength = length(line);

        const firstLine = lineString(pointIds.slice(0, 2).map(id => path[id]));
        const firstLineLength = length(firstLine);
        const partFirstLine = fromPart * firstLineLength;

        const lastLine = lineString(pointIds.slice(-2).map(id => path[id]));
        const lastLineLength = length(lastLine);
        const partLastLine = (1 - toPart) * lastLineLength;

        const sliceFrom = partFirstLine;
        const sliceTo = lineLength - partLastLine;

        return lineSliceAlong(line, sliceFrom, sliceTo).geometry.coordinates;
    }
}
