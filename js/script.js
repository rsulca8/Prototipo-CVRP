var map 
var coords 
var puntos = []
var segmentos = []  
var distancias = []
var matrizDistancias = []
var pin = L.icon({
    iconUrl: 'pin.png',
    iconSize: [45, 45],
    iconArchor: [45,30]
});

const coordSalta = [-24.7892, -65.4106]
coords = null;

map = L.map('map').setView(coordSalta, 14);

cantidadClientes = 1

map.addEventListener("click",(ev)=>{
    coord= ev.latlng
    lat = coord.lat
    lng = coord.lng
    L.marker([lat, lng], {icon: pin}).addTo(map);
    puntos.push({nodo: cantidadClientes,coordenadas:coord})
    cantidadClientes++  


})  




function mostraRutas(){
    
    for (let i=0; i<puntos.length; i++){
        for(let j=i+1; j<puntos.length; j++){
            segmento = [puntos[i].coordenadas,puntos[j].coordenadas]
            resultado = L.Routing.control({
                waypoints: segmento,
            })

            resultado.on('routesfound', function(e) {
                var routes = e.routes;
                var summary = routes[0].summary;
                distancias.push({i:puntos[i],j:puntos[j],distancia: summary.totalDistance})
                console.log('Distancia' + summary.totalDistance / 1000 + ' km y el tiempo total es ' + Math.round(summary.totalTime % 3600 / 60) + ' minutos');
             });
             
            console.log(resultado)
            segmentos.push(resultado)
            console.log(distancias)
        }
    }

    for (let i=0; i<segmentos.length; i++){
        segmentos[i].addTo(map)
    }
}

function mostrarMatrizDistancias(){
    for(let i=0; i<puntos.length; i++){
        fila = []
        for(let j=0; j<puntos.length;j++){
            if(i<j){
                fila.push(distancias[j].distancia)
            }
            if(i==j){
                fila.push(Number.POSITIVE_INFINITY)
            }
            else{
                fila.push(distancias[i].distancia)
            }
        }   
        matrizDistancias.push(fila)
    }
    console.log(matrizDistancias)
}

function ocultarInstrucciones(){
 
 
    console.log(document.querySelector(".leaflet-control-container"))
    console.log(document.querySelector(".leaflet-routing-container-hide"))
}


L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors', maxZoom: 18 }).addTo(map);



function RGB2HTML(red, green, blue)
{
    var decColor =0x1000000+ blue + 0x100 * green + 0x10000 *red ;
    return '#'+decColor.toString(16).substr(1); 
}

function random(min, max) {
    return Math.random() * (max - min) + min;
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

document.querySelector("#botonCargarPuntos").addEventListener('click',mostraRutas)
document.querySelector("#botonMostrarMatrizDistancia").addEventListener('click',mostrarMatrizDistancias)