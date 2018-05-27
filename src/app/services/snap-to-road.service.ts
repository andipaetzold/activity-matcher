import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'environments/environment';
import { Position } from 'geojson';
import { JSONP_ERR_WRONG_RESPONSE_TYPE } from '@angular/common/http/src/jsonp';

@Injectable()
export class SnapToRoadService {
    public constructor(
        private readonly httpClient: HttpClient,
    ) {
    }

    public async snapGoogleMaps(route: Position[], interpolate: boolean = false): Promise<Position[]> {
        const snappedRoute: Position[] = [];

        for (let startIndex = 0; startIndex <= route.length - 1; startIndex += 100) {
            const path = route.slice(startIndex, startIndex + 100).map(p => `${p[1]},${p[0]}`).join('|');
            const response: any = await this.httpClient.get(`https://roads.googleapis.com/v1/snapToRoads?path=${path}&interpolate=${String(interpolate)}&key=${environment.googleMaps.key}`).toPromise();

            if (response.warningMessage) {
                return [];
            }

            snappedRoute.push.apply(
                snappedRoute,
                response.snappedPoints.map((p: any) => [p.location.longitude, p.location.latitude])
            );
        }

        return snappedRoute;
    }

    public async snapMapbox(route: Position[], simplified: boolean = true): Promise<Position[]> {
        const path = route.slice(0, 100).map(p => p.join(',')).join(';');
        const response: any = await this.httpClient.get(`https://api.mapbox.com/matching/v5/mapbox/walking/${path}?access_token=${environment.mapbox.accessToken}&overview=${simplified ? 'simplified' : 'full'}`).toPromise();

        return response.tracepoints
            .filter(p => !!p)
            .map(p => p.location);
    }
}