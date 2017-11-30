export function getParameterByName(name) {
    const url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    let regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
    results = regex.exec(url);

    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

export function splitLine(coordinates, distance) {
    const lineString = turf.lineString(coordinates);
    const chunkedLine = turf.lineChunk(lineString, distance);

    const newCoordinates = [];
    for (let feature of chunkedLine.features) {
        const coords = turf.getCoords(feature);

        if (newCoordinates.length == 0) {
            newCoordinates.push(...coords);
        } else {
            newCoordinates.push(...coords.slice(1));
        }
    }

    return newCoordinates;
}

export function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}