import { getParameterByName } from "./util";

const AUTH_URL = `https://www.strava.com/oauth/token`;
const CLIENT_ID = '21035';
const CLIENT_SECRET = 'e0006d0074d5628466f4aca55b6e83ba4fe4b9df';

export function getAuthCode() {
    return getParameterByName('code');
}

export async function fetchToken() {
    const formData = new FormData();
    formData.append('client_id', CLIENT_ID);
    formData.append('client_secret', CLIENT_SECRET);
    formData.append('code', getAuthCode());

    return fetch(AUTH_URL, { method: 'POST', body: formData })
        .then(response => response.json());
}