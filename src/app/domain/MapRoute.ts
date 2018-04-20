import { Position } from 'geojson';

export interface MapRoute {
    path: Position[];
    color?: string;
    width?: number;
};