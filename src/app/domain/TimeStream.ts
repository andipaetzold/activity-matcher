export interface TimeStream {
    original_size: number;
    resolution: 'low' | 'medium' | 'high';
    series_type: 'distance' | 'time';
    data: number[];
}