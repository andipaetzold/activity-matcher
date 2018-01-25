export function optionsDrawCirclesAroundPoints() {
    return (<HTMLInputElement>document.getElementById('options-circles-around-points')).checked;
}

export function optionsMaxDistanceForSimilarity(): number {
    return Number.parseInt((<HTMLInputElement>document.getElementById('options-distance-similarity')).value);
}

export function optionsCoordinateQuality() {
    return Number.parseInt((<HTMLInputElement>document.getElementById('options-coordinate-quality')).value);
}

export function optionsCalculateLaps() {
    return (<HTMLInputElement>document.getElementById('options-calculate-laps')).checked;
}

export function optionsCalculateSimilarActivities() {
    return (<HTMLInputElement>document.getElementById('options-calculate-similar-activities')).checked;
}

export function optionsFitToBounds() {
    return (<HTMLInputElement>document.getElementById('options-fit-to-bounds')).checked;
}
