import { LatLng } from './LatLng';

export interface LatLngStream {
    original_size: number;
    resolution: 'low' | 'medium' | 'high';
    series_type: 'distance' | 'time';
    data: LatLng[];
}