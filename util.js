export function getParameterByName(name) {
    const url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    let regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
    results = regex.exec(url);

    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

export function randomID() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  
    for (var i = 0; i < 5; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
  
    return text;
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