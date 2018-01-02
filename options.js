export function optionsDrawCirclesAroundPoints() {
    return document.getElementById('options-circles-around-points').checked;
}

export function optionsMaxDistanceForSimilarity() {
    return document.getElementById('options-distance-similarity').value;
}

export function optionsCoordinateQuality() {
    return Number.parseInt(document.getElementById('options-coordinate-quality').value);
}

export function optionsCalculateLaps() {
    return document.getElementById('options-calculate-laps').checked;
}

export function optionsCalculateSimilarActivities() {
    return document.getElementById('options-calculate-similar-activities').checked;
}

export function optionsFitToBounds() {
    return document.getElementById('options-fit-to-bounds').checked;
}
