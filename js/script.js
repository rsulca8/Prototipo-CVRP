var map 
var coords 
var puntos = []
var marcas = []
var segmentos = []  
var distancias = []
var matrizDistancias = []
var matrizId = 0
var capas = []

var pin = L.icon({
    iconUrl: 'pin.png',
    iconSize: [45, 45],
    iconArchor: [45,30]
});

const coordSalta = [-24.7892, -65.4106]
coords = null;
var router = new L.Routing.osrmv1({serviceUrl: 'http://localhost:5000/viaroute'})
map = L.map('map').setView(coordSalta, 14);
L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors', maxZoom: 18 }).addTo(map);

cantidadClientes = 1


function crearMarca(ev){
    coord= ev.latlng
    lat = coord.lat
    lng = coord.lng
    marca = L.marker([lat, lng], {icon: pin}).addTo(map);
    marcas.push(marca)
    puntos.push({nodo: cantidadClientes,coordenadas:coord})
    agregarClienteTabla(cantidadClientes,"Latitud: "+Math.round(lat)+" Longitud: "+Math.round(lng)+0,1)
    cantidadClientes++ 
}
map.addEventListener("click",crearMarca)  




function mostraRutas(){
    
    for (let i=0; i<puntos.length; i++){
        for(let j=i+1; j<puntos.length; j++){
 
            segmento = [puntos[i].coordenadas,puntos[j].coordenadas]
            resultado = L.Routing.control({
                waypoints: segmento,
                lineOptions: {
                    styles:[
                        {color: RGB2HTML(random(256),random(256),random(256)), opacity: 0.9, weight: 5},
                        ]
                    },
                plan: L.Routing.plan(segmento, {
                        createMarker: function(i, wp) {
                            return L.marker(wp.latLng, {
                                draggable: true,
                                icon: L.icon.glyph({ glyph: String.fromCharCode(65 + i) })
                            });
                        }
                })
            })
            resultado.on('routesfound', function(e) {
                var routes = e.routes;
                var summary = routes[0].summary;
                distancias.push({i:puntos[i],j:puntos[j],distancia: summary.totalDistance})
                console.log('Distancia ' + summary.totalDistance / 1000 + ' km y el tiempo total es ' + Math.round(summary.totalTime % 3600 / 60) + ' minutos');
            });
            //capa = L.polyline(segmento, {color: RGB2HTML(random(256),random(256),random(256))});
            capa = L.layerGroup(segmento[0].coordenadas,segmento[1].coordenadas)
            capa.addLayer(resultado)
            capas.push(capa)
            console.log(capa)
            console.log(resultado)
            segmentos.push(resultado)
            console.log(distancias)
        }
    }

    for (let i=0; i<segmentos.length; i++){
        segmentos[i].addTo(map)
    }

    for (let i=0; i<marcas.length; i++){
        marcas[i].remove()
    }
    marcas = []
    ocultarInstrucciones()
    //map.removeEventListener("click",crearMarca) 
    // for (let i=0; i<segmentos.length; i++){
    //     segmentos[i].addTo(map)
    // }


    
}

function mostrarMatrizDistancias(){
    agregarPuntosFaltantes()
    ordenarPares()
    console.log(distancias)
    var actual = 0
    for(let i=0; i<puntos.length; i++){
        fila = []
        for(let j=0; j<puntos.length;j++){
            if(i==j){
                fila.push(Number.POSITIVE_INFINITY)
            }
            else{
                fila.push(distancias[actual].distancia)
                actual++;
            }
        }   
        matrizDistancias.push(fila)
    }
    console.table(matrizDistancias)
}

function ordenarPares(){
    distancias.sort((a,b)=>{if(a.i.nodo>b.i.nodo){return 1}else{return -1}}) //Ordena por el x
    distancias.sort((a,b)=>{if(a.i.nodo==b.i.nodo){if(a.j.nodo>b.j.nodo){return 1}else{return -1}}else{return -1}}) //Ordena por el y
}

function agregarPuntosFaltantes(){
    N = distancias.length
    for(let i=0; i<N;i++){
        distancias.push({i:distancias[i].j,j:distancias[i].i,distancia:distancias[i].distancia})
    }
}


function ocultarInstrucciones(){
    document.querySelector(".leaflet-right").style = "display: none";
}




function RGB2HTML(red, green, blue)
{
    var decColor =0x1000000+ blue + 0x100 * green + 0x10000 *red ;
    return '#'+decColor.toString(16).substr(1); 
}

function random(max) {
    return Math.floor(Math.random() * max);
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

async function enviarMatrizDistancias(){
    nroVehiculos = document.querySelector("#inputNroVehiculos").value
    jsonRutas = await fetch("http://localhost:5000/post", {
        body: "data="+JSON.stringify(matrizDistancias)+"&nroVehiculos="+nroVehiculos,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        method: "POST"
      })
    rutas = await jsonRutas.json()
    console.log(rutas)
}

//Agrega un cliente a la tabla de clientes
function agregarClienteTabla(cli,co,d){
    fila = document.createElement("tr")
    cliente = document.createElement("td")
    coord = document.createElement("td")
    dem = document.createElement("input")
    dem.type = "number"
    dem.value= d
    dem.min = 0
    
    cliente.innerText = cli
    coord.innerText = co
    
    bodyTabla = document.querySelector("#tBodyTablaClientes")
    fila.appendChild(cliente)
    fila.appendChild(coord)
    fila.appendChild(dem)
    bodyTabla.appendChild(fila)
}


document.querySelector("#botonCargarPuntos").addEventListener('click',mostraRutas)
document.querySelector("#botonMostrarMatrizDistancia").addEventListener('click',mostrarMatrizDistancias)
document.querySelector("#botonEnviarMatriz").addEventListener('click',enviarMatrizDistancias)   