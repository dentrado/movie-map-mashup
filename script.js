// == API URLS ==
var tileUrl = "http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
//var mqlreadUrl = "https://www.googleapis.com/freebase/v1/mqlread?callback=?";
var mqlreadUrl = "http://api.freebase.com/api/service/mqlread?callback=?";
var imageUrl = "https://usercontent.googleapis.com/freebase/v1/image/";
var wpUrl = "http://en.wikipedia.org/w/api.php?action=parse&format=json&callback=?"; 

// == Config ==
var imageSize = "?maxwidth=150&maxheight=150";
var popupOptions = { maxHeight:400, minWidth:300 };

// == mql keys ==
var geolocation = "/location/location/geolocation";
var title_id = "/imdb/topic/title_id";

var locationQuery = {
    cursor: true,
    query: [{
        "type": "/film/film_location",
        "name": null,
        "id":null,
        "key": {
            "namespace": "/wikipedia/en_id",
            "value":        null,
            "limit":1
        },
        "featured_in_films": [{
            "name": null,
            "/imdb/topic/title_id" : []
        }],
        "/location/location/geolocation": {
            "limit":1,
            "longitude": null,
            "latitude":  null
        },
        "limit":20 // fetch the locations in chunks of 20
    }]
}

// == For debug ==
var locations;
var wikidata;

var map;

function toImdbLink(film) { 
    return "<a href='http://www.imdb.com/title/" + film[title_id][0] + "'>"
               + film.name +
           "</a>";
}

function getSummary(wpId, callback) {
    $.getJSON(wpUrl, {pageid:wpId, prop:"text", },
              function(data) {
                  var wpText = data.parse.text["*"];
                  // use the first paragraph as summary:
                  //callback( $(wpText).filter("p").first() );
                  callback( wpText.match(/<p>.*<\/p>/)[0] );
              });
}

function showPopup(marker, filmLocation) {
    var wpId = filmLocation.key.value;
    getSummary(wpId, function(summary) {
        console.log("creating popup content");
        var header = "<h2>" + filmLocation.name + "</h2>"; 
        var image = "<img src='" + imageUrl + filmLocation.id + imageSize + "'></img>";
        var filmList = 
            "<h3>Movies filmed here:</h3>" +
            "<ul><li>" + 
            filmLocation.featured_in_films.map(toImdbLink).join("</li><li>");
            + "</li></ul>";

        marker.bindPopup("<div class='summary'>" 
                         + header + image + summary + 
                         "</div>"
                         + filmList, 
                         popupOptions)
            .openPopup();
    });
}

function addMarker(filmLocation) {
    var coords = filmLocation[geolocation];
    if(coords.latitude && coords.longitude) { 
        L.circleMarker([coords.latitude, coords.longitude], {radius:5})
            .addTo(map)
            .on("click", function(e) {
                // Don't create the popups until clicking to avoid
                // unnecessary work.
                showPopup(e.target, filmLocation);
            });
    } else {
        console.log(filmLocation.name + " had no coordinates");
    }
}

// See http://wiki.freebase.com/wiki/Timeouts for info on cursors
function getLocations(cursor, callback) {
		locationQuery.cursor = cursor;
    $.getJSON(mqlreadUrl, { query: JSON.stringify(locationQuery) }, 
              function(answer) {
              	  // todo: check status/code
              	  callback(answer.result);
                	if(answer.cursor) 
                    	getLocations(answer.cursor, callback);
              });
}

function init() {
    // Initialize map:
    map = L.map("map").setView([51.505, -0.09,], 3);    
    L.tileLayer(tileUrl, {
        attribution: 'Map data © OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(map);

    getLocations(true, function(locations) { locations.forEach(addMarker); });
}

window.addEventListener('load', init, false);
