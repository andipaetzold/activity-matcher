import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable()
export class StravaAuthService {
    private _currentCode: BehaviorSubject<string> = new BehaviorSubject(undefined);
    private _currentToken: BehaviorSubject<string> = new BehaviorSubject(undefined);

    public constructor(
        private readonly httpClient: HttpClient
    ) {
        this._currentCode.next(this.code);
        this.refreshToken();
    }

    public set code(c: string) {
        window.localStorage.setItem('code', c);
        this._currentCode.next(c);
        this.refreshToken();
    }

    public get code(): string {
        return window.localStorage.getItem('code');
    }

    public get currentCode(): Observable<string> {
        return this._currentCode.asObservable();
    }

    public get currentToken(): Observable<string> {
        return this._currentToken.asObservable();
    }

    public get token(): string {
        return this._currentToken.value;
    }

    public async refreshToken(): Promise<void> {
        const formData = new FormData();
        formData.append('client_id', environment.strava.clientId);
        formData.append('client_secret', environment.strava.clientSecret);
        formData.append('code', this.code);

        const response: any = await this.httpClient.post('https://www.strava.com/oauth/token', formData).toPromise();

        if (response.access_token) {
            this._currentToken.next(response.access_token);
        } else {
            this._currentToken.next(undefined);
        }
    }
}