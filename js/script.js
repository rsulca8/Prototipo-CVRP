var map 
var coords 
var puntos = []


var pin = L.icon({
    iconUrl: 'pin.png',
    iconSize: [45, 45],
    iconArchor: [45,30]
});

function init2() {
    coords = null;
    if ( navigator.geolocation ) {
        navigator.geolocation.watchPosition(
            function ( Position ) {
                coords = Position.coords;
                console.log(coords);
                map = L.map('map').setView([Position.coords.latitude, Position.coords.longitude ], 14);

                map.addEventListener("click",(ev)=>{
                    coordenadas = ev.latlng
                    lat = coordenadas.lat
                    lng = coordenadas.lng
                    L.marker([lat, lng], {icon: pin}).addTo(map);
                    puntos.push(coordenadas)
                    L.Routing.control({
                        waypoints: puntos
                      }).addTo(map);
                    
                    
                    console.log(puntos)
                })
                console.log("map" + map);
                L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors', maxZoom: 18 }).addTo(map);
                noLoc = false;
                },
                function (err) {
                    // there was an error getting the location
                    console.log(err.message);
                },
                {enableHighAccuracy:false, maximumAge:100000, timeout:100000}
            );
    }
}


function puntosToLatLng(P,L){
    nuevo = []
    for (let i; i<P.length; i++){
        nuevo.push(L.latLng(P[i].lat,P[i].lng))
    }
    return nuevo
}


function cargarPuntos() {

    if (window.coords != null) {
        $.ajax({'url' :'searchNear.php',
                'data' : {'q': q, 'lat':window.coords.latitude,
                'lon':coords.longitude}}).done(function(msg) {
                        $('#results').html('<pre> ' + msg + '</pre>');
        });
    }
}
