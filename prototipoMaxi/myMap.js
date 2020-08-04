const tilesProvider = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const coordSalta = [-24.7892, -65.4106]
let direcciones = []

var map = L.map('map').setView(coordSalta, 14)

L.tileLayer(tilesProvider, {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
    maxZoom: 18
    //id: 'mapbox/streets-v11',
    //tileSize: 512,
    //zoomOffset: -1,
    //accessToken: 'your.mapbox.access.token'
}).addTo(map);

let iconMarker = L.icon({
    iconUrl: 'iconos/marker.png',
    iconSize: [110, 70],
    iconArchor: [55, 70]
})

let marker = L.marker(coordSalta).addTo(map)
marker.bindPopup("Deposito").openPopup();

map.doubleClickZoom.disable()
map.on('dblclick', e => {
    let latLng = map.mouseEventToLatLng(e.originalEvent)
    //console.log(latLng)
    L.marker([latLng.lat, latLng.lng], {icon: iconMarker}).addTo(map)
})

var searchControl = L.esri.Geocoding.geosearch().addTo(map);
var avdaSanMartin = ["San Martín, Salta, A4400, Salta, ARG"]
var results = L.layerGroup().addTo(map)

searchControl.on('results', function controlBusq(data){ controlBusqueda(data)})

function controlBusqueda(data){
    //results.clearLayers();
    map.setView(coordSalta, 14);
    console.log(data.text);
    console.log(data);
    console.log(results);
    scrollWheelZoom: false
    for(var i = data.results.length -1; i >= 0; i--){
        map.setView(coordSalta, 14);
        var LatLong = data.results[i].latlng
        
        results.addLayer(L.marker(LatLong, {icon: iconMarker}))
        map.setView(coordSalta, 14);
        //L.marker(LatLong, {icon: iconMarker}).addTo(map)
        console.log(LatLong.lat);
        console.log(LatLong.lng);
    }
}

var url = "Direcciones.xlsx";
var oReq = new XMLHttpRequest();
oReq.open("GET", url, true);
oReq.responseType = "arraybuffer";




function buscarDireccion(Direccion, Ciudad, Provincia, Pais){
    salta = L.latLng(coordSalta[0],coordSalta[1])
    //var direccionSeparada = direccion.split(",")
    //console.log(direccionSeparada)
    resultadoLatLng = null
    return L.esri.Geocoding.geocode().address(Direccion).city(Ciudad).region(Provincia).run(function (err, resultados, response) {
    //resultados = L.esri.Geocoding.geocode().text(Direccion).nearby(salta, 500).run(function (err, resultados, response) {
        if (err) {
          console.log(err);
          return;
        }
        console.log(resultados)
        console.log("resultados: "+resultados.results[0].text)
        console.log(resultados.results[0].latlng)
        //console.log(resultados)
        coordenadas = [resultados.results[0].latlng.lat, resultados.results[0].latlng.lng]
        L.marker(coordenadas).addTo(map)
    })
    //console.log(resultados)
}
