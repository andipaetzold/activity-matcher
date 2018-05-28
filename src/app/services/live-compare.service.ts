import { Injectable } from '@angular/core';
import { Position } from 'geojson';
import { lineString } from '@turf/helpers';

export interface PathStatus {
    pathIndex1: number;
}

@Injectable()
export class LiveCompareService {
    private path: Position[] = [];

    private pathStatus: PathStatus[];
    private prev: Position = null;

    public reset(path: Position[]): void {
        this.path = path;
        this.prev = null;

        this.pathStatus = [];
        for (let i = 0; i < path.length - 1; ++i) {
            this.pathStatus[i] = {
                pathIndex1: i,
            };
        }
    }

    public addPoint(position: Position): void {
        if (this.prev !== null) {
            for (let i = 0; i < this.pathStatus.length; ++i) {
                const pathStatus = this.pathStatus[i];

                const line2 = lineString([this.prev, position]);
            }
        }

        this.prev = position;

        console.log(position);
    }

    private addPointWithPathStatus(pathStatus: PathStatus, position: Position) {
        const back1 = () => this.path[pathStatus.pathIndex1];
        const front1 = () => this.path[pathStatus.pathIndex1 + 1];
        const line1 = () => lineString([back1(), front1()]);


        const line2 = () => lineString([this.prev, position]);
    }
}