import { Injectable } from '@angular/core';
import { Position } from 'geojson';
import { lineString, Units } from '@turf/helpers';
import nearestPointOnLine from '@turf/nearest-point-on-line';
import distance from '@turf/distance';
import length from '@turf/length';

export interface PathStatus {
    pathIndex1: number;
}

const distanceOptions = {
    units: <Units>'meters',
};

export interface OverlappingPath {
    route1: ComparePoint[],
    route2: ComparePoint[],
};

export interface ComparePoint {
    point: number; part: number;
}

@Injectable()
export class LiveCompareService {
    private maxDistance: number;
    private path1: Position[] = [];

    private pathIndex1: number = 0;

    private path2: Position[] = [];
    private overlappingPath: OverlappingPath = null;

    public reset(path: Position[], maxDistance: number): void {
        this.maxDistance = maxDistance;
        this.path1 = path;
        this.path2 = [];
        this.resetOverlappingPath();

        this.pathIndex1 = 0;
    }

    private resetOverlappingPath(): void {
        this.overlappingPath = {
            route1: [],
            route2: [],
        };
    }

    public addPoint(position: Position): OverlappingPath {
        this.path2.push(position);

        let result: OverlappingPath;

        if (this.path2.length >= 2) {
            const back1 = () => this.path1[this.pathIndex1];
            const front1 = () => this.path1[this.pathIndex1 + 1];
            const line1 = () => lineString([back1(), front1()]);

            const pathIndex2 = () => this.path2.length - 2;
            const back2 = () => this.path2[pathIndex2()];
            const front2 = () => this.path2[pathIndex2() + 1];
            const line2 = () => lineString([back2(), front2()]);

            if (this.overlappingPath.route1.length <= 1) {
                this.pathIndex1 = 0;
            }

            outerLoop: for (; this.pathIndex1 < this.path1.length - 1; ++this.pathIndex1) {
                let pointOnLine1: Position;
                let pointOnLine2: Position;
                let distanceToLine1: number;
                let distanceToLine2: number;

                if (this.overlappingPath.route1.length == 0) {
                    pointOnLine1 = nearestPointOnLine(line1(), back2());
                    pointOnLine2 = nearestPointOnLine(line2(), back1());

                    distanceToLine1 = distance(back2(), pointOnLine1, distanceOptions);
                    distanceToLine2 = distance(back1(), pointOnLine2, distanceOptions);

                    if (Math.min(distanceToLine1, distanceToLine2) > this.maxDistance) {
                        continue outerLoop;
                    }

                    if (distanceToLine1 < distanceToLine2) {
                        this.overlappingPath.route1.push({
                            point: this.pathIndex1,
                            part: distance(back1(), pointOnLine1, distanceOptions) / length(line1(), distanceOptions)
                        });
                        this.overlappingPath.route2.push({ point: pathIndex2(), part: 0 });
                    } else {
                        this.overlappingPath.route1.push({ point: this.pathIndex1, part: 0 });
                        this.overlappingPath.route2.push({
                            point: pathIndex2(),
                            part: distance(back2(), pointOnLine2, distanceOptions) / length(line2(), distanceOptions)
                        });
                    }
                }

                innerLoop: while (this.pathIndex1 < this.path1.length - 1) {
                    pointOnLine1 = nearestPointOnLine(line1(), front2());
                    pointOnLine2 = nearestPointOnLine(line2(), front1());

                    distanceToLine1 = distance(front2(), pointOnLine1, distanceOptions);
                    distanceToLine2 = distance(front1(), pointOnLine2, distanceOptions);

                    if (Math.min(distanceToLine1, distanceToLine2) > this.maxDistance) {
                        if (this.overlappingPath.route1.length >= 2) {
                            break innerLoop;
                        } else {
                            this.resetOverlappingPath();
                            continue outerLoop;
                        }
                    }

                    if (distanceToLine1 < distanceToLine2) {
                        this.overlappingPath.route1.push({
                            point: this.pathIndex1,
                            part: distance(back1(), pointOnLine1, distanceOptions) / length(line1(), distanceOptions)
                        });
                        this.overlappingPath.route2.push({ point: pathIndex2(), part: 1 });

                        break outerLoop;
                    } else {
                        this.overlappingPath.route1.push({ point: this.pathIndex1, part: 1 });
                        this.overlappingPath.route2.push({
                            point: pathIndex2(),
                            part: distance(back2(), pointOnLine2, distanceOptions) / length(line2(), distanceOptions)
                        });

                        ++this.pathIndex1;
                    }
                }

                if (this.overlappingPath.route1.length >= 2) {
                    result = this.overlappingPath;
                    this.resetOverlappingPath();
                }
            }
        }

        return result;
    }
}